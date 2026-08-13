export type UserRole =
  | 'MASTER_ADMIN'
  | 'SUPERVISOR'
  | 'CLIENT_USER'
  | 'TECHNICIAN';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type User = {
  id: string;
  companyId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  jobTitle?: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  company?: {
    id: string;
    name: string;
    cnpj?: string | null;
    status?: string | null;
  } | null;
};
