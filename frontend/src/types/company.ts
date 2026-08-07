export type CompanyStatus = 'ACTIVE' | 'INACTIVE';

export type Company = {
  id: string;
  name: string;
  cnpj: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};
