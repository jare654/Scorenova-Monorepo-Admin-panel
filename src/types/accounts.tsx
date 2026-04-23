export type AccountStatus = "free" | "premium" | "trial";
export type AccountType = "student" | "admin" | "teacher";

export interface Account {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  type: AccountType;
  isActive: boolean;
  status: AccountStatus;
  gradeId: string | null;
  gender: string;
  address: string | null;
  profileImageFilename: string | null;
  fcmId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  deletedBy: string | null;
  createdAt: string;
  joinedAt: string;
  lastActiveAt: string | null;
  updatedAt: string;
  deletedAt: string | null;
}

export interface UserGrowthPoint {
  day: string;
  users: number;
  premium: number;
}

export interface StatusDataPoint {
  name: string;
  value: number;
}
