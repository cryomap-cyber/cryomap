import type { EquipmentStatus } from './equipment';
import type { ThermalStatus } from './room';
import type { TaskPriority, TaskStatus } from './task';
import type { UserRole, UserStatus } from './user';

export type ServiceRecord = {
  id: string;
  taskId: string;
  companyId: string;
  roomId?: string | null;
  equipmentId?: string | null;
  technicianId?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  downtimeMinutes?: number | null;
  problemFound?: string | null;
  servicePerformed?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  task?: {
    id: string;
    title: string;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
    completedAt?: string | null;
  } | null;
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
    status?: EquipmentStatus | null;
    currentTemperature?: number | null;
  } | null;
  technician?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
  } | null;
};
