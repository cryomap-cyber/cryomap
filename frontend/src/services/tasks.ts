import type {
  Task,
  TaskOrigin,
  TaskPriority,
  TaskStatus,
} from '../types/task';
import { api } from './api';
import { getStoredAuthUser } from './auth-storage';

export type GetTasksParams = {
  companyId?: string;
  roomId?: string;
  equipmentId?: string;
  assignedToUserId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  origin?: TaskOrigin;
  externalCode?: string;
  startDueDate?: string;
  endDueDate?: string;
};

export type CreateTaskPayload = {
  companyId: string;
  roomId?: string;
  equipmentId?: string;
  assignedToUserId?: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  origin?: TaskOrigin;
  externalCode?: string;
  externalUrl?: string;
  dueDate?: string;
};

export type UpdateTaskPayload = {
  companyId?: string;
  roomId?: string | null;
  equipmentId?: string | null;
  assignedToUserId?: string | null;
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  origin?: TaskOrigin;
  externalCode?: string | null;
  externalUrl?: string | null;
  dueDate?: string | null;
};

export async function getTasks(params?: GetTasksParams) {
  const storedUser = getStoredAuthUser();

  if (storedUser?.role === 'CLIENT_USER') {
    return [];
  }

  const response = await api.get<Task[]>('/tasks', {
    params,
  });

  return response.data;
}

export async function createTask(payload: CreateTaskPayload) {
  const response = await api.post<Task>('/tasks', payload);

  return response.data;
}

export async function updateTask(taskId: string, payload: UpdateTaskPayload) {
  const response = await api.patch<Task>(`/tasks/${taskId}`, payload);

  return response.data;
}

export async function inactivateTask(taskId: string) {
  await api.delete(`/tasks/${taskId}`);
}
