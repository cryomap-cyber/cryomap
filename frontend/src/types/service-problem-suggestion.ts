export type ServiceProblemSuggestion = {
  id: string;
  title: string;
  normalizedTitle: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};
