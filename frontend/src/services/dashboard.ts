import { api } from './api';
import type { DashboardOverview } from '../types/dashboard';

export async function getDashboardOverview() {
  const response = await api.get<DashboardOverview>('/dashboard/overview');

  return response.data;
}
