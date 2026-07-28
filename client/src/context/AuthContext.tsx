import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { api, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';


// 1. Define the structure of variables and functions that this Context will provide.
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 2. Create a Provider to manage data handling behavior.
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [loading, setLoading] = useState<boolean>(true);

  // Function to fetch the latest user profile from the `/auth/me` API
  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await api.get<any>('/auth/me');
      if (profile.success) {
        setUser({
          user_id: profile.user_id,
          username: profile.username,
          role_id: profile.role.toUpperCase() as 'ADMIN' | 'NURSE' | 'PATIENT',
          role: profile.role
        });
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Check if the user is already logged in when the app first launches.
  useEffect(() => {
    if (token) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Function to send a login request to FastAPI
  const login = async (username: string, password: string) => {
    try {
      const response = await api.post<any>('/auth/login', { username, password });
      if (response.success && response.token) {
        setAuthToken(response.token);
        setToken(response.token);
      } else {
        throw new Error(response.message || 'การเข้าสู่ระบบล้มเหลว');
      }
    } catch (error: any) {
      throw new Error(error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    }
  };

// Logout function
  const logout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Create a custom hook that other screens can easily use.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
