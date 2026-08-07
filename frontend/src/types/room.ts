export type RoomStatus = 'ACTIVE' | 'INACTIVE';

export type ThermalStatus = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE';

export type Room = {
  id: string;
  name: string;
  type?: string | null;
  notes?: string | null;
  companyId: string;
  status: RoomStatus;
  thermalStatus: ThermalStatus;
  currentTemperature?: number | null;
  minTemperature?: number | null;
  maxTemperature?: number | null;
  mapX?: number | null;
  mapY?: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  company?: {
    id: string;
    name: string;
  } | null;
};
