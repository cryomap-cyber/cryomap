import type { EquipmentStatus } from './equipment';
import type { ThermalStatus } from './room';
import type { UserRole, UserStatus } from './user';

export type EquipmentTemperatureSource = 'MANUAL';

export type EquipmentTemperatureReading = {
  id: string;
  companyId: string;
  roomId?: string | null;
  equipmentId: string;
  createdByUserId?: string | null;
  temperature: number;
  source: EquipmentTemperatureSource | string;
  notes?: string | null;
  measuredAt: string;
  createdAt: string;
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
  } | null;
  equipment?: {
    id: string;
    name: string;
    code: string;
    currentTemperature?: number | null;
    status?: EquipmentStatus | null;
  } | null;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
  } | null;
};
