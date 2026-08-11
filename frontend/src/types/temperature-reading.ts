import type { ThermalStatus } from './room';
import type { SensorStatus, SensorType } from './sensor';

export type TemperatureReading = {
  id: string;
  companyId: string;
  roomId: string;
  sensorId?: string | null;
  temperature: number;
  humidity?: number | null;
  readAt: string;
  source?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
  company?: {
    id: string;
    name: string;
    cnpj?: string | null;
    status?: string | null;
  } | null;
  room?: {
    id: string;
    name: string;
    thermalStatus?: ThermalStatus | null;
    currentTemperature?: number | null;
    minTemperature?: number | null;
    maxTemperature?: number | null;
  } | null;
  sensor?: {
    id: string;
    code: string;
    type: SensorType;
    location?: string | null;
    status: SensorStatus;
  } | null;
};
