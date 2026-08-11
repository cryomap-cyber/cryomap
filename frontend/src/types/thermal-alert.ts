import type { ThermalStatus } from './room';
import type { SensorStatus } from './sensor';
import type { UserRole, UserStatus } from './user';

export type ThermalAlertType = 'HIGH_TEMPERATURE' | 'LOW_TEMPERATURE';

export type ThermalAlertSeverity = 'WARNING' | 'CRITICAL';

export type ThermalAlertStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'DISMISSED';

export type ThermalAlert = {
  id: string;
  companyId: string;
  roomId: string;
  sensorId?: string | null;
  readingId?: string | null;
  acknowledgedByUserId?: string | null;
  type: ThermalAlertType | string;
  severity: ThermalAlertSeverity | string;
  status: ThermalAlertStatus | string;
  temperature: number;
  minTemperature?: number | null;
  maxTemperature?: number | null;
  message: string;
  triggeredAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
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
    status: SensorStatus;
    lastTemperature?: number | null;
    lastHumidity?: number | null;
    lastSeenAt?: string | null;
  } | null;
  reading?: {
    id: string;
    temperature: number;
    humidity?: number | null;
    source?: string | null;
    readAt: string;
  } | null;
  acknowledgedByUser?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
  } | null;
};
