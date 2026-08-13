import { api } from './api';
import type { User, UserRole, UserStatus } from '../types/user';

export type GetUsersParams = {
  companyId?: string;
};

export type CreateUserPayload = {
  companyId?: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  jobTitle?: string;
  role?: UserRole;
  status?: UserStatus;
};

export type UpdateUserPayload = {
  companyId?: string | null;
  name?: string;
  email?: string;
  password?: string;
  phone?: string | null;
  jobTitle?: string | null;
  role?: UserRole;
  status?: UserStatus;
};

export async function getUsers(params?: GetUsersParams) {
  const response = await api.get<User[]>('/users');

  if (!params?.companyId) {
    return response.data;
  }

  return response.data.filter((user) => user.companyId === params.companyId);
}

export async function createUser(payload: CreateUserPayload) {
  const response = await api.post<User>('/users', payload);

  return response.data;
}

export async function updateUser(userId: string, payload: UpdateUserPayload) {
  const response = await api.patch<User>(`/users/${userId}`, payload);

  return response.data;
}

export async function inactivateUser(userId: string) {
  await api.delete(`/users/${userId}`);
}
