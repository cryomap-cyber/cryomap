import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AuthContext } from './auth-context';
import { api } from '../services/api';
import {
  clearStoredAuth,
  getStoredToken,
  setStoredAuthUser,
  setStoredToken,
} from '../services/auth-storage';
import type { AuthUser, LoginResponse } from '../types/auth';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [token, setToken] = useState<string | null>(() => getStoredToken());

  const [isLoading, setIsLoading] = useState(() => Boolean(getStoredToken()));

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const storedToken = getStoredToken();

    if (!storedToken) {
      return;
    }

    let isMounted = true;

    api
      .get<AuthUser>('/auth/me')
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setUser(response.data);
        setStoredAuthUser(response.data);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        clearStoredAuth();
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (!isMounted) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    setStoredToken(response.data.accessToken);
    setToken(response.data.accessToken);

    const meResponse = await api.get<AuthUser>('/auth/me');

    setUser(meResponse.data);
    setStoredAuthUser(meResponse.data);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout,
    }),
    [user, token, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
