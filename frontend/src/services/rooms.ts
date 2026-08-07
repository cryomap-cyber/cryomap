import { api } from './api';
import type { Room } from '../types/room';

export type CreateRoomPayload = {
  name: string;
  type?: string;
  notes?: string;
  companyId: string;
  minTemperature?: number;
  maxTemperature?: number;
  currentTemperature?: number;
  mapX?: number;
  mapY?: number;
};

export type UpdateRoomPayload = Partial<CreateRoomPayload> & {
  status?: Room['status'];
};

export async function getRooms(companyId?: string) {
  const response = await api.get<Room[]>('/rooms', {
    params: companyId ? { companyId } : undefined,
  });

  return response.data;
}

export async function createRoom(payload: CreateRoomPayload) {
  const response = await api.post<Room>('/rooms', payload);

  return response.data;
}

export async function updateRoom(roomId: string, payload: UpdateRoomPayload) {
  const response = await api.patch<Room>(`/rooms/${roomId}`, payload);

  return response.data;
}

export async function inactivateRoom(roomId: string) {
  await api.delete(`/rooms/${roomId}`);
}
