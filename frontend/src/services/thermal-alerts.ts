import { api } from './api';
import type {
  ThermalAlert,
  ThermalAlertSeverity,
  ThermalAlertStatus,
  ThermalAlertType,
} from '../types/thermal-alert';

export type GetThermalAlertsParams = {
  companyId?: string;
  roomId?: string;
  sensorId?: string;
  type?: ThermalAlertType | string;
  severity?: ThermalAlertSeverity | string;
  status?: ThermalAlertStatus | string;
  startDate?: string;
  endDate?: string;
};

export async function getThermalAlerts(params?: GetThermalAlertsParams) {
  const response = await api.get<ThermalAlert[]>('/thermal-alerts', {
    params,
  });

  return response.data;
}

export async function getThermalAlertById(id: string) {
  const response = await api.get<ThermalAlert>(`/thermal-alerts/${id}`);

  return response.data;
}

export async function acknowledgeThermalAlert(id: string) {
  const response = await api.patch<ThermalAlert>(
    `/thermal-alerts/${id}/acknowledge`,
  );

  return response.data;
}

export async function resolveThermalAlert(id: string) {
  const response = await api.patch<ThermalAlert>(
    `/thermal-alerts/${id}/resolve`,
  );

  return response.data;
}

export async function dismissThermalAlert(id: string) {
  const response = await api.patch<ThermalAlert>(
    `/thermal-alerts/${id}/dismiss`,
  );

  return response.data;
}

export async function removeThermalAlert(id: string) {
  await api.delete(`/thermal-alerts/${id}`);
}
