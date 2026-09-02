import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string, adminOtp?: string) => Promise<void>;
  signup: (email: string, pass: string, fullName?: string, adminOtp?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const token = localStorage.getItem('voiceshield_access_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await authApi.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch (err) {
      console.warn('[Auth] Failed to refresh user session:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string, adminOtp?: string) => {
    const res = await authApi.signin({ email, password: pass, admin_otp: adminOtp });
    if (res.success && res.data) {
      localStorage.setItem('voiceshield_access_token', res.data.tokens.access_token);
      localStorage.setItem('voiceshield_refresh_token', res.data.tokens.refresh_token);
      setUser(res.data.user);
    }
  };

  const signup = async (email: string, pass: string, fullName?: string, adminOtp?: string) => {
    const res = await authApi.signup({ email, password: pass, full_name: fullName, admin_otp: adminOtp });
    if (res.success && res.data) {
      localStorage.setItem('voiceshield_access_token', res.data.tokens.access_token);
      localStorage.setItem('voiceshield_refresh_token', res.data.tokens.refresh_token);
      setUser(res.data.user);
    }
  };

  const logout = () => {
    localStorage.removeItem('voiceshield_access_token');
    localStorage.removeItem('voiceshield_refresh_token');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
