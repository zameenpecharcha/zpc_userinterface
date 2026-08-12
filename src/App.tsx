import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { CssBaseline, ThemeProvider, createTheme, Grow, Fade } from '@mui/material';
import Register from './components/Register';
import Home from './components/Home';
import Landing from './components/Landing';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Profile from './components/Profile';
import CreateProperty from './components/CreateProperty';
import MyProperties from './components/MyProperties';
import PropertyPage from './components/PropertyPage';
import ChatPage from './components/ChatPage';
import AdminDashboard from './components/admin/AdminDashboard';
import SearchPage from './components/SearchPage';
import client from './apollo-client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { postLoginPath } from './utils/roles';
import { ZPC_COLORS, ZPC_FONTS, ZPC_GLASS, ZPC_RADIUS } from './theme/zpcTheme';
import { ZPC_TRANSITION } from './theme/motion';
import PageEnter from './components/motion/PageEnter';

const theme = createTheme({
  palette: {
    primary: {
      main: ZPC_COLORS.primary,
      dark: ZPC_COLORS.primaryHover,
      contrastText: ZPC_COLORS.primaryContrast,
    },
    secondary: {
      main: ZPC_COLORS.accent,
      contrastText: ZPC_COLORS.accentContrast,
    },
    background: {
      default: ZPC_COLORS.bg,
      paper: ZPC_GLASS.panelStrong,
    },
    text: {
      primary: ZPC_COLORS.text,
      secondary: ZPC_COLORS.textMuted,
    },
    divider: ZPC_COLORS.border,
  },
  shape: {
    borderRadius: ZPC_RADIUS,
  },
  typography: {
    fontFamily: ZPC_FONTS.body,
    h1: { fontFamily: ZPC_FONTS.display, color: ZPC_COLORS.text },
    h2: { fontFamily: ZPC_FONTS.display, color: ZPC_COLORS.text },
    h3: { fontFamily: ZPC_FONTS.display, color: ZPC_COLORS.text },
    h4: { fontFamily: ZPC_FONTS.display, color: ZPC_COLORS.text },
    h5: { fontFamily: ZPC_FONTS.display, color: ZPC_COLORS.text },
    h6: { fontFamily: ZPC_FONTS.display, color: ZPC_COLORS.text },
    body1: { color: ZPC_COLORS.text },
    body2: { color: ZPC_COLORS.textMuted },
    button: { fontFamily: ZPC_FONTS.body, textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          backgroundColor: '#B2DFDB',
        },
        body: {
          backgroundColor: '#B2DFDB',
          color: ZPC_COLORS.text,
        },
      },
    },
    MuiDialog: {
      defaultProps: {
        TransitionComponent: Grow,
        transitionDuration: ZPC_TRANSITION.popup,
      },
      styleOverrides: {
        paper: {
          // Smooth feel even if a Dialog overrides TransitionComponent
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        },
      },
    },
    MuiDrawer: {
      defaultProps: {
        transitionDuration: ZPC_TRANSITION.drawer,
      },
    },
    MuiPopover: {
      defaultProps: {
        TransitionComponent: Fade,
        transitionDuration: ZPC_TRANSITION.popover,
      },
    },
    MuiMenu: {
      defaultProps: {
        TransitionComponent: Fade,
        transitionDuration: ZPC_TRANSITION.popover,
      },
    },
    MuiTooltip: {
      defaultProps: {
        enterDelay: 280,
        leaveDelay: 60,
        TransitionComponent: Fade,
        TransitionProps: { timeout: 140 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: ZPC_GLASS.panelStrong,
          backdropFilter: ZPC_GLASS.blur,
          WebkitBackdropFilter: ZPC_GLASS.blur,
          border: `1px solid ${ZPC_GLASS.border}`,
          boxShadow: '0 8px 24px rgba(10, 18, 16, 0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage:
            'linear-gradient(165deg, rgba(235,230,212,0.42) 0%, rgba(235,230,212,0.28) 100%)',
          backgroundColor: ZPC_GLASS.panel,
          backdropFilter: ZPC_GLASS.blur,
          WebkitBackdropFilter: ZPC_GLASS.blur,
          border: `1px solid ${ZPC_GLASS.border}`,
          boxShadow: '0 10px 28px rgba(10, 18, 16, 0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage:
            'linear-gradient(180deg, rgba(22,48,42,0.42) 0%, rgba(22,48,42,0.22) 55%, rgba(22,48,42,0.28) 100%), linear-gradient(180deg, rgba(235,230,212,0.14) 0%, rgba(235,230,212,0) 42%)',
          backgroundColor: 'rgba(22, 48, 42, 0.32)',
          backdropFilter: 'blur(20px) saturate(1.35)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.35)',
          borderBottom: '1px solid rgba(235,230,212,0.28)',
          boxShadow:
            '0 8px 28px rgba(10, 18, 16, 0.14), inset 0 1px 0 rgba(235,230,212,0.28), inset 0 -1px 0 rgba(10,18,16,0.12)',
          color: ZPC_COLORS.primaryContrast,
          '& .MuiIconButton-root:hover': {
            backgroundColor: 'rgba(235, 230, 212, 0.12)',
          },
          '& .MuiButton-root:hover': {
            backgroundColor: 'rgba(235, 230, 212, 0.12)',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 32,
          borderRadius: 999,
          textTransform: 'none',
          fontWeight: 600,
          color: ZPC_COLORS.textMuted,
          transition: 'background-color 0.2s cubic-bezier(0.22, 1, 0.36, 1), color 0.2s ease',
          '&.Mui-selected': {
            color: ZPC_COLORS.primaryContrast,
            backgroundColor: ZPC_GLASS.tabActive,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 40,
          backgroundColor: ZPC_GLASS.tab,
          backdropFilter: ZPC_GLASS.blurSoft,
          WebkitBackdropFilter: ZPC_GLASS.blurSoft,
          border: `1px solid ${ZPC_GLASS.border}`,
          borderRadius: 999,
          padding: 4,
        },
        indicator: {
          display: 'none',
        },
        flexContainer: {
          transition: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: ZPC_GLASS.inset,
          backdropFilter: ZPC_GLASS.blurSoft,
          border: `1px solid ${ZPC_GLASS.border}`,
          color: ZPC_COLORS.text,
        },
        filled: {
          backgroundColor: ZPC_GLASS.inset,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          boxShadow: '0 6px 16px rgba(22, 48, 42, 0.28)',
          '&:hover': {
            backgroundColor: ZPC_COLORS.primaryHover,
          },
        },
        outlined: {
          borderColor: ZPC_GLASS.borderStrong,
          backgroundColor: ZPC_GLASS.panelSoft,
          backdropFilter: ZPC_GLASS.blurSoft,
          color: ZPC_COLORS.primary,
        },
      },
    },
  },
});

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute: Current state:', {
    loading,
    isAuthenticated,
    pathname: location.pathname
  });

  // Show loading state while auth is being checked
  if (loading) {
    console.log('ProtectedRoute: Showing loading spinner');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#EBE6D4'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #DDD6C0', 
            borderTop: '4px solid #16302A',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#3A4540', fontSize: '14px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, redirecting to /', {
      from: location.pathname
    });
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  console.log('ProtectedRoute: Authenticated, rendering children');
  return <>{children}</>;
};

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#EBE6D4'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #DDD6C0', 
            borderTop: '4px solid #16302A',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#3A4540', fontSize: '14px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={postLoginPath(user)} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#EBE6D4'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #DDD6C0', 
            borderTop: '4px solid #16302A',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#3A4540', fontSize: '14px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (!user || !user.role || !allowedRoles.includes(user.role.toLowerCase())) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#EBE6D4'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#16302A', marginBottom: '16px' }}>Access Denied</h2>
          <p style={{ color: '#3A4540', fontSize: '16px' }}>
            You don't have permission to access this page.
          </p>
          <button 
            onClick={() => window.location.href = '/home'}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#16302A',
              color: '#EBE6D4',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

function AppRoutes() {
  const location = useLocation();
  return (
    <PageEnter enterKey={location.pathname}>
      <Routes location={location}>
      {/* Public Routes */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <Landing />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-property"
        element={
          <RoleProtectedRoute allowedRoles={['agent', 'builder']}>
            <CreateProperty />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/my-properties"
        element={
          <RoleProtectedRoute allowedRoles={['agent', 'builder']}>
            <MyProperties />
          </RoleProtectedRoute>
        }
      />
      <Route
        path="/property/:propertyId"
        element={
          <ProtectedRoute>
            <PropertyPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <SearchPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </RoleProtectedRoute>
        }
      />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageEnter>
  );
}

function App() {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
}

export default App;