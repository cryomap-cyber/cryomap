import { api } from './api';
import type { Company } from '../types/company';

export type CreateCompanyPayload = {
  name: string;
  cnpj: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
};

export type UpdateCompanyPayload = Partial<CreateCompanyPayload> & {
  status?: Company['status'];
};

export async function getCompanies() {
  const response = await api.get<Company[]>('/companies');

  return response.data;
}

export async function createCompany(payload: CreateCompanyPayload) {
  const response = await api.post<Company>('/companies', payload);

  return response.data;
}

export async function updateCompany(
  companyId: string,
  payload: UpdateCompanyPayload,
) {
  const response = await api.patch<Company>(`/companies/${companyId}`, payload);

  return response.data;
}

export async function inactivateCompany(companyId: string) {
  await api.delete(`/companies/${companyId}`);
}
