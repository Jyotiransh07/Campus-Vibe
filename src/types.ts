export interface User {
  id: number;
  name: string;
  email: string;
  role: 'STUDENT' | 'ORGANIZER' | 'ADMIN';
  club_name?: string;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  rules?: string;
  date: string;
  time: string;
  venue: string;
  poster_url?: string;
  category: string;
  organizer_id: number;
  parent_event_id?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

export interface EventSlot {
  id: number;
  event_id: number;
  start_time: string;
  end_time: string;
  total_seats: number;
  available_seats: number;
}

export interface Booking {
  id: number;
  user_id: number;
  slot_id: number;
  booking_date: string;
  status: string;
  event_title?: string;
  event_date?: string;
  venue?: string;
  start_time?: string;
  end_time?: string;
}
