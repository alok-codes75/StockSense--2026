import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  isManager: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('stocksense_token');
    const storedUser = localStorage.getItem('stocksense_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify with backend
        api.get('/auth/me')
          .then(res => {
            if (res.user) {
              setUser(res.user);
              localStorage.setItem('stocksense_user', JSON.stringify(res.user));
            }
          })
          .catch(() => {
            // Token expired or invalid
            localStorage.removeItem('stocksense_token');
            localStorage.removeItem('stocksense_user');
            setToken(null);
            setUser(null);
          })
          .finally(() => setIsLoading(false));
      } catch (e) {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }

    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('stocksense_token', newToken);
    localStorage.setItem('stocksense_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('stocksense_token');
    localStorage.removeItem('stocksense_user');
  };

  const updateUser = (updated: Partial<User>) => {
    if (!user) return;
    const merged = { ...user, ...updated };
    setUser(merged);
    localStorage.setItem('stocksense_user', JSON.stringify(merged));
  };

  const isManager = user?.role === 'INVENTORY_MANAGER';
  const isStaff = user?.role === 'WAREHOUSE_STAFF';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        updateUser,
        isManager,
        isStaff
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
