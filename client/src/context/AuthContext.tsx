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
  nidNumber?: string;
  dateOfBirth?: string;
  nidStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  city?: string;
  cityCode?: string;
  area?: string;
  address?: string;
  profileImage?: string;
  rejectionReason?: string;
  rejectionDate?: string;
  nidFrontDocumentRef?: string;
  nidBackDocumentRef?: string;
}

interface AuthContextType {
  authState: AuthState;
  user: UserProfile | null;
  token: string | null;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  seedDevAccounts: () => Promise<{ success: boolean; defaultPassword?: string }>;
  refreshUser: () => Promise<void>;
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
      console.error('[AuthContext] Session restore error:', e);
      setAuthState('unauthenticated');
    }
  };

  const refreshUser = async () => {
    try {
      const savedToken = token || (await AuthStorage.getToken());
      if (!savedToken) return;

      const res = await fetch(`${env.apiUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      });
      const data = await res.json();
      if (data.success && data.user) {
        const u = data.user as UserProfile;
        setUser(u);
        await AuthStorage.saveUser(u as any);
      }
    } catch (e) {
      console.error('[AuthContext] refreshUser error:', e);
    }
  };

  const login = async (identifier: string, password: string) => {
    try {
      setAuthState('loading');
      const res = await fetch(`${env.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!data.success || !data.token || !data.user) {
        setAuthState('unauthenticated');
        return { success: false, error: data.error || 'Authentication failed' };
      }

      const u = data.user as UserProfile;
      await AuthStorage.saveToken(data.token);
      await AuthStorage.saveUser(u as any);

      setToken(data.token);
      setUser(u);

      if (u.accountStatus === 'PENDING') {
        setAuthState('pending_approval');
      } else if (u.accountStatus === 'SUSPENDED') {
        setAuthState('account_suspended');
      } else if (u.accountStatus === 'DISABLED' || u.accountStatus === 'REJECTED') {
        setAuthState('account_disabled');
      } else {
        setAuthState('authenticated');
      }

      return { success: true };
    } catch (e) {
      setAuthState('unauthenticated');
      return { success: false, error: 'Network error connecting to auth server' };
    }
  };

  const logout = async () => {
    try {
      if (user?.role === 'DRIVER') {
        await locationApiService.stopSharing();
      }
    } catch (e) {
      console.warn('[AuthContext] Error stopping location tracking during logout:', e);
    } finally {
      await AuthStorage.clearSession();
      setToken(null);
      setUser(null);
      setAuthState('unauthenticated');
    }
  };

  const seedDevAccounts = async () => {
    try {
      const res = await fetch(`${env.apiUrl}/api/auth/seed-dev`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!data.success) {
        return { success: false, error: data.error };
      }
      return { success: true, defaultPassword: data.defaultPassword };
    } catch (e) {
      return { success: false, error: 'Network error trying to seed dev accounts' };
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
        refreshUser,
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
