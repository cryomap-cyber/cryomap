import axios from 'axios';
import {
  getScopedUserCompanyId,
  getStoredToken,
  isCompanyScopedUser,
} from './auth-storage';

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const scopedCompanyGetRoutes = [
  '/dashboard/overview',
  '/dashboard/room-temperature-series',
  '/dashboard/room-humidity-series',
  '/dashboard/room-readings-summary',
  '/dashboard/recent-room-readings',
  '/rooms',
  '/equipments',
  '/sensors',
  '/temperature-readings',
  '/equipment-temperature-readings',
  '/thermal-alerts',
  '/tasks',
  '/service-records',
  '/attachments',
  '/reports/operational-summary',
  '/reports/tasks-summary',
  '/reports/service-records-summary',
  '/reports/downtime-summary',
  '/reports/thermal-readings-summary',
  '/reports/export/tasks.xlsx',
  '/reports/export/service-records.xlsx',
  '/reports/export/downtime.xlsx',
  '/reports/export/thermal-readings.xlsx',
  '/reports/export/tasks.pdf',
  '/reports/export/service-records.pdf',
  '/reports/export/downtime.pdf',
  '/reports/export/thermal-readings.pdf',
];

export const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const method = config.method?.toLowerCase();
  const url = normalizeUrl(config.url);
  const companyId = getScopedUserCompanyId();

  if (
    method === 'get' &&
    companyId &&
    scopedCompanyGetRoutes.includes(url)
  ) {
    config.params = {
      ...(isPlainObject(config.params) ? config.params : {}),
      companyId,
    };
  }

  return config;
});

api.interceptors.response.use((response) => {
  const method = response.config.method?.toLowerCase();
  const url = normalizeUrl(response.config.url);
  const companyId = getScopedUserCompanyId();

  if (
    method === 'get' &&
    url === '/companies' &&
    isCompanyScopedUser() &&
    companyId &&
    Array.isArray(response.data)
  ) {
    response.data = response.data.filter(
      (company: { id?: string }) => company.id === companyId,
    );
  }

  return response;
});

function normalizeUrl(url?: string) {
  if (!url) {
    return '';
  }

  if (url.startsWith('http')) {
    const parsedUrl = new URL(url);

    return parsedUrl.pathname;
  }

  return url.split('?')[0];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
