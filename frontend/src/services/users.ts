import { api } from './api';
import { getStoredAuthUser } from './auth-storage';
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
  const storedUser = getStoredAuthUser();

  if (
    storedUser &&
    storedUser.role !== 'MASTER_ADMIN' &&
    storedUser.role !== 'SUPERVISOR'
  ) {
    if (params?.companyId && storedUser.companyId !== params.companyId) {
      return [];
    }

    return [mapAuthUserToUser(storedUser)];
  }

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

function mapAuthUserToUser(storedUser: NonNullable<ReturnType<typeof getStoredAuthUser>>): User {
  const now = new Date().toISOString();

  return {
    id: storedUser.id,
    companyId: storedUser.companyId ?? null,
    name: storedUser.name,
    email: storedUser.email,
    phone: storedUser.phone ?? null,
    jobTitle: storedUser.jobTitle ?? null,
    role: storedUser.role,
    status: storedUser.status,
    lastLoginAt: storedUser.lastLoginAt ?? null,
    createdAt: storedUser.createdAt ?? now,
    updatedAt: storedUser.updatedAt ?? now,
    deletedAt: null,
    company: storedUser.company ?? null,
  };
}
