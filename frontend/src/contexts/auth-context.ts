import { createContext } from 'react';
import type { AuthUser } from '../types/auth';

export type AuthContextData = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextData | undefined>(
  undefined,
);
