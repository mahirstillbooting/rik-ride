import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthStorage } from './AuthStorage';
import { env } from '../config/env';
import { UserRole, DriverOperatingMode } from '../navigation/roleConfig';
import { locationApiService } from '../services/locationService';

export type AuthState =
  | 'unauthenticated'
  | 'authenticated'
  | 'pending_approval'
  | 'account_suspended'
  | 'account_disabled'
  | 'loading';

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: UserRole;
  driverMode?: DriverOperatingMode;
  accountStatus: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'DISABLED';
}

interface AuthContextType {
  authState: AuthState;
  user: UserProfile | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  seedDevAccounts: () => Promise<{ success: boolean; defaultPassword?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const savedToken = await AuthStorage.getToken();
      const savedUser = (await AuthStorage.getUser()) as unknown as UserProfile | null;

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);

        if (savedUser.accountStatus === 'PENDING') {
          setAuthState('pending_approval');
        } else if (savedUser.accountStatus === 'SUSPENDED') {
          setAuthState('account_suspended');
        } else if (savedUser.accountStatus === 'DISABLED' || savedUser.accountStatus === 'REJECTED') {
          setAuthState('account_disabled');
        } else {
          setAuthState('authenticated');
        }
      } else {
        setAuthState('unauthenticated');
      }
    } catch (e) {
      console.error('[AuthContext] Restore session error:', e);
      setAuthState('unauthenticated');
    }
  };

  const login = async (identifier: string, password: string) => {
    try {
      const response = await fetch(`${env.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.accountStatus === 'PENDING') {
          setAuthState('pending_approval');
        } else if (data.accountStatus === 'SUSPENDED') {
          setAuthState('account_suspended');
        } else if (data.accountStatus === 'DISABLED' || data.accountStatus === 'REJECTED') {
          setAuthState('account_disabled');
        }
        return { success: false, error: data.error || 'Authentication failed' };
      }

      const authToken = data.token;
      const userProfile: UserProfile = {
        id: data.user._id || data.user.id,
        phone: data.user.phone,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        driverMode: data.user.driverMode,
        accountStatus: data.user.accountStatus,
      };

      await AuthStorage.saveToken(authToken);
      await AuthStorage.saveUser(userProfile as unknown as Record<string, unknown>);

      setToken(authToken);
      setUser(userProfile);
      setAuthState('authenticated');

      return { success: true };
    } catch (e) {
      console.error('[AuthContext] Login fetch error:', e);
      return { success: false, error: 'Network error or backend unreachable' };
    }
  };

  const logout = async () => {
    try {
      if (user?.role === 'DRIVER') {
        await locationApiService.stopSharing();
      }
    } catch {}
    await AuthStorage.clearSession();
    setToken(null);
    setUser(null);
    setAuthState('unauthenticated');
  };

  const seedDevAccounts = async () => {
    try {
      const response = await fetch(`${env.apiUrl}/api/auth/seed-dev`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      return { success: data.success, defaultPassword: data.defaultPassword };
    } catch (e) {
      return { success: false };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        user,
        token,
        login,
        logout,
        seedDevAccounts,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
