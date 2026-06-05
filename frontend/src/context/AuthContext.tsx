import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@/types/auth';
import {
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  apiClient,
} from '@/services/api';
import { login as loginApi } from '@/services/auth.service';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeTokenPayload(token: string): Partial<User> | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.userId ?? payload.sub,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await apiClient<User>('/users/profile');
      setUser(profile);
    } catch (err) {
      // Only clear auth on actual 401 (expired/invalid token)
      if (err instanceof Error && 'status' in err && (err as any).status === 401) {
        clearStoredToken();
        setToken(null);
        setUser(null);
      }
      // For network errors or other failures, keep the token-decoded user
      // so the user isn't randomly logged out
    }
  }, []);

  useEffect(() => {
    const storedToken = getStoredToken();
    if (storedToken) {
      const decoded = decodeTokenPayload(storedToken);
      if (decoded && decoded.id && decoded.role) {
        setToken(storedToken);
        // Set minimal user from JWT immediately so we don't flash logout
        setUser({ id: decoded.id, name: '', email: '', role: decoded.role } as User);
        // Then try to fetch full profile
        fetchProfile().finally(() => setIsLoading(false));
      } else {
        clearStoredToken();
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginApi(email, password);
    setStoredToken(response.token);
    setToken(response.token);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    // Clear all cached queries so stale data from previous user doesn't persist
    queryClient.clear();
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
