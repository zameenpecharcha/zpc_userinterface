import React from 'react';
import { useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProfilePage from './ProfilePage';
import { Box, CircularProgress, Typography } from '@mui/material';
import { PAGE_ATMOSPHERE } from '../theme/surfaces';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId: userIdParam } = useParams<{ userId?: string }>();
  const { user, isAuthenticated } = useAuth();

  const viewedId = String(userIdParam || user?.id || '').trim();
  const focusPostId = (location.state as { focusPostId?: string | number } | null)?.focusPostId;

  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  if (!viewedId) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          ...PAGE_ATMOSPHERE,
        }}
      >
        <CircularProgress sx={{ color: '#16302A' }} />
        <Typography sx={{ mt: 2, color: '#374151' }}>Loading profile...</Typography>
      </Box>
    );
  }

  return (
    <ProfilePage
      userId={viewedId}
      currentUserId={String(user.id)}
      onGoBack={() => navigate('/home')}
      onOpenProfile={(uid, nextFocus) =>
        navigate(`/profile/${uid}`, {
          state: nextFocus != null ? { focusPostId: String(nextFocus) } : undefined,
        })
      }
      focusPostId={focusPostId != null ? String(focusPostId) : null}
      onFocusPostConsumed={() => navigate(`/profile/${viewedId}`, { replace: true, state: {} })}
      onOpenChat={(roomId) =>
        navigate('/home', { state: { openChat: true, autoSelectRoomId: roomId } })
      }
    />
  );
};

export default Profile;
