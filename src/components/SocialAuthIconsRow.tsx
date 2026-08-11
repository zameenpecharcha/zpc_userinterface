import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import GoogleSignInButton from './GoogleSignInButton';
import FacebookSignInButton from './FacebookSignInButton';

type SocialAuthIconsRowProps = {
  disabled?: boolean;
  onGoogleCredential?: (credential: string) => void;
  onFacebookAccessToken?: (accessToken: string) => void;
  onMobileSignIn?: () => void;
  /** Atmosphere (cream on dark) vs default light styling for the mobile icon. */
  tone?: 'dark' | 'light';
};

/**
 * One-line social auth: Google · Facebook · Mobile as circular icons.
 */
const SocialAuthIconsRow: React.FC<SocialAuthIconsRowProps> = ({
  disabled = false,
  onGoogleCredential,
  onFacebookAccessToken,
  onMobileSignIn,
  tone = 'dark',
}) => {
  if (!onGoogleCredential && !onFacebookAccessToken && !onMobileSignIn) return null;

  const mobileSx =
    tone === 'dark'
      ? {
          width: 48,
          height: 48,
          color: '#EBE6D4',
          bgcolor: 'rgba(235,230,212,0.12)',
          border: '1px solid rgba(235,230,212,0.35)',
          '&:hover': { bgcolor: 'rgba(235,230,212,0.2)' },
          '&.Mui-disabled': { color: '#EBE6D4', opacity: 0.55 },
        }
      : {
          width: 48,
          height: 48,
          color: '#16302A',
          bgcolor: 'rgba(235,230,212,0.65)',
          border: '1px solid rgba(22,48,42,0.2)',
          '&:hover': { bgcolor: 'rgba(235,230,212,0.9)' },
          '&.Mui-disabled': { color: '#16302A', opacity: 0.55 },
        };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.75,
        width: '100%',
        py: 0.25,
      }}
    >
      {onGoogleCredential && (
        <GoogleSignInButton
          variant="icon"
          disabled={disabled}
          onCredential={onGoogleCredential}
        />
      )}
      {onFacebookAccessToken && (
        <FacebookSignInButton
          variant="icon"
          disabled={disabled}
          onAccessToken={onFacebookAccessToken}
        />
      )}
      {onMobileSignIn && (
        <Tooltip title="Continue with mobile number">
          <span>
            <IconButton
              disabled={disabled}
              onClick={onMobileSignIn}
              aria-label="Continue with mobile number"
              sx={mobileSx}
            >
              <PhoneIphoneIcon sx={{ fontSize: 24 }} />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
};

export default SocialAuthIconsRow;
