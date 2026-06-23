import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserInfo } from '../types/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserInfo | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  setAuth: (token: string, refreshToken: string, user: UserInfo) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
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
  const [loading, setLoading] = useState(true); // Start with loading true

  useEffect(() => {
    console.log('AuthProvider: Starting auth restoration...');
    
    // Try to restore auth state from localStorage (support both 'user' and legacy 'userInfo')
    const storedToken = localStorage.getItem('token');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user') || localStorage.getItem('userInfo');
    
    console.log('AuthProvider: Found stored data:', {
      hasToken: !!storedToken,
      hasRefreshToken: !!storedRefreshToken,
      hasUser: !!storedUser,
      token: storedToken?.substring(0, 20) + '...',
      user: storedUser?.substring(0, 50) + '...'
    });
    
    if (storedToken && storedRefreshToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setRefreshToken(storedRefreshToken);
        setUser(parsedUser);
        setIsAuthenticated(true);
        console.log('AuthProvider: Auth state restored successfully:', { 
          isAuthenticated: true, 
          userId: parsedUser.id,
          userEmail: parsedUser.email
        });
      } catch (error) {
        console.error('AuthProvider: Error parsing stored user data:', error);
        clearAuth();
      }
    } else {
      console.log('AuthProvider: No complete auth data found, clearing auth');
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      setRefreshToken(null);
    }
    
    console.log('AuthProvider: Setting loading to false');
    setLoading(false);
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
    console.log('AuthProvider: Clearing auth state');
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
        loading,
        setAuth,
        clearAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};