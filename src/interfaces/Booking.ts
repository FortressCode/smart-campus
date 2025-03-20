export interface Booking {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  bookingType: 'class' | 'meeting' | 'event' | 'other';
  date: string; // ISO format date
  startTime: string; // Format: HH:MM
  endTime: string; // Format: HH:MM
  bookedBy: string; // User ID who booked the classroom
  bookedFor: string; // User ID (lecturer) for whom the room is booked, if applicable
  attendees?: string[]; // Array of user IDs if tracking attendees
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: Date;
  updatedAt: Date;
} 