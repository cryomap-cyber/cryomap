import { api } from './api';
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
};

export type UpdateSensorPayload = Partial<CreateSensorPayload> & {
  status?: SensorStatus;
};

export async function getSensors(params?: GetSensorsParams) {
  const response = await api.get<Sensor[]>('/sensors', {
    params,
  });

  return response.data;
}

export async function createSensor(payload: CreateSensorPayload) {
  const response = await api.post<Sensor>('/sensors', payload);

  return response.data;
}

export async function updateSensor(
  sensorId: string,
  payload: UpdateSensorPayload,
) {
  const response = await api.patch<Sensor>(`/sensors/${sensorId}`, payload);

  return response.data;
}

export async function inactivateSensor(sensorId: string) {
  await api.delete(`/sensors/${sensorId}`);
}
