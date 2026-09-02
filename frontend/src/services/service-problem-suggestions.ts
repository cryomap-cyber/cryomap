import type { ServiceProblemSuggestion } from '../types/service-problem-suggestion';
import { api } from './api';

export type GetServiceProblemSuggestionsParams = {
  search?: string;
  includeInactive?: boolean;
};

export type CreateServiceProblemSuggestionPayload = {
  title: string;
  description?: string;
};

export type UpdateServiceProblemSuggestionPayload = {
  title?: string;
  description?: string | null;
  isActive?: boolean;
};

export async function getServiceProblemSuggestions(
  params?: GetServiceProblemSuggestionsParams,
) {
  const response = await api.get<ServiceProblemSuggestion[]>(
    '/service-problem-suggestions',
    {
      params: {
        search: params?.search,
        includeInactive: params?.includeInactive ? 'true' : undefined,
      },
    },
  );

  return response.data;
}

export async function getServiceProblemSuggestion(id: string) {
  const response = await api.get<ServiceProblemSuggestion>(
    `/service-problem-suggestions/${id}`,
  );

  return response.data;
}

export async function createServiceProblemSuggestion(
  payload: CreateServiceProblemSuggestionPayload,
) {
  const response = await api.post<ServiceProblemSuggestion>(
    '/service-problem-suggestions',
    payload,
  );

  return response.data;
}

export async function updateServiceProblemSuggestion(
  id: string,
  payload: UpdateServiceProblemSuggestionPayload,
) {
  const response = await api.patch<ServiceProblemSuggestion>(
    `/service-problem-suggestions/${id}`,
    payload,
  );

  return response.data;
}

export async function removeServiceProblemSuggestion(id: string) {
  await api.delete(`/service-problem-suggestions/${id}`);
}
