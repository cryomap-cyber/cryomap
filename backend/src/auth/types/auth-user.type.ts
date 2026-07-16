import type { UserRole, UserStatus } from '../../generated/prisma/client.js';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  companyId: string | null;
};
