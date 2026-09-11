export type UserRole = 'admin' | 'payroll_hr' | 'employee';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  avatarUrl?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}
