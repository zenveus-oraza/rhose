export type UserRole = 'admin' | 'learner';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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
