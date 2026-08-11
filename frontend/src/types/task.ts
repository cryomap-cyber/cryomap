export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'CANCELED'
  | 'OVERDUE';

export type Task = {
  id: string;
  companyId: string;
  roomId?: string | null;
  equipmentId?: string | null;
  assignedToUserId?: string | null;
  title: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string | null;
  completedAt?: string | null;
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
  equipment?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  assignedToUser?: {
    id: string;
    name: string;
    email?: string | null;
  } | null;
};
