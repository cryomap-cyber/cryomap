import { api } from './api';
import type { Equipment, EquipmentStatus } from '../types/equipment';

export type GetEquipmentsParams = {
  companyId?: string;
  roomId?: string;
};

export type CreateEquipmentPayload = {
  companyId: string;
  roomId?: string | null;
  name: string;
  code: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  setpoint?: number;
  delta?: number;
  notes?: string;
};

export type UpdateEquipmentPayload = Partial<CreateEquipmentPayload> & {
  status?: EquipmentStatus;
};

export async function getEquipments(params?: GetEquipmentsParams) {
  const response = await api.get<Equipment[]>('/equipments', {
    params,
  });

  return response.data;
}

export async function createEquipment(payload: CreateEquipmentPayload) {
  const response = await api.post<Equipment>('/equipments', payload);

  return response.data;
}

export async function updateEquipment(
  equipmentId: string,
  payload: UpdateEquipmentPayload,
) {
  const response = await api.patch<Equipment>(
    `/equipments/${equipmentId}`,
    payload,
  );

  return response.data;
}

export async function inactivateEquipment(equipmentId: string) {
  await api.delete(`/equipments/${equipmentId}`);
}
