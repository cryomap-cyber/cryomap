import type { AuthUser } from './auth-user.type.js';

export type AuthenticatedRequest = {
  headers: {
    authorization?: string;
  };
  user?: AuthUser;
};
