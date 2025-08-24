import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserInfo } from '../types/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserInfo | null;
  token: string | null;
  refreshToken: string | null ;
  setAuth: (token: string, refreshToken: string, user: UserInfo) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  setAuth: () => {},
  clearAuth: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    // Try to restore auth state from localStorage (support both 'user' and legacy 'userInfo')
    const storedToken = localStorage.getItem('token');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user') || localStorage.getItem('userInfo');
    
    if (storedToken && storedRefreshToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setRefreshToken(storedRefreshToken);
        setUser(parsedUser);
        setIsAuthenticated(true);
        console.log('Auth state restored:', { token: storedToken, user: parsedUser });
      } catch (error) {
        console.error('Error restoring auth state:', error);
        clearAuth();
      }
    } else {
      console.log('No stored auth state found');
      clearAuth();
    }
  }, []); // Empty dependency array means this runs once on mount

  const setAuth = (newToken: string, newRefreshToken: string, newUser: UserInfo) => {
    console.log('Setting auth state:', { token: newToken, user: newUser });
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    // Write to both keys for compatibility
    const userString = JSON.stringify(newUser);
    localStorage.setItem('user', userString);
    localStorage.setItem('userInfo', userString);
    
    setToken(newToken);
    setRefreshToken(newRefreshToken);
    setUser(newUser);
    setIsAuthenticated(true);
  };

  const clearAuth = () => {
    console.log('Clearing auth state');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userInfo');
    
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        refreshToken,
        setAuth,
        clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};