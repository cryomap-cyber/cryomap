import type { AuthUser } from '../types/auth';
import { api } from './api';

export type UpdateOwnProfilePayload = {
  name?: string;
  email?: string;
  phone?: string | null;
  jobTitle?: string | null;
};

export async function getOwnProfile() {
  const response = await api.get<AuthUser>('/users/me');

  return response.data;
}

export async function updateOwnProfile(
  payload: UpdateOwnProfilePayload,
) {
  const response = await api.patch<AuthUser>('/users/me', payload);

  return response.data;
}

export async function uploadOwnProfileImage(file: File) {
  const formData = new FormData();

  formData.append('file', file);

  const response = await api.post<AuthUser>(
    '/users/me/profile-image',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
}

export async function getOwnProfileImage() {
  const response = await api.get<Blob>('/users/me/profile-image', {
    responseType: 'blob',
  });

  return response.data;
}

export async function removeOwnProfileImage() {
  const response = await api.delete<AuthUser>(
    '/users/me/profile-image',
  );

  return response.data;
}
