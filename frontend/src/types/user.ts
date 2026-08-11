export type UserRole =
  | 'MASTER_ADMIN'
  | 'SUPERVISOR'
  | 'EMPRESA_CLIENTE'
  | 'TECNICO';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type User = {
  id: string;
  companyId?: string | null;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  company?: {
    id: string;
    name: string;
  } | null;
};
