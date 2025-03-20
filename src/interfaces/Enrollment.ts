import { Course } from './Course';

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrollmentDate: Date;
  status: 'Active' | 'Completed' | 'Withdrawn' | 'On Hold';
  academicYear: string; // e.g., "2023-2024"
  semester: number; // Current semester in the course
  grade?: {
    semester: number;
    grade: string;
    gpa: number;
    remarks?: string;
  }[];
  attendance: {
    semester: number;
    moduleId: string;
    date: Date;
    status: 'Present' | 'Absent' | 'Late';
  }[];
  fees: {
    semester: number;
    amount: number;
    status: 'Paid' | 'Pending' | 'Overdue';
    dueDate: Date;
    paidDate?: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentEnrollment {
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrollments: Enrollment[];
}

export interface CourseEnrollment {
  courseId: string;
  courseName: string;
  courseCode: string;
  enrollments: Enrollment[];
} 