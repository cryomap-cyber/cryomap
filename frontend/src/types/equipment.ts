export type EquipmentStatus =
  | 'ACTIVE'
  | 'RUNNING'
  | 'STOPPED'
  | 'MAINTENANCE'
  | 'OFFLINE'
  | 'INACTIVE';

export type RefrigerantFluid =
  | 'R22'
  | 'R32'
  | 'R410A'
  | 'R134A'
  | 'R404A'
  | 'R407C';

export type Equipment = {
  id: string;
  companyId: string;
  roomId?: string | null;
  name: string;
  code: string;
  model?: string | null;
  manufacturer?: string | null;
  serialNumber?: string | null;
  refrigerantFluid?: RefrigerantFluid | null;
  setpoint?: number | null;
  delta?: number | null;
  currentTemperature?: number | null;
  status: EquipmentStatus;
  notes?: string | null;
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
