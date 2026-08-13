import React, { useState } from 'react';
import { Box, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import GoogleSignInButton from './GoogleSignInButton';
import FacebookSignInButton from './FacebookSignInButton';

type SocialAuthIconsRowProps = {
  disabled?: boolean;
  googleLoading?: boolean;
  facebookLoading?: boolean;
  mobileLoading?: boolean;
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
  googleLoading = false,
  facebookLoading = false,
  mobileLoading = false,
  onGoogleCredential,
  onFacebookAccessToken,
  onMobileSignIn,
  tone = 'dark',
}) => {
  const [mobileOpening, setMobileOpening] = useState(false);
  if (!onGoogleCredential && !onFacebookAccessToken && !onMobileSignIn) return null;

  const mobileBusy = mobileLoading || mobileOpening;
  const anyLoading = googleLoading || facebookLoading || mobileBusy;

  const mobileSx =
    tone === 'dark'
      ? {
          width: 48,
          height: 48,
          color: '#EBE6D4',
          bgcolor: 'rgba(235,230,212,0.12)',
          border: '1px solid rgba(235,230,212,0.35)',
          '&:hover': { bgcolor: 'rgba(235,230,212,0.2)' },
          '&.Mui-disabled': { color: '#EBE6D4', opacity: mobileBusy ? 1 : 0.55 },
        }
      : {
          width: 48,
          height: 48,
          color: '#16302A',
          bgcolor: 'rgba(235,230,212,0.65)',
          border: '1px solid rgba(22,48,42,0.2)',
          '&:hover': { bgcolor: 'rgba(235,230,212,0.9)' },
          '&.Mui-disabled': { color: '#16302A', opacity: mobileBusy ? 1 : 0.55 },
        };

  const statusText = googleLoading
    ? 'Signing in with Google…'
    : facebookLoading
      ? 'Signing in with Facebook…'
      : mobileBusy
        ? mobileLoading
          ? 'Verifying mobile…'
          : 'Opening mobile sign-in…'
        : null;

  return (
    <Box sx={{ width: '100%' }}>
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
            disabled={disabled || facebookLoading || mobileBusy}
            loading={googleLoading}
            onCredential={onGoogleCredential}
          />
        )}
        {onFacebookAccessToken && (
          <FacebookSignInButton
            variant="icon"
            disabled={disabled || googleLoading || mobileBusy}
            loading={facebookLoading}
            onAccessToken={onFacebookAccessToken}
          />
        )}
        {onMobileSignIn && (
          <Tooltip title={mobileBusy ? 'Continuing with mobile…' : 'Continue with mobile number'}>
            <span>
              <IconButton
                disabled={disabled || anyLoading}
                onClick={() => {
                  setMobileOpening(true);
                  onMobileSignIn();
                  window.setTimeout(() => setMobileOpening(false), 500);
                }}
                aria-label="Continue with mobile number"
                sx={mobileSx}
              >
                {mobileBusy ? (
                  <CircularProgress
                    size={22}
                    thickness={4}
                    sx={{ color: tone === 'dark' ? '#EBE6D4' : '#16302A' }}
                  />
                ) : (
                  <PhoneIphoneIcon sx={{ fontSize: 24 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
      {statusText && (
        <Typography
          sx={{
            mt: 1,
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 600,
            color: tone === 'dark' ? 'rgba(235,230,212,0.85)' : '#3A4540',
            fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
          }}
        >
          {statusText}
        </Typography>
      )}
    </Box>
  );
};

export default SocialAuthIconsRow;
