export interface Classroom {
  id: string;
  name: string;
  building: string;
  floor: number;
  roomNumber: string;
  capacity: number;
  resources: string[]; // List of available resources (projector, whiteboard, etc.)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassroomAvailability {
  id: string;
  classroomId: string;
  date: string; // ISO format date
  timeSlots: TimeSlot[];
}

export interface TimeSlot {
  id: string;
  startTime: string; // Format: HH:MM
  endTime: string; // Format: HH:MM
  isAvailable: boolean;
} 