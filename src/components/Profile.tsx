import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApolloClient } from '@apollo/client';
import { UserService } from '../services/userService';
import ProfilePage from './ProfilePage';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

interface ProfileProps {}

const Profile: React.FC<ProfileProps> = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, token, loading: authLoading } = useAuth();
  const client = useApolloClient();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAuth = async () => {
      console.log('Profile component auth check', {
        authLoading,
        isAuthenticated,
        hasUser: !!user,
        hasToken: !!token,
        user,
        token,
        storedToken: localStorage.getItem('token'),
        storedUser: localStorage.getItem('user')
      });

      // Wait for auth loading to complete before checking authentication
      if (authLoading) {
        console.log('Auth still loading, waiting...');
        return;
      }

      if (!isAuthenticated || !user || !token) {
        console.log('Not authenticated after loading complete, redirecting to login');
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        // Test the auth token by making a request
        const userService = new UserService(client);
        await userService.getUserProfile(user.id);
        setLoading(false);
      } catch (err) {
        console.error('Error checking auth:', err);
        setError('Authentication failed. Please log in again.');
        navigate('/');
      }
    };

    checkAuth();
  }, [authLoading, isAuthenticated, user, token, client, navigate]);

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        p: 3
      }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Box
          component="button"
          onClick={() => navigate('/')}
          sx={{
            bgcolor: '#6366F1',
            color: '#fff',
            px: 2,
            py: 1,
            borderRadius: 1,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Go to Login
        </Box>
      </Box>
    );
  }

  if (loading || !isAuthenticated || !user) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading profile...</Typography>
      </Box>
    );
  }

  return (
    <ProfilePage 
      userId={user.id} 
      currentUserId={user.id} 
      onGoBack={() => navigate('/home')} 
    />
  );
};

export default Profile;