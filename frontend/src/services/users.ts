import { api } from './api';
import type { User } from '../types/user';

export type GetUsersParams = {
  companyId?: string;
};

export async function getUsers(params?: GetUsersParams) {
  const response = await api.get<User[]>('/users', {
    params,
  });

  return response.data;
}
