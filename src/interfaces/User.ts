export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'student' | 'teacher';
  department?: string;
  createdAt: Date;
  updatedAt: Date;
} 