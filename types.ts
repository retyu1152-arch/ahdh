
export type Priority = 'High' | 'Medium' | 'Low';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  priority?: Priority;
  category?: string;
  isDeleting?: boolean;
}

export interface FocusSession {
  id: string;
  startTime: number;
  duration: number; // in minutes
  completed: boolean;
}

export interface Goal {
  text: string;
  strategy: string;
  createdAt: number;
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  tasks: Task[];
}

export interface PsychoProfile {
  month: string;
  year: number;
  strengths: string[];
  growthAreas: string[];
  productivityPatterns: string;
  overallSummary: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface User {
    name: string;
    createdAt: number;
}
