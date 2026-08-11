import { api } from './api';
import type {
  EquipmentTemperatureReading,
  EquipmentTemperatureSource,
} from '../types/equipment-temperature-reading';

export type GetEquipmentTemperatureReadingsParams = {
  companyId?: string;
  roomId?: string;
  equipmentId?: string;
  createdByUserId?: string;
  startDate?: string;
  endDate?: string;
};

export type CreateEquipmentTemperatureReadingPayload = {
  companyId: string;
  equipmentId: string;
  temperature: number;
  source?: EquipmentTemperatureSource;
  notes?: string;
  measuredAt?: string;
};

export async function getEquipmentTemperatureReadings(
  params?: GetEquipmentTemperatureReadingsParams,
) {
  const response = await api.get<EquipmentTemperatureReading[]>(
    '/equipment-temperature-readings',
    {
      params,
    },
  );

  return response.data;
}

export async function createEquipmentTemperatureReading(
  payload: CreateEquipmentTemperatureReadingPayload,
) {
  const response = await api.post<EquipmentTemperatureReading>(
    '/equipment-temperature-readings',
    payload,
  );

  return response.data;
}
