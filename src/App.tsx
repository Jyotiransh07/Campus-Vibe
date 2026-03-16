import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  MapPin, 
  Search, 
  Filter, 
  Plus, 
  LogOut, 
  User as UserIcon,
  ChevronRight,
  LayoutDashboard,
  Bell,
  Settings,
  Clock,
  Ticket,
  Users,
  X,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { Event, EventSlot } from './types';
import { SlotBooking } from './components/SlotBooking';
import axios from 'axios';

const App: React.FC = () => {
  const { user, token, login, logout, isAuthenticated } = useAuth();
  const [view, setView] = useState<'home' | 'login' | 'register' | 'dashboard' | 'event-detail' | 'admin' | 'create-event' | 'info'>('home');
  const [infoPage, setInfoPage] = useState<{ title: string, content: React.ReactNode } | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<(Event & { slots: EventSlot[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', role: 'STUDENT' as any, clubName: '' });
  
  const resetAuthForm = () => setAuthForm({ name: '', email: '', password: '', role: 'STUDENT' as any, clubName: '' });

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const showInfo = (title: string, content: React.ReactNode) => {
    setInfoPage({ title, content });
    setView('info');
    window.scrollTo(0, 0);
  };

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    rules: '',
    date: '',
    time: '',
    venue: '',
    category: 'Technical',
    posterUrl: '',
    parentEventId: null as number | null,
    slots: [{ startTime: '10:00 AM', endTime: '11:00 AM', totalSeats: 50 }]
  });
  const [adminTab, setAdminTab] = useState<'events' | 'bookings' | 'users' | 'terminal'>('events');
  const [adminBookings, setAdminBookings] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [refreshingLogs, setRefreshingLogs] = useState(false);

  useEffect(() => {
    console.log('Current User:', user);
    fetchEvents();
    if (isAuthenticated) {
      fetchMyBookings();
      if (user?.role === 'ADMIN') {
        fetchPendingEvents();
        fetchAdminData();
        fetchAdminLogs();
      }
    }
  }, [isAuthenticated, user?.role]);

  const fetchAdminLogs = async () => {
    setRefreshingLogs(true);
    try {
      const res = await axios.get('/api/admin/logs', { headers: { Authorization: `Bearer ${token}` } });
      setAdminLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      // Small delay for visual feedback
      setTimeout(() => setRefreshingLogs(false), 600);
    }
  };

  const fetchAdminData = async () => {
    try {
      const [bookingsRes, usersRes] = await Promise.all([
        axios.get('/api/admin/bookings', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setAdminBookings(bookingsRes.data);
      setAdminUsers(usersRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await axios.get('/api/events?status=APPROVED');
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const res = await axios.get('/api/my-bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyBookings(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingEvents = async () => {
    try {
      const res = await axios.get('/api/events?status=PENDING', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingEvents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('Attempting login for:', authForm.email.trim());
      const res = await axios.post('/api/auth/login', { 
        email: authForm.email.trim(), 
        password: authForm.password 
      });
      const { token: newToken, user: newUser } = res.data;
      login(newToken, newUser);
      setView('home');
      resetAuthForm();
      console.log('Login successful:', newUser.name);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Login failed. Please check your credentials.';
      showMessage(errorMsg, 'error');
      console.error('Login error details:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('Attempting registration for:', authForm.email.trim());
      await axios.post('/api/auth/register', {
        ...authForm,
        email: authForm.email.trim()
      });
      showMessage('Registration successful! You can now login.');
      setView('login');
      resetAuthForm();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Registration failed. Email might already be in use.';
      showMessage(errorMsg, 'error');
      console.error('Registration error details:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/events', eventForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMessage('Event created successfully! Waiting for admin approval.');
      setView('home');
      fetchEvents();
    } catch (err) {
      showMessage('Failed to create event', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveEvent = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await axios.patch(`/api/events/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPendingEvents();
      fetchEvents();
      fetchAdminLogs();
      showMessage('Event status updated');
    } catch (err) {
      showMessage('Failed to update status', 'error');
    }
  };

  const handleFixImages = async () => {
    try {
      // This is a client-side fix for common image issues
      const res = await axios.get('/api/events');
      const allEvents = res.data;
      const roboSoccer = allEvents.find((e: any) => e.title.toLowerCase().includes('robo soccer'));
      if (roboSoccer) {
        showMessage('Found Robo Soccer. Current URL: ' + roboSoccer.poster_url);
      } else {
        showMessage('Robo Soccer event not found in database.', 'error');
      }
      fetchEvents();
    } catch (err) {
      showMessage('Failed to check images', 'error');
    }
  };

  const handleDeleteEvent = async (id: number) => {
    try {
      await axios.delete(`/api/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEvents();
      fetchPendingEvents();
      fetchAdminLogs();
      showMessage('Event deleted');
      setConfirmingDelete(null);
    } catch (err) {
      showMessage('Failed to delete event', 'error');
    }
  };

  const handleChangeUserRole = async (id: number, role: string) => {
    try {
      await axios.patch(`/api/admin/users/${id}/role`, { role }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAdminData();
      fetchAdminLogs();
    } catch (err) {
      showMessage('Failed to update user role', 'error');
    }
  };

  const handleUpdateBookingStatus = async (id: number, status: string) => {
    try {
      await axios.patch(`/api/admin/bookings/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAdminData();
      showMessage('Booking status updated');
    } catch (err) {
      showMessage('Failed to update booking status', 'error');
    }
  };

  const handleBookSlot = async (slotId: number) => {
    if (!token) {
      setView('login');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/bookings', { slotId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh event details
      if (selectedEvent) {
        const res = await axios.get(`/api/events/${selectedEvent.id}`);
        setSelectedEvent(res.data);
      }
      showMessage('Booking successful!');
      fetchMyBookings();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Booking failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    setLoading(true);
    try {
      await axios.post(`/api/bookings/${bookingId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showMessage('Booking cancelled successfully');
      setConfirmingCancel(null);
      fetchMyBookings();
    } catch (err: any) {
      showMessage(err.response?.data?.error || 'Cancellation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEventDetail = async (id: number) => {
    try {
      const res = await axios.get(`/api/events/${id}`);
      setSelectedEvent(res.data);
      setView('event-detail');
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated && (view === 'dashboard' || view === 'admin')) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-black/5 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">Please Login</h2>
          <p className="text-zinc-500 mb-6">You need to be logged in to access this page.</p>
          <button onClick={() => setView('login')} className="w-full py-3 bg-zinc-900 text-white rounded-xl font-medium">Go to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 font-sans">
      {/* Notifications */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 rotate-3">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight leading-tight">Campus<span className="text-emerald-600">Vibe</span></span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">CampusVibe Hub</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => setView('home')} className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Explore</button>
              {isAuthenticated && (
                <>
                  <button onClick={() => setView('dashboard')} className="text-sm font-medium text-zinc-600 hover:text-zinc-900">My Bookings</button>
                  {user?.role !== 'STUDENT' && (
                    <button onClick={() => setView('create-event')} className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Create Event</button>
                  )}
                  {user?.role === 'ADMIN' && (
                    <button onClick={() => setView('admin')} className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Admin Panel</button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-full">
                    <UserIcon className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-medium">{user?.name}</span>
                  </div>
                  <button onClick={logout} className="p-2 text-zinc-500 hover:text-red-600 transition-colors">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={() => setView('login')} className="text-sm font-medium px-4 py-2 text-zinc-600 hover:text-zinc-900">Login</button>
                  <button onClick={() => setView('register')} className="text-sm font-medium px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors">Sign Up</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'home' && (
          <div className="space-y-16">
            {/* Hero Section with 3D Effect */}
            <section className="perspective-2000">
              <motion.div 
                initial={{ opacity: 0, y: 50, rotateX: 10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white p-8 md:p-24 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] border border-white/5"
              >
                <div className="relative z-10 max-w-3xl">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 backdrop-blur-xl rounded-full border border-emerald-500/20 mb-10"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">CampusVibe • Megaleio 2026</span>
                  </motion.div>
                  
                  <motion.h1 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-6xl md:text-8xl font-black leading-[0.85] mb-10 tracking-tighter"
                  >
                    The Next <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 animate-gradient">Dimension</span> <br />
                    of Campus Life
                  </motion.h1>
                  
                  <p className="text-zinc-400 text-xl mb-12 max-w-xl leading-relaxed font-medium">
                    Discover the most prestigious technical and cultural events at CampusVibe. From high-stakes hackathons to electrifying workshops.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="relative flex-1 group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Find your next challenge..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-16 pr-8 py-6 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-white placeholder:text-zinc-600 backdrop-blur-xl text-lg"
                      />
                    </div>
                    <button className="px-12 py-6 bg-emerald-500 hover:bg-emerald-400 text-zinc-900 font-black rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] text-lg">
                      Explore
                    </button>
                  </div>
                </div>
                
                {/* 3D Floating Objects */}
                <motion.div 
                  animate={{ 
                    y: [0, -30, 0],
                    rotateZ: [0, 10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-20 right-20 hidden lg:block opacity-20"
                >
                  <div className="w-80 h-80 rounded-[4rem] bg-gradient-to-br from-emerald-500 to-cyan-500 blur-3xl" />
                </motion.div>
                
                <motion.div 
                  animate={{ 
                    y: [0, 40, 0],
                    rotateY: [0, 360, 0]
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute -bottom-20 -right-20 hidden lg:block"
                >
                  <div className="w-96 h-96 rounded-full border border-white/5 flex items-center justify-center">
                    <div className="w-64 h-64 rounded-full border border-white/10 flex items-center justify-center">
                      <div className="w-32 h-32 rounded-full border border-white/20" />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </section>

            {/* Event Grid with 3D Cards */}
            <section className="space-y-16">
              {events.filter(e => !e.parent_event_id).map(parentEvent => (
                <div key={parentEvent.id} className="space-y-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-l-4 border-emerald-500 pl-6">
                    <div>
                      <h2 className="text-4xl font-black tracking-tight mb-2">{parentEvent.title}</h2>
                      <p className="text-zinc-500 font-medium">{parentEvent.description}</p>
                    </div>
                    <button 
                      onClick={() => openEventDetail(parentEvent.id)}
                      className="px-6 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-full text-sm font-bold transition-colors"
                    >
                      View Main Event
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 perspective-2000">
                    {events.filter(e => e.parent_event_id === parentEvent.id).map((event) => (
                      <motion.div 
                        key={event.id}
                        whileHover={{ 
                          y: -15,
                          rotateY: 8,
                          rotateX: -5,
                          z: 50,
                          scale: 1.03
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="group bg-white rounded-[2.5rem] border border-zinc-200 overflow-hidden shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] transition-all cursor-pointer"
                        onClick={() => openEventDetail(event.id)}
                      >
                        <div className="aspect-[4/3] bg-zinc-100 relative overflow-hidden">
                          <img 
                            key={event.poster_url}
                            src={event.poster_url || `https://images.unsplash.com/photo-1540575861501-7ad05823c23d?auto=format&fit=crop&q=80&w=800`} 
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1540575861501-7ad05823c23d?auto=format&fit=crop&q=80&w=800";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="absolute top-6 left-6">
                            <span className="px-4 py-2 bg-white/90 backdrop-blur-md text-zinc-900 text-[10px] font-black rounded-full uppercase tracking-[0.2em] shadow-xl">
                              {event.category}
                            </span>
                          </div>
                        </div>
                        <div className="p-8">
                          <h3 className="text-2xl font-black mb-4 group-hover:text-emerald-600 transition-colors leading-tight">{event.title}</h3>
                          <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-3 text-sm font-semibold text-zinc-500">
                              <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-emerald-500" />
                              </div>
                              <span>{event.date} • {event.time}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm font-semibold text-zinc-500">
                              <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-emerald-500" />
                              </div>
                              <span>{event.venue}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
                            <span className="text-sm font-black uppercase tracking-widest text-emerald-600">Book Slot</span>
                            <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Standalone Events */}
              {events.filter(e => !e.parent_event_id && !events.some(sub => sub.parent_event_id === e.id)).length > 0 && (
                <div className="space-y-10">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                      <h2 className="text-4xl font-black tracking-tight mb-2">Other Events</h2>
                      <p className="text-zinc-500 font-medium">More exciting experiences on campus</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 perspective-2000">
                    {events.filter(e => !e.parent_event_id && !events.some(sub => sub.parent_event_id === e.id)).map((event) => (
                      <motion.div 
                        key={event.id}
                        whileHover={{ 
                          y: -15,
                          rotateY: 8,
                          rotateX: -5,
                          z: 50,
                          scale: 1.03
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="group bg-white rounded-[2.5rem] border border-zinc-200 overflow-hidden shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] transition-all cursor-pointer"
                        onClick={() => openEventDetail(event.id)}
                      >
                        <div className="aspect-[4/3] bg-zinc-100 relative overflow-hidden">
                          <img 
                            key={event.poster_url}
                            src={event.poster_url || `https://images.unsplash.com/photo-1540575861501-7ad05823c23d?auto=format&fit=crop&q=80&w=800`} 
                            alt={event.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1540575861501-7ad05823c23d?auto=format&fit=crop&q=80&w=800";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="absolute top-6 left-6">
                            <span className="px-4 py-2 bg-white/90 backdrop-blur-md text-zinc-900 text-[10px] font-black rounded-full uppercase tracking-[0.2em] shadow-xl">
                              {event.category}
                            </span>
                          </div>
                        </div>
                        <div className="p-8">
                          <h3 className="text-2xl font-black mb-4 group-hover:text-emerald-600 transition-colors leading-tight">{event.title}</h3>
                          <div className="space-y-3 mb-8">
                            <div className="flex items-center gap-3 text-sm font-semibold text-zinc-500">
                              <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-emerald-500" />
                              </div>
                              <span>{event.date} • {event.time}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm font-semibold text-zinc-500">
                              <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-emerald-500" />
                              </div>
                              <span>{event.venue}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
                            <span className="text-sm font-black uppercase tracking-widest text-emerald-600">Book Slot</span>
                            <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {view === 'event-detail' && selectedEvent && (
          <div className="max-w-4xl mx-auto space-y-8">
            <button 
              onClick={() => setView('home')}
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              Back to Events
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="aspect-video rounded-3xl overflow-hidden bg-zinc-100 border border-zinc-200">
                  <img 
                    key={selectedEvent.poster_url}
                    src={selectedEvent.poster_url || `https://picsum.photos/seed/${selectedEvent.id}/1200/675`} 
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1540575861501-7ad05823c23d?auto=format&fit=crop&q=80&w=800";
                    }}
                  />
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold">{selectedEvent.title}</h1>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      {selectedEvent.date}
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      {selectedEvent.time}
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      {selectedEvent.venue}
                    </div>
                  </div>
                  <div className="prose prose-zinc max-w-none pt-4">
                    <p className="text-zinc-600 leading-relaxed text-lg mb-8">
                      {selectedEvent.description || "Join us for this exciting event! Learn new skills, network with peers, and be part of the campus community."}
                    </p>
                    
                    {selectedEvent.rules && (
                      <div className="bg-zinc-50 rounded-[2rem] p-8 border border-zinc-200 shadow-inner">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Settings className="w-5 h-5" />
                          </div>
                          Event Rules & Guidelines
                        </h3>
                        <div className="space-y-4">
                          {(() => {
                            const rulesString = selectedEvent.rules || "";
                            // Split by newline or lookahead for numbered list patterns (e.g., " 2. ")
                            let rules = rulesString.split(/\n|(?=\d+[\.\)])/);
                            
                            // If it's just one block of text with periods, split by sentences
                            if (rules.length <= 1 && rulesString.includes('. ')) {
                              rules = rulesString.split(/\.\s+/);
                            }

                            return rules
                              .map(r => r.replace(/^\d+[\.\)]\s*/, '').trim()) // Remove leading numbers
                              .map(r => r.replace(/^[-•*]\s*/, '').trim())    // Remove leading bullets
                              .filter(r => r.length > 2)                      // Filter out very short strings
                              .map(r => r.endsWith('.') ? r : `${r}.`)       // Ensure trailing period
                              .map((rule, i) => (
                                <motion.div 
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  key={i} 
                                  className="flex gap-4 items-start group"
                                >
                                  <div className="w-8 h-8 rounded-full bg-white border-2 border-emerald-100 text-emerald-600 text-xs font-black flex items-center justify-center shrink-0 shadow-sm group-hover:border-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                    {i + 1}
                                  </div>
                                  <p className="text-zinc-600 font-semibold leading-relaxed pt-1">
                                    {rule}
                                  </p>
                                </motion.div>
                              ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <SlotBooking 
                    slots={selectedEvent.slots} 
                    onBook={handleBookSlot} 
                    isBooking={loading} 
                  />
                  
                  <div className="mt-6 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <h4 className="font-bold text-emerald-900 mb-2">Need Help?</h4>
                    <p className="text-sm text-emerald-700">
                      If you encounter any issues with booking or have questions about the event, please contact the club organizer.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'login' && (
          <div className="max-w-md mx-auto py-12">
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
              <p className="text-zinc-500 mb-8">Login to manage your event bookings.</p>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="student@college.edu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Password</label>
                  <input 
                    type="password" 
                    required
                    value={authForm.password}
                    onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10">
                  Login
                </button>
              </form>
              
              <p className="mt-6 text-center text-sm text-zinc-500">
                Don't have an account? <button onClick={() => { setView('register'); resetAuthForm(); }} className="text-emerald-600 font-bold hover:underline">Sign up</button>
              </p>
            </div>
          </div>
        )}

        {view === 'register' && (
          <div className="max-w-md mx-auto py-12">
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <h2 className="text-3xl font-bold mb-2">Create Account</h2>
              <p className="text-zinc-500 mb-8">Join the campus community today.</p>
              
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={authForm.name}
                    onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={authForm.email}
                    onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="student@college.edu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Password</label>
                  <input 
                    type="password" 
                    required
                    value={authForm.password}
                    onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Role</label>
                  <select 
                    value={authForm.role}
                    onChange={(e) => setAuthForm({...authForm, role: e.target.value as any})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="ORGANIZER">Club Organizer</option>
                  </select>
                </div>
                {authForm.role === 'ORGANIZER' && (
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Club Name</label>
                    <input 
                      type="text" 
                      required
                      value={authForm.clubName}
                      onChange={(e) => setAuthForm({...authForm, clubName: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      placeholder="Coding Club"
                    />
                  </div>
                )}
                <button type="submit" className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10">
                  Register
                </button>
              </form>
              
              <p className="mt-6 text-center text-sm text-zinc-500">
                Already have an account? <button onClick={() => { setView('login'); resetAuthForm(); }} className="text-emerald-600 font-bold hover:underline">Login</button>
              </p>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold">My Bookings</h2>
              <button onClick={() => setView('home')} className="text-emerald-600 font-medium">Browse More Events</button>
            </div>

            {myBookings.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-zinc-200 text-center">
                <Calendar className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No bookings yet</h3>
                <p className="text-zinc-500 mb-6">You haven't registered for any events yet.</p>
                <button onClick={() => setView('home')} className="px-6 py-3 bg-zinc-900 text-white rounded-xl font-medium">Explore Events</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myBookings.map((booking) => (
                  <div key={booking.id} className="bg-white p-6 rounded-2xl border border-zinc-200 flex gap-6 items-start">
                    <div className="w-16 h-16 bg-emerald-50 rounded-xl flex flex-col items-center justify-center text-emerald-600">
                      <span className="text-xs font-bold uppercase">{booking.event_date.split('-')[1]}</span>
                      <span className="text-xl font-bold">{booking.event_date.split('-')[2]}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-lg font-bold">{booking.event_title}</h3>
                        {booking.status === 'CONFIRMED' && (
                          <div className="flex gap-2">
                            {confirmingCancel === booking.id ? (
                              <>
                                <button 
                                  onClick={() => handleCancelBooking(booking.id)}
                                  disabled={loading}
                                  className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors"
                                >
                                  Confirm
                                </button>
                                <button 
                                  onClick={() => setConfirmingCancel(null)}
                                  className="text-xs font-bold text-zinc-500 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => setConfirmingCancel(booking.id)}
                                className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 mb-4">{booking.venue}</p>
                      <div className="flex items-center gap-4 text-xs font-medium text-zinc-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{booking.start_time} - {booking.end_time}</span>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full ${
                          booking.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                          {booking.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'create-event' && (
          <div className="max-w-2xl mx-auto py-8">
            <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
              <h2 className="text-3xl font-bold mb-2">Create New Event</h2>
              <p className="text-zinc-500 mb-8">Fill in the details to host your event.</p>
              
              <form onSubmit={handleCreateEvent} className="space-y-6">
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 mb-8">
                  <h4 className="font-black text-emerald-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Organizer Guidelines
                  </h4>
                  <ul className="text-xs text-emerald-700 space-y-2 font-bold">
                    <li>• Use a high-quality image URL for the poster.</li>
                    <li>• Rules should be separated by dots or newlines.</li>
                    <li>• Ensure the date and time are accurate.</li>
                    <li>• All events require admin approval before going live.</li>
                  </ul>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1.5">Event Title</label>
                    <input 
                      type="text" 
                      required
                      value={eventForm.title}
                      onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. Tech Symposium 2026"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1.5">Description</label>
                    <textarea 
                      required
                      rows={4}
                      value={eventForm.description}
                      onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Describe your event..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1.5">Rules & Guidelines</label>
                    <textarea 
                      rows={3}
                      value={eventForm.rules}
                      onChange={(e) => setEventForm({...eventForm, rules: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Enter rules separated by dots..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Parent Event</label>
                    <select 
                      value={eventForm.parentEventId || ''}
                      onChange={(e) => setEventForm({...eventForm, parentEventId: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">None</option>
                      {events.filter(e => !e.parent_event_id).map(e => (
                        <option key={e.id} value={e.id}>{e.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Date</label>
                    <input 
                      type="date" 
                      required
                      value={eventForm.date}
                      onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Main Time</label>
                    <input 
                      type="text" 
                      required
                      value={eventForm.time}
                      onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. 10:00 AM"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Venue</label>
                    <input 
                      type="text" 
                      required
                      value={eventForm.venue}
                      onChange={(e) => setEventForm({...eventForm, venue: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. Auditorium Hall"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Category</label>
                    <select 
                      value={eventForm.category}
                      onChange={(e) => setEventForm({...eventForm, category: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Technical">Technical</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Sports">Sports</option>
                      <option value="Business">Business</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold mb-1.5">Poster Image URL</label>
                    <input 
                      type="text" 
                      value={eventForm.posterUrl}
                      onChange={(e) => setEventForm({...eventForm, posterUrl: e.target.value})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Paste any image URL here (Unsplash, Picsum, etc.)"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="font-bold mb-4">Event Slots</h3>
                  <div className="space-y-4">
                    {eventForm.slots.map((slot, idx) => (
                      <div key={idx} className="flex gap-4 items-end bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-zinc-400 mb-1">Start Time</label>
                          <input 
                            type="text" 
                            value={slot.startTime}
                            onChange={(e) => {
                              const newSlots = [...eventForm.slots];
                              newSlots[idx].startTime = e.target.value;
                              setEventForm({...eventForm, slots: newSlots});
                            }}
                            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-zinc-400 mb-1">End Time</label>
                          <input 
                            type="text" 
                            value={slot.endTime}
                            onChange={(e) => {
                              const newSlots = [...eventForm.slots];
                              newSlots[idx].endTime = e.target.value;
                              setEventForm({...eventForm, slots: newSlots});
                            }}
                            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
                          />
                        </div>
                        <div className="w-24">
                          <label className="block text-xs font-bold text-zinc-400 mb-1">Seats</label>
                          <input 
                            type="number" 
                            value={slot.totalSeats}
                            onChange={(e) => {
                              const newSlots = [...eventForm.slots];
                              newSlots[idx].totalSeats = parseInt(e.target.value);
                              setEventForm({...eventForm, slots: newSlots});
                            }}
                            className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={() => setEventForm({...eventForm, slots: [...eventForm.slots, { startTime: '', endTime: '', totalSeats: 50 }]})}
                      className="text-sm font-bold text-emerald-600 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add Another Slot
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Submit Event for Approval"}
                </button>
              </form>
            </div>
          </div>
        )}

        {view === 'admin' && (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-4xl font-black tracking-tight mb-2">Admin Command Center</h2>
                <p className="text-zinc-500 font-medium text-lg">Manage the entire CampusVibe event ecosystem.</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handleFixImages}
                  className="px-6 py-3 bg-zinc-100 text-zinc-900 font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center gap-2"
                >
                  <Settings className="w-5 h-5" /> Fix Images
                </button>
                <button 
                  onClick={() => setView('create-event')}
                  className="px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-lg shadow-zinc-900/20"
                >
                  <Plus className="w-5 h-5" /> Quick Add Event
                </button>
              </div>
            </div>

            {/* Admin Tabs */}
            <div className="flex gap-4 border-b border-zinc-200 pb-4 overflow-x-auto">
              {[
                { id: 'events', label: 'Event Approvals', icon: Calendar },
                { id: 'bookings', label: 'All Bookings', icon: Ticket },
                { id: 'users', label: 'User Directory', icon: Users },
                { id: 'terminal', label: 'System Terminal', icon: LayoutDashboard }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAdminTab(tab.id as any)}
                  className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${
                    adminTab === tab.id 
                      ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/20' 
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {adminTab === 'events' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Pending Approvals */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black tracking-tight">Pending Approvals</h3>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-black rounded-full uppercase tracking-widest">Action Required</span>
                  </div>
                  
                  <div className="bg-white rounded-[2.5rem] border border-zinc-200 overflow-hidden shadow-sm">
                    <div className="divide-y divide-zinc-100">
                      {pendingEvents.length === 0 ? (
                        <div className="p-20 text-center">
                          <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-8 h-8 text-zinc-300" />
                          </div>
                          <p className="text-zinc-400 font-bold">All caught up! No pending requests.</p>
                        </div>
                      ) : (
                        pendingEvents.map((event) => (
                          <div key={event.id} className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 hover:bg-zinc-50/50 transition-colors">
                            <div className="flex gap-6 items-center">
                              <div className="w-16 h-16 bg-zinc-100 rounded-2xl overflow-hidden shadow-inner">
                                <img src={event.poster_url || `https://images.unsplash.com/photo-1540575861501-7ad05823c23d?auto=format&fit=crop&q=80&w=800`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div>
                                <h4 className="text-lg font-black mb-1">{event.title}</h4>
                                <p className="text-sm text-zinc-500 font-medium">{event.date} • {event.venue}</p>
                                <div className="mt-2 inline-block px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] font-black rounded uppercase tracking-widest">
                                  {event.category}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                              <button 
                                onClick={() => handleApproveEvent(event.id, 'APPROVED')}
                                className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleApproveEvent(event.id, 'REJECTED')}
                                className="flex-1 md:flex-none px-6 py-3 bg-red-50 text-red-600 font-black rounded-xl hover:bg-red-100 transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-12">
                    <h3 className="text-2xl font-black tracking-tight mb-6">Live Events Management</h3>
                    <div className="bg-white rounded-[2.5rem] border border-zinc-200 overflow-hidden shadow-sm">
                      <div className="divide-y divide-zinc-100">
                        {events.map((event) => (
                          <div key={event.id} className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 hover:bg-zinc-50/50 transition-colors">
                            <div className="flex gap-6 items-center">
                              <div className="w-16 h-16 bg-zinc-100 rounded-2xl overflow-hidden shadow-inner">
                                <img src={event.poster_url || `https://images.unsplash.com/photo-1540575861501-7ad05823c23d?auto=format&fit=crop&q=80&w=800`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div>
                                <h4 className="text-lg font-black mb-1">{event.title}</h4>
                                <p className="text-sm text-zinc-500 font-medium">{event.date} • {event.venue}</p>
                              </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                              {confirmingDelete === event.id ? (
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="px-4 py-2 bg-red-600 text-white font-black rounded-lg hover:bg-red-700 transition-all text-xs uppercase tracking-widest"
                                  >
                                    Confirm
                                  </button>
                                  <button 
                                    onClick={() => setConfirmingDelete(null)}
                                    className="px-4 py-2 bg-zinc-100 text-zinc-500 font-black rounded-lg hover:bg-zinc-200 transition-all text-xs uppercase tracking-widest"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setConfirmingDelete(event.id)}
                                  className="flex-1 md:flex-none px-4 py-2 bg-zinc-100 text-red-600 font-black rounded-lg hover:bg-red-50 transition-all text-xs uppercase tracking-widest"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Stats Sidebar */}
                <div className="space-y-8">
                  <h3 className="text-2xl font-black tracking-tight">Quick Stats</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { label: 'Total Events', value: events.length + pendingEvents.length, color: 'emerald' },
                      { label: 'Pending Approvals', value: pendingEvents.length, color: 'amber' },
                      { label: 'Total Bookings', value: adminBookings.length, color: 'cyan' },
                      { label: 'Active Users', value: adminUsers.length, color: 'blue' }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">{stat.label}</p>
                        <p className={`text-2xl font-black text-${stat.color}-600`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'bookings' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black tracking-tight">All Campus Bookings</h3>
                <div className="bg-white rounded-[2.5rem] border border-zinc-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-100">
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">User</th>
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Event</th>
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Slot</th>
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</th>
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {adminBookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <p className="font-black text-zinc-900">{booking.user_name}</p>
                              <p className="text-xs text-zinc-500 font-medium">{booking.user_email}</p>
                            </td>
                            <td className="px-8 py-6">
                              <p className="font-black text-zinc-900">{booking.event_title}</p>
                              <p className="text-xs text-zinc-500 font-medium">{booking.event_date}</p>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-sm font-bold text-zinc-600">{booking.start_time} - {booking.end_time}</p>
                            </td>
                            <td className="px-8 py-6">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                booking.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                              }`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleUpdateBookingStatus(booking.id, 'CANCELLED')}
                                  className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                  title="Cancel Booking"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {adminTab === 'users' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black tracking-tight">User Directory</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {adminUsers.map((u) => (
                    <div key={u.id} className="bg-white p-8 rounded-[2rem] border border-zinc-200 shadow-sm flex flex-col gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center text-2xl font-black text-zinc-400">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-lg font-black mb-1">{u.name}</h4>
                          <p className="text-sm text-zinc-500 font-medium mb-2">{u.email}</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                            u.role === 'ADMIN' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-zinc-100 flex gap-2">
                        <select 
                          value={u.role}
                          onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                          className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold"
                        >
                          <option value="STUDENT">Student</option>
                          <option value="ORGANIZER">Organizer</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'terminal' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black tracking-tight">System Terminal</h3>
                  <button 
                    onClick={fetchAdminLogs} 
                    disabled={refreshingLogs}
                    className={`text-emerald-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all hover:text-emerald-500 ${refreshingLogs ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshingLogs ? 'animate-spin' : ''}`} />
                    {refreshingLogs ? 'Refreshing...' : 'Refresh Logs'}
                  </button>
                </div>
                <div className="bg-zinc-900 rounded-[2.5rem] p-8 border border-white/10 shadow-2xl font-mono text-sm overflow-hidden">
                  <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="ml-4 text-zinc-500 text-xs">campus-vibe-terminal v1.0.4</span>
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                    {adminLogs.length === 0 ? (
                      <p className="text-zinc-500 italic">No system activity logged yet...</p>
                    ) : (
                      adminLogs.map((log, i) => (
                        <div key={i} className="flex gap-4 group">
                          <span className="text-zinc-600 shrink-0">[{new Date(log.timestamp || Date.now()).toLocaleTimeString()}]</span>
                          <span className={`font-bold shrink-0 ${
                            log.type === 'BOOKING' ? 'text-emerald-400' : 'text-cyan-400'
                          }`}>
                            {log.type}
                          </span>
                          <span className="text-zinc-300 group-hover:text-white transition-colors">{log.message}</span>
                        </div>
                      ))
                    )}
                    <div className="flex gap-2 text-emerald-500 animate-pulse">
                      <span>$</span>
                      <span className="w-2 h-5 bg-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'info' && infoPage && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto py-12"
          >
            <button 
              onClick={() => setView('home')}
              className="flex items-center gap-2 text-emerald-600 font-bold mb-8 hover:gap-3 transition-all"
            >
              <X className="w-4 h-4" /> Back to Home
            </button>
            <div className="bg-white rounded-[3rem] p-12 border border-zinc-200 shadow-xl">
              <h2 className="text-5xl font-black tracking-tighter mb-12">{infoPage.title}</h2>
              <div className="prose prose-zinc max-w-none">
                {infoPage.content}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 text-white py-24 mt-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-16">
            <div className="col-span-1 md:col-span-2 space-y-8">
              <button onClick={() => setView('home')} className="flex items-center gap-4 hover:opacity-80 transition-opacity text-left">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black tracking-tighter leading-tight">Campus<span className="text-emerald-500">Vibe</span></span>
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-[0.3em]">CampusVibe</span>
                </div>
              </button>
              <p className="text-zinc-400 max-w-sm leading-relaxed font-medium text-lg">
                The premier event management ecosystem for St. John College of Engineering and Management. Empowering students through seamless discovery and participation.
              </p>
            </div>
            <div>
              <h4 className="font-black mb-8 uppercase text-[10px] tracking-[0.4em] text-emerald-500">Platform</h4>
              <ul className="space-y-5 text-sm font-bold text-zinc-400">
                <li><button onClick={() => setView('home')} className="hover:text-white transition-colors">Browse Events</button></li>
                <li><button onClick={() => setView('create-event')} className="hover:text-white transition-colors">Host an Event</button></li>
                <li><button onClick={() => setView('dashboard')} className="hover:text-white transition-colors">My Bookings</button></li>
                <li><button onClick={() => showInfo('Event Categories', (
                  <div className="space-y-6">
                    <p className="text-zinc-400">Explore the diverse range of events hosted at CampusVibe.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Competition'].map(cat => (
                        <div key={cat} className="p-4 bg-zinc-900 rounded-xl border border-white/5">
                          <h4 className="font-bold text-white mb-1">{cat}</h4>
                          <p className="text-xs text-zinc-500">Discover exciting {cat.toLowerCase()} activities and challenges.</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))} className="hover:text-white transition-colors">Event Categories</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black mb-8 uppercase text-[10px] tracking-[0.4em] text-emerald-500">Support</h4>
              <ul className="space-y-5 text-sm font-bold text-zinc-400">
                <li><button onClick={() => showInfo('Help Center', (
                  <div className="space-y-6 text-zinc-400">
                    <p>Need assistance with CampusVibe? We're here to help.</p>
                    <div className="space-y-4">
                      <div className="p-4 bg-zinc-900 rounded-xl border border-white/5">
                        <h4 className="font-bold text-white mb-2">Booking Issues</h4>
                        <p className="text-sm">If you face any issues while booking a slot, please ensure you are logged in and have a stable internet connection.</p>
                      </div>
                      <div className="p-4 bg-zinc-900 rounded-xl border border-white/5">
                        <h4 className="font-bold text-white mb-2">Event Hosting</h4>
                        <p className="text-sm">To host an event, fill out the form in the 'Host an Event' section. Your event will be live once approved by an admin.</p>
                      </div>
                    </div>
                  </div>
                ))} className="hover:text-white transition-colors">Help Center</button></li>
                <li><button onClick={() => showInfo('Terms of Service', (
                  <div className="space-y-4 text-zinc-400 text-sm">
                    <p>By using CampusVibe, you agree to the following terms:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Users must provide accurate information during registration.</li>
                      <li>Event organizers are responsible for the content and conduct of their events.</li>
                      <li>Abuse of the booking system may lead to account suspension.</li>
                      <li>The platform is for educational and campus-related activities only.</li>
                    </ul>
                  </div>
                ))} className="hover:text-white transition-colors">Terms of Service</button></li>
                <li><button onClick={() => showInfo('Privacy Policy', (
                  <div className="space-y-4 text-zinc-400 text-sm">
                    <p>Your privacy is important to us. Here's how we handle your data:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>We collect basic information like name and email for authentication.</li>
                      <li>Booking data is used solely for event management purposes.</li>
                      <li>We do not share your personal data with third parties.</li>
                      <li>You can request data deletion by contacting support.</li>
                    </ul>
                  </div>
                ))} className="hover:text-white transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => showInfo('FAQ', (
                  <div className="space-y-6 text-zinc-400">
                    {[
                      { q: "How do I cancel a booking?", a: "Go to 'My Bookings' and click the 'Cancel' button on the respective event." },
                      { q: "Can I host multiple events?", a: "Yes, you can submit multiple event requests for approval." },
                      { q: "Is the platform free?", a: "Yes, CampusVibe is free for all students and faculty." }
                    ].map((item, i) => (
                      <div key={i} className="space-y-2">
                        <h4 className="font-bold text-white">Q: {item.q}</h4>
                        <p className="text-sm">A: {item.a}</p>
                      </div>
                    ))}
                  </div>
                ))} className="hover:text-white transition-colors">FAQ</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black mb-8 uppercase text-[10px] tracking-[0.4em] text-emerald-500">Contact</h4>
              <ul className="space-y-5 text-sm font-bold text-zinc-400">
                <li className="flex flex-col gap-1">
                  <span className="text-zinc-600 uppercase text-[9px] tracking-widest">Email</span>
                  <button 
                    onClick={() => showInfo('Contact Us', (
                      <div className="space-y-6 text-zinc-400">
                        <p>Have a specific query? Reach out to our team.</p>
                        <div className="p-6 bg-zinc-900 rounded-2xl border border-white/5 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white">General Support</span>
                            <span className="text-emerald-500">support@campusvibe.edu.in</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white">Event Queries</span>
                            <span className="text-emerald-500">events@campusvibe.edu.in</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white">Technical Support</span>
                            <span className="text-emerald-500">tech@campusvibe.edu.in</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    className="text-zinc-300 hover:text-white transition-colors text-left"
                  >
                    support@campusvibe.edu.in
                  </button>
                </li>
                <li className="flex flex-col gap-1">
                  <span className="text-zinc-600 uppercase text-[9px] tracking-widest">Location</span>
                  <button 
                    onClick={() => showInfo('Our Location', (
                      <div className="space-y-6 text-zinc-400">
                        <p>Visit us at our campus in Palghar.</p>
                        <div className="p-6 bg-zinc-900 rounded-2xl border border-white/5 space-y-2">
                          <h4 className="font-bold text-white">St. John College of Engineering and Management</h4>
                          <p className="text-sm">St. John Technical Education Complex, Babasaheb Ambedkar Road, Vevoor, Palghar (E), Dist. Palghar - 401404, Maharashtra, India.</p>
                        </div>
                      </div>
                    ))}
                    className="text-zinc-300 hover:text-white transition-colors text-left"
                  >
                    Palghar, Maharashtra
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-black mb-8 uppercase text-[10px] tracking-[0.4em] text-emerald-500">Admin</h4>
              <ul className="space-y-5 text-sm font-bold text-zinc-400">
                <li>
                  <button 
                    onClick={() => {
                      if (!isAuthenticated) {
                        setView('login');
                        showMessage('Please login as an admin to access the portal', 'error');
                      } else if (user?.role !== 'ADMIN') {
                        showMessage('Access Denied: Only admins can access the portal', 'error');
                      } else {
                        setView('admin');
                        window.scrollTo(0, 0);
                      }
                    }} 
                    className="hover:text-white transition-colors flex items-center gap-2"
                  >
                    <LayoutDashboard className="w-3 h-3" /> Admin Portal
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => showInfo('Admin Access', (
                      <div className="space-y-4 text-zinc-400 text-sm">
                        <p>The Admin Portal is restricted to authorized personnel only.</p>
                        <p>Admins can:</p>
                        <ul className="list-disc pl-5 space-y-2">
                          <li>Approve or Reject event hosting requests.</li>
                          <li>Manage all campus bookings.</li>
                          <li>Update user roles and permissions.</li>
                          <li>Monitor system activity logs.</li>
                        </ul>
                      </div>
                    ))} 
                    className="hover:text-white transition-colors"
                  >
                    Portal Info
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-24 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em]">© 2026 CampusVibe • Built for Megaleio 2026</p>
            <div className="flex gap-10">
              <button 
                onClick={() => showInfo('Notifications', (
                  <div className="text-center py-12 space-y-4">
                    <Bell className="w-16 h-16 text-zinc-800 mx-auto" />
                    <p className="text-zinc-500">You're all caught up! No new notifications.</p>
                  </div>
                ))}
                className="text-zinc-600 hover:text-emerald-500 transition-colors"
              >
                <Bell className="w-5 h-5" />
              </button>
              <button 
                onClick={() => showInfo('Preferences', (
                  <div className="space-y-8 text-zinc-400">
                    <p>Customize your CampusVibe experience.</p>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-zinc-900 rounded-xl border border-white/5">
                        <span>Email Notifications</span>
                        <div className="w-10 h-5 bg-emerald-500 rounded-full relative">
                          <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-zinc-900 rounded-xl border border-white/5 opacity-50">
                        <span>Dark Mode (Always On)</span>
                        <div className="w-10 h-5 bg-zinc-700 rounded-full relative">
                          <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                className="text-zinc-600 hover:text-emerald-500 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
