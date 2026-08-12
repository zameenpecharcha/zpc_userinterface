import React, { useCallback } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type Ink = 'light' | 'dark';

type Props = {
  /** `light` = cream icon on dark teal header; `dark` = forest icon on light surfaces */
  ink?: Ink;
  size?: 'small' | 'medium';
  sx?: object;
};

/**
 * Shared header logout control for authenticated app pages.
 */
const HeaderLogoutButton: React.FC<Props> = ({ ink = 'light', size = 'medium', sx }) => {
  const { clearAuth } = useAuth();
  const navigate = useNavigate();

  const onLogout = useCallback(() => {
    clearAuth();
    navigate('/');
  }, [clearAuth, navigate]);

  const light = ink === 'light';

  return (
    <Tooltip title="Logout">
      <IconButton
        size={size}
        onClick={onLogout}
        aria-label="Logout"
        sx={{
          color: light ? '#EBE6D4' : '#16302A',
          flexShrink: 0,
          '&:hover': {
            bgcolor: light ? 'rgba(235,230,212,0.12)' : 'rgba(22,48,42,0.08)',
            color: light ? '#fff' : '#0A1C18',
          },
          ...sx,
        }}
      >
        <LogoutIcon fontSize={size === 'small' ? 'small' : 'medium'} />
      </IconButton>
    </Tooltip>
  );
};

export default HeaderLogoutButton;
