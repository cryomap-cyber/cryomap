import type { AuthUser } from '../types/auth';

export const TOKEN_STORAGE_KEY = '@cryomap:token';
export const AUTH_USER_STORAGE_KEY = '@cryomap:user';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function getStoredAuthUser() {
  const storedUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return null;
  }
}

export function setStoredAuthUser(user: AuthUser) {
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

export function isCompanyScopedUser() {
  const user = getStoredAuthUser();

  return (
    (user?.role === 'CLIENT_USER' || user?.role === 'TECHNICIAN') &&
    Boolean(user.companyId)
  );
}

export function getScopedUserCompanyId() {
  const user = getStoredAuthUser();

  if (user?.role !== 'CLIENT_USER' && user?.role !== 'TECHNICIAN') {
    return undefined;
  }

  return user.companyId ?? undefined;
}
