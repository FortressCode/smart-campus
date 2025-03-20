export interface Module {
  id: string;
  title: string;
  description: string;
  courseId: string;
  duration: number; // in weeks
  credits: number;
  prerequisites: string[];
  learningOutcomes: string[];
  assessmentMethods: string[];
  createdAt: Date;
  updatedAt: Date;
} 