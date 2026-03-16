import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'campus-vibe-secret-key';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('CRITICAL: Supabase environment variables are missing!');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper to handle Supabase errors
const handleSupabaseError = (res: any, error: any) => {
  console.error('Supabase Error:', error);
  return res.status(500).json({ error: error.message || 'Internal Server Error' });
};

// Seed Admin if not exists
async function seedAdmin() {
  const adminEmails = ['admin@college.edu', '124jyotiransh7020@sjcem.edu.in', 'dummyadmin@sjcem.edu.in'];
  for (const email of adminEmails) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking admin existence:', error);
      continue;
    }

    if (!user) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      let name = 'System Admin';
      if (email === '124jyotiransh7020@sjcem.edu.in') name = 'Jyotiransh Admin';
      if (email === 'dummyadmin@sjcem.edu.in') name = 'Dummy Admin';
      
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          name,
          email,
          password: hashedPassword,
          role: 'ADMIN'
        });
      
      if (insertError) console.error('Error seeding admin:', insertError);
      else console.log(`Seeded admin: ${email}`);
    } else if (user.role !== 'ADMIN') {
      await supabase
        .from('users')
        .update({ role: 'ADMIN' })
        .eq('email', email);
      console.log(`Updated user to ADMIN: ${email}`);
    }
  }
}

// Seed Demo Events if empty
async function seedDemoEvents() {
  const { count, error: countError } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error checking event count:', countError);
    return;
  }

  if (count === 0) {
    const { data: admin, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'ADMIN')
      .limit(1)
      .single();
    
    if (adminError || !admin) {
      console.error('Could not find admin for seeding events');
      return;
    }
    
    const demoEvents = [
      {
        title: 'Megaleio 2026',
        description: 'The annual technical extravaganza of CampusVibe. Featuring a massive prize pool of ₹3,00,000 across multiple competitions.',
        rules: '1. Open to all engineering students. 2. Registration is mandatory for all events. 3. Participants must carry their college ID cards.',
        date: '2026-03-28',
        time: '09:00 AM',
        venue: 'CampusVibe Campus',
        category: 'Technical',
        poster_url: 'https://images.unsplash.com/photo-1540575861501-7ad05823c23d?auto=format&fit=crop&q=80&w=800',
        organizer_id: admin.id,
        status: 'APPROVED'
      }
    ];

    for (const e of demoEvents) {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert(e)
        .select()
        .single();
      
      if (eventError) {
        console.error('Error seeding event:', eventError);
        continue;
      }

      const { error: slotError } = await supabase
        .from('event_slots')
        .insert({
          event_id: event.id,
          start_time: '09:00 AM',
          end_time: '05:00 PM',
          total_seats: 1000,
          available_seats: 1000
        });
      
      if (slotError) console.error('Error seeding slot:', slotError);
    }
    console.log('Demo events seeded successfully');
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Run seeding
  await seedAdmin();
  await seedDemoEvents();

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role, clubName } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const { data, error } = await supabase
        .from('users')
        .insert({ name, email, password: hashedPassword, role, club_name: clubName })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Email already exists' });
        return handleSupabaseError(res, error);
      }
      res.json({ id: data.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
  });

  // --- Event Routes ---
  app.get('/api/events', async (req, res) => {
    const { status, category } = req.query;
    let query = supabase.from('events').select('*');
    
    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    
    const { data: events, error } = await query;
    if (error) return handleSupabaseError(res, error);
    res.json(events);
  });

  app.get('/api/events/:id', async (req, res) => {
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (eventError) return handleSupabaseError(res, eventError);
    
    const { data: slots, error: slotsError } = await supabase
      .from('event_slots')
      .select('*')
      .eq('event_id', req.params.id);
    
    if (slotsError) return handleSupabaseError(res, slotsError);
    res.json({ ...event, slots });
  });

  app.post('/api/events', authenticate, async (req: any, res) => {
    if (req.user.role === 'STUDENT') return res.status(403).json({ error: 'Forbidden' });
    const { title, description, rules, date, time, venue, posterUrl, category, parentEventId, slots } = req.body;
    
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title, description, rules, date, time, venue, 
        poster_url: posterUrl, category, 
        organizer_id: req.user.id, 
        parent_event_id: parentEventId, 
        status: req.user.role === 'ADMIN' ? 'APPROVED' : 'PENDING'
      })
      .select()
      .single();
    
    if (eventError) return handleSupabaseError(res, eventError);

    if (slots && slots.length > 0) {
      const slotsToInsert = slots.map((s: any) => ({
        event_id: event.id,
        start_time: s.startTime,
        end_time: s.endTime,
        total_seats: s.totalSeats,
        available_seats: s.totalSeats
      }));
      const { error: slotsError } = await supabase.from('event_slots').insert(slotsToInsert);
      if (slotsError) return handleSupabaseError(res, slotsError);
    }

    res.json({ id: event.id });
  });

  app.patch('/api/events/:id/status', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { status } = req.body;
    const { error } = await supabase
      .from('events')
      .update({ status })
      .eq('id', req.params.id);
    
    if (error) return handleSupabaseError(res, error);
    res.json({ success: true });
  });

  app.delete('/api/events/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { error } = await supabase.from('events').delete().eq('id', req.params.id);
    if (error) return handleSupabaseError(res, error);
    res.json({ success: true });
  });

  // --- Booking Routes ---
  app.post('/api/bookings', authenticate, async (req: any, res) => {
    const { slotId } = req.body;
    
    // Use a transaction-like approach (Supabase doesn't have cross-table transactions in the same way, but we can use RPC or careful sequencing)
    // For simplicity, we'll do sequential checks. For production, a Postgres Function (RPC) is better.
    
    const { data: slot, error: slotError } = await supabase
      .from('event_slots')
      .select('*')
      .eq('id', slotId)
      .single();
    
    if (slotError || !slot) return res.status(404).json({ error: 'Slot not found' });
    if (slot.available_seats <= 0) return res.status(400).json({ error: 'No seats available' });
    
    const { data: existing } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('slot_id', slotId)
      .single();
    
    if (existing) return res.status(400).json({ error: 'Already booked' });

    // Decrement seats and insert booking
    const { error: updateError } = await supabase
      .from('event_slots')
      .update({ available_seats: slot.available_seats - 1 })
      .eq('id', slotId);
    
    if (updateError) return handleSupabaseError(res, updateError);

    const { error: insertError } = await supabase
      .from('bookings')
      .insert({ user_id: req.user.id, slot_id: slotId });
    
    if (insertError) {
      // Rollback seat decrement if booking fails
      await supabase.from('event_slots').update({ available_seats: slot.available_seats }).eq('id', slotId);
      return handleSupabaseError(res, insertError);
    }

    res.json({ success: true });
  });

  app.get('/api/my-bookings', authenticate, async (req: any, res) => {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        event_slots (
          start_time,
          end_time,
          events (
            title,
            date,
            venue
          )
        )
      `)
      .eq('user_id', req.user.id)
      .order('booking_date', { ascending: false });
    
    if (error) return handleSupabaseError(res, error);

    // Flatten the response to match the frontend expectation
    const flattened = bookings.map((b: any) => ({
      ...b,
      start_time: b.event_slots.start_time,
      end_time: b.event_slots.end_time,
      event_title: b.event_slots.events.title,
      event_date: b.event_slots.events.date,
      venue: b.event_slots.events.venue
    }));

    res.json(flattened);
  });

  app.post('/api/bookings/:id/cancel', authenticate, async (req: any, res) => {
    try {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          event_slots (
            id,
            start_time,
            events (
              title,
              date
            )
          )
        `)
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();

      if (bookingError || !booking) return res.status(404).json({ error: 'Booking not found' });
      if (booking.status === 'CANCELLED') return res.status(400).json({ error: 'Booking is already cancelled' });

      // Time check logic (similar to SQLite version)
      const eventDate = booking.event_slots.events.date;
      const startTime = booking.event_slots.start_time;
      
      const parts = startTime.split(' ');
      const timePart = parts[0];
      const modifier = parts[1];
      let [hoursStr, minutesStr] = timePart.split(':');
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      
      const eventDateTime = new Date(`${eventDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
      const now = new Date();
      const diffInHours = (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return res.status(400).json({ error: 'Cancellations must be made at least 24 hours before the event starts.' });
      }

      // Update status and increment seats
      await supabase.from('bookings').update({ status: 'CANCELLED' }).eq('id', req.params.id);
      
      const { data: slot } = await supabase.from('event_slots').select('available_seats').eq('id', booking.slot_id).single();
      if (slot) {
        await supabase.from('event_slots').update({ available_seats: slot.available_seats + 1 }).eq('id', booking.slot_id);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Admin Routes ---
  app.get('/api/admin/bookings', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        *,
        users (name, email),
        event_slots (
          start_time,
          end_time,
          events (
            title,
            date,
            venue
          )
        )
      `)
      .order('booking_date', { ascending: false });
    
    if (error) return handleSupabaseError(res, error);

    const flattened = bookings.map((b: any) => ({
      ...b,
      user_name: b.users.name,
      user_email: b.users.email,
      event_title: b.event_slots.events.title,
      event_date: b.event_slots.events.date,
      venue: b.event_slots.events.venue,
      start_time: b.event_slots.start_time,
      end_time: b.event_slots.end_time
    }));

    res.json(flattened);
  });

  app.get('/api/admin/users', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { data: users, error } = await supabase.from('users').select('id, name, email, role, club_name');
    if (error) return handleSupabaseError(res, error);
    res.json(users);
  });

  app.patch('/api/admin/users/:id/role', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { role } = req.body;
    const { error } = await supabase.from('users').update({ role }).eq('id', req.params.id);
    if (error) return handleSupabaseError(res, error);
    res.json({ success: true });
  });

  app.get('/api/admin/logs', authenticate, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    
    // In Supabase/Postgres, we can't easily do the same subquery concatenation in one line as SQLite
    // We'll fetch separately and combine
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        booking_date,
        event_slots (
          events (title)
        )
      `)
      .order('booking_date', { ascending: false })
      .limit(20);
    
    const { data: users } = await supabase
      .from('users')
      .select('name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const bookingLogs = (bookings || []).map((b: any) => ({
      timestamp: b.booking_date,
      type: 'BOOKING',
      message: `New booking for ${b.event_slots?.events?.title || 'Unknown Event'}`
    }));

    const userLogs = (users || []).map((u: any) => ({
      timestamp: u.created_at,
      type: 'USER',
      message: `${u.name} joined as ${u.role}`
    }));

    const logs = [...bookingLogs, ...userLogs].sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json(logs);
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => res.sendFile(path.resolve('dist/index.html')));
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
  });
}

startServer();
