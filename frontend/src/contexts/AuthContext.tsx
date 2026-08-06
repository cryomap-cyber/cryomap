import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AuthContext } from './auth-context';
import { api } from '../services/api';
import type { AuthUser, LoginResponse } from '../types/auth';

type AuthProviderProps = {
  children: ReactNode;
};

const TOKEN_STORAGE_KEY = '@cryomap:token';

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY),
  );

  const [isLoading, setIsLoading] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)),
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

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
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        localStorage.removeItem(TOKEN_STORAGE_KEY);
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

    localStorage.setItem(TOKEN_STORAGE_KEY, response.data.accessToken);
    setToken(response.data.accessToken);

    const meResponse = await api.get<AuthUser>('/auth/me');

    setUser(meResponse.data);
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
