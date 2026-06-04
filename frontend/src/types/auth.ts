export type UserRole = 'admin' | 'learner';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  jobTitle?: string | null;
  phone?: string | null;
  profileImage?: string | null;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}
