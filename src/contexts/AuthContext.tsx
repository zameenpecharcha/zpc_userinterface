import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserInfo } from '../types/auth';

const LOGOUT_QUERY =
  'mutation Logout($token: String!, $refreshToken: String) { logout(token: $token, refreshToken: $refreshToken) { success message } }';

function logoutGraphqlUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api/v1/graphql`;
  }
  return process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:8080/api/v1/graphql';
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserInfo | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  setAuth: (token: string, refreshToken: string, user: UserInfo) => void;
  updateUser: (partial: Partial<UserInfo>) => void;
  clearAuth: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  setAuth: () => {},
  updateUser: () => {},
  clearAuth: () => {},
  logout: async () => {},
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
        if (parsedUser?.id != null) {
          parsedUser.id = String(parsedUser.id);
        }
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
    const normalizedUser = { ...newUser, id: String(newUser.id) };
    console.log('Setting auth state:', { token: newToken, user: newUser });
    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    // Write to both keys for compatibility
    const userString = JSON.stringify(normalizedUser);
    localStorage.setItem('user', userString);
    localStorage.setItem('userInfo', userString);
    
    setToken(newToken);
    setRefreshToken(newRefreshToken);
    setUser(normalizedUser);
    setIsAuthenticated(true);
  };

  const updateUser = (partial: Partial<UserInfo>) => {
    setUser((prev) => {
      const base = prev || (() => {
        try {
          const raw = localStorage.getItem('user') || localStorage.getItem('userInfo');
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();
      if (!base) return prev;
      const next = { ...base, ...partial, id: String(partial.id ?? base.id) };
      const userString = JSON.stringify(next);
      localStorage.setItem('user', userString);
      localStorage.setItem('userInfo', userString);
      try {
        window.dispatchEvent(new CustomEvent('zpc:user-photos-updated', { detail: next }));
      } catch {
        /* ignore */
      }
      return next;
    });
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

  const logout = async () => {
    const access = localStorage.getItem('token') || token;
    const refresh = localStorage.getItem('refreshToken') || refreshToken;
    if (!access) {
      console.warn('AuthProvider: Logout skipped — no access token in storage or memory');
      clearAuth();
      return;
    }
    const payload = JSON.stringify({
      operationName: 'Logout',
      query: LOGOUT_QUERY,
      variables: { token: access, refreshToken: refresh || null },
    });
    const url = logoutGraphqlUrl();
    try {
      console.info('AuthProvider: sending Logout mutation', url);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
        credentials: 'omit',
        cache: 'no-store',
      });
      if (!res.ok) {
        console.error('AuthProvider: Logout HTTP', res.status);
      }
    } catch (error) {
      console.error('AuthProvider: Logout API failed', error);
    } finally {
      clearAuth();
    }
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
        updateUser,
        clearAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};