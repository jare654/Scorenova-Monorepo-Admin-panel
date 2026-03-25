export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  grade: 6 | 8 | 12;
  status: "premium" | "free" | "trial";
  joinDate: string;
  lastActive: string;
  accuracy: number;
  accuracyTrend: number;
  avatar?: string;
  subjectAccuracy: Record<string, number>;
  weakTopics: string[];
  activityLog: ActivityItem[];
}

export interface Question {
  id: string;
  text: string;
  grade: 6 | 8 | 12;
  subject: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  accuracy: number;
  attempts: number;
  correctCount: number;
  avgTime: number;
}

export interface Transaction {
  id: string;
  date: string;
  userId: string;
  userName: string;
  amount: number;
  method: "Telebirr" | "CBE Birr" | "M-Pesa";
  status: "Success" | "Pending" | "Failed";
}

export interface ActivityItem {
  id: string;
  message: string;
  time: string;
  type: "upgrade" | "alert" | "info" | "registration";
}

export interface AIModel {
  name: string;
  avgLatency: string;
  successRate: number;
  costPerRequest: number;
  dailyRequests: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "Super Admin" | "Content Manager" | "Support";
  lastLogin: string;
}
