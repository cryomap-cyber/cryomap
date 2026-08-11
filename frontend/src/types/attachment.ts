import type { TaskPriority, TaskStatus } from './task';
import type { UserRole, UserStatus } from './user';

export type AttachmentType =
  | 'SERVICE_PHOTO'
  | 'AUVO_REPORT'
  | 'COMPANY_LOGO'
  | 'FLOOR_PLAN'
  | 'OTHER';

export type Attachment = {
  id: string;
  companyId?: string | null;
  taskId?: string | null;
  serviceRecordId?: string | null;
  uploadedByUserId?: string | null;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  type: AttachmentType;
  createdAt: string;
  deletedAt?: string | null;
  company?: {
    id: string;
    name: string;
    cnpj?: string | null;
    status?: string | null;
  } | null;
  task?: {
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
  } | null;
  serviceRecord?: {
    id: string;
    taskId: string;
    startedAt: string;
    finishedAt?: string | null;
    downtimeMinutes?: number | null;
  } | null;
  uploadedByUser?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
  } | null;
};
