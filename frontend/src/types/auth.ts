import type { UserRole, UserStatus } from './user';

export type AuthUser = {
  id: string;
  companyId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  jobTitle?: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  company?: {
    id: string;
    name: string;
    cnpj?: string | null;
    status?: string | null;
  } | null;
};

export type LoginResponse = {
  accessToken: string;
};
