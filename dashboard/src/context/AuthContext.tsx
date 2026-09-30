import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthorityUser } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: AuthorityUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isOperator: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthorityUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('shesecure_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const currentUser = await api.getMe();
        setUser(currentUser);
      } catch {
        localStorage.removeItem('shesecure_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    const result = await api.login(email, password);
    localStorage.setItem('shesecure_token', result.token);
    setToken(result.token);
    setUser(result.user);
  };

  const logout = () => {
    localStorage.removeItem('shesecure_token');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isOperator = user?.role === 'ADMIN' || user?.role === 'OPERATOR';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin, isOperator }}>
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
