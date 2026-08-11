export type SensorStatus =
  | 'ACTIVE'
  | 'OFFLINE'
  | 'MAINTENANCE'
  | 'INACTIVE';

export type SensorType =
  | 'TEMPERATURE'
  | 'HUMIDITY'
  | 'TEMPERATURE_HUMIDITY';

export type Sensor = {
  id: string;
  companyId: string;
  roomId: string;
  code: string;
  type: SensorType;
  location?: string | null;
  lastTemperature?: number | null;
  lastHumidity?: number | null;
  lastSeenAt?: string | null;
  status: SensorStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  company?: {
    id: string;
    name: string;
  } | null;
  room?: {
    id: string;
    name: string;
  } | null;
};
