import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { User, LoginDto, RegisterPatientDto, AuthResponse } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginDto) => Promise<User>;
  registerPatient: (data: RegisterPatientDto) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('curaone_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    localStorage.removeItem('curaone_token');
    setToken(null);
    setUser(null);
  }, []);

  // Fetch current user profile on app start if token exists
  useEffect(() => {
    let isMounted = true;

    async function loadUserProfile() {
      const storedToken = localStorage.getItem('curaone_token');
      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const response = await api.get<User>('/auth/me');
        if (isMounted) {
          setUser(response.data);
          setToken(storedToken);
        }
      } catch (err) {
        console.warn('Failed to load profile with existing token:', err);
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUserProfile();

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('curaone:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('curaone:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const login = async (credentials: LoginDto): Promise<User> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    const { token: receivedToken, user: receivedUser } = response.data;

    localStorage.setItem('curaone_token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);

    return receivedUser;
  };

  const registerPatient = async (data: RegisterPatientDto): Promise<User> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    const { token: receivedToken, user: receivedUser } = response.data;

    localStorage.setItem('curaone_token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);

    return receivedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        registerPatient,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
