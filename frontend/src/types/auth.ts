export type UserRole =
  | 'MASTER_ADMIN'
  | 'SUPERVISOR'
  | 'EMPRESA_CLIENTE'
  | 'TECNICO';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  companyId?: string | null;
};

export type LoginResponse = {
  accessToken: string;
  user?: AuthUser;
};