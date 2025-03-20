export interface Module {
  id: string;
  title: string;
  code: string;
  description: string;
  credits: number;
  semester: number;
  prerequisites: string[];
  lecturers: string[];
  assessmentMethods: {
    type: string;
    weight: number;
  }[];
  learningOutcomes: string[];
}

export interface Course {
  id: string;
  title: string;
  code: string;
  level: 'Diploma' | 'Associate Degree' | 'Bachelor\'s Degree' | 'Top up Degree' | 'Postgraduate Diploma' | 'Master\'s Degree' | 'PhD';
  description: string;
  department: string;
  duration: number; // in years
  credits: number;
  modules: string[]; // Module IDs
  coordinator: string;
  status: 'Active' | 'Inactive' | 'Pending Approval';
  createdAt: Date;
  updatedAt: Date;
} 