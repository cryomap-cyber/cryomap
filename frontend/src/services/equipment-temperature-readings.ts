import type {
  EquipmentTemperatureReading,
  EquipmentTemperatureSource,
} from '../types/equipment-temperature-reading';
import { api } from './api';

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

  dischargePressure?: number;
  suctionPressure?: number;
  liquidLineTemperature?: number;
  evaporationTemperature?: number;
  superheating?: number;
  subcooling?: number;
  airFlow?: number;

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
