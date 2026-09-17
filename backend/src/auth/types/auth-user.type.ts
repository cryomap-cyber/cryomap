import type {
  CompanyStatus,
  UserRole,
  UserStatus,
} from '../../generated/prisma/client.js';

export type AuthUser = {
  id: string;
  companyId: string | null;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  role: UserRole;
  status: UserStatus;
  hasProfileImage: boolean;
  company: {
    id: string;
    name: string;
    cnpj: string;
    status: CompanyStatus;
  } | null;
};
