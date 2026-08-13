import { api } from './api';
import { getStoredAuthUser } from './auth-storage';
import type { Sensor, SensorStatus, SensorType } from '../types/sensor';

export type GetSensorsParams = {
  companyId?: string;
  roomId?: string;
};

export type CreateSensorPayload = {
  companyId: string;
  roomId: string;
  code: string;
  type?: SensorType;
  location?: string;
  status?: SensorStatus;
  lastTemperature?: number;
  lastHumidity?: number;
};

export type UpdateSensorPayload = {
  companyId?: string;
  roomId?: string;
  code?: string;
  type?: SensorType;
  location?: string | null;
  status?: SensorStatus;
  lastTemperature?: number | null;
  lastHumidity?: number | null;
};

export async function getSensors(params?: GetSensorsParams) {
  const storedUser = getStoredAuthUser();

  if (storedUser?.role === 'TECHNICIAN') {
    return [];
  }

  const response = await api.get<Sensor[]>('/sensors', {
    params,
  });

  return response.data;
}

export async function createSensor(payload: CreateSensorPayload) {
  const response = await api.post<Sensor>('/sensors', payload);

  return response.data;
}

export async function updateSensor(sensorId: string, payload: UpdateSensorPayload) {
  const response = await api.patch<Sensor>(`/sensors/${sensorId}`, payload);

  return response.data;
}

export async function inactivateSensor(sensorId: string) {
  await api.delete(`/sensors/${sensorId}`);
}
