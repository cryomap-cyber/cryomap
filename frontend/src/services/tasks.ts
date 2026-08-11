import { api } from './api';
import type { Task, TaskPriority, TaskStatus } from '../types/task';

export type GetTasksParams = {
  companyId?: string;
  roomId?: string;
  equipmentId?: string;
  assignedToUserId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
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
  dueDate?: string | null;
};

export async function getTasks(params?: GetTasksParams) {
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
