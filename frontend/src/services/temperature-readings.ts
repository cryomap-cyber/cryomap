import { api } from './api';
import type { TemperatureReading } from '../types/temperature-reading';

export type GetTemperatureReadingsParams = {
  companyId?: string;
  roomId?: string;
  sensorId?: string;
  startDate?: string;
  endDate?: string;
};

export type CreateTemperatureReadingPayload = {
  companyId: string;
  roomId: string;
  sensorId?: string;
  temperature: number;
  humidity?: number;
  readAt?: string;
  source?: string;
};

export async function getTemperatureReadings(
  params?: GetTemperatureReadingsParams,
) {
  const response = await api.get<TemperatureReading[]>('/temperature-readings', {
    params,
  });

  return response.data;
}

export async function createTemperatureReading(
  payload: CreateTemperatureReadingPayload,
) {
  const response = await api.post<TemperatureReading>(
    '/temperature-readings',
    payload,
  );

  return response.data;
}
