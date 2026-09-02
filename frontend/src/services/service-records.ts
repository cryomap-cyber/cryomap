import type { ServiceRecord } from '../types/service-record';
import { api } from './api';

export type GetServiceRecordsParams = {
  taskId?: string;
  companyId?: string;
  roomId?: string;
  equipmentId?: string;
  technicianId?: string;
  startDate?: string;
  endDate?: string;
};

export type CreateServiceRecordPayload = {
  taskId: string;
  technicianId?: string;
  startedAt?: string;
  finishedAt?: string;
  standardizedProblem?: string;
  problemFound?: string;
  servicePerformed?: string;
  notes?: string;
};

export type UpdateServiceRecordPayload = {
  technicianId?: string | null;
  startedAt?: string;
  finishedAt?: string | null;
  standardizedProblem?: string | null;
  problemFound?: string | null;
  servicePerformed?: string | null;
  notes?: string | null;
};

export async function getServiceRecords(params?: GetServiceRecordsParams) {
  const response = await api.get<ServiceRecord[]>('/service-records', {
    params,
  });

  return response.data;
}

export async function createServiceRecord(
  payload: CreateServiceRecordPayload,
) {
  const response = await api.post<ServiceRecord>('/service-records', payload);

  return response.data;
}

export async function updateServiceRecord(
  serviceRecordId: string,
  payload: UpdateServiceRecordPayload,
) {
  const response = await api.patch<ServiceRecord>(
    `/service-records/${serviceRecordId}`,
    payload,
  );

  return response.data;
}

export async function removeServiceRecord(serviceRecordId: string) {
  await api.delete(`/service-records/${serviceRecordId}`);
}
