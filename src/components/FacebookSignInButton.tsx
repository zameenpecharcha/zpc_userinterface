import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';

interface FacebookSignInButtonProps {
  onAccessToken: (accessToken: string) => void;
  disabled?: boolean;
  /** Show spinner while Facebook auth / backend sign-in is in progress. */
  loading?: boolean;
  label?: string;
  /** Full-width labeled button vs compact circular icon. */
  variant?: 'full' | 'icon';
}

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (options: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: { authResponse?: { accessToken?: string } }) => void,
        options?: { scope?: string }
      ) => void;
    };
  }
}

const FACEBOOK_SCRIPT_ID = 'facebook-jssdk';
const FACEBOOK_SCRIPT_SRC = 'https://connect.facebook.net/en_US/sdk.js';

const loadFacebookScript = (appId: string) =>
  new Promise<void>((resolve, reject) => {
    const initialize = () => {
      if (!window.FB) {
        reject(new Error('Unable to load Facebook sign-in'));
        return;
      }
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: 'v20.0',
      });
      resolve();
    };

    if (window.FB) {
      initialize();
      return;
    }

    window.fbAsyncInit = initialize;

    const existingScript = document.getElementById(FACEBOOK_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', initialize, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Facebook sign-in')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = FACEBOOK_SCRIPT_ID;
    script.src = FACEBOOK_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => reject(new Error('Unable to load Facebook sign-in'));
    document.body.appendChild(script);
  });

const FacebookSignInButton: React.FC<FacebookSignInButtonProps> = ({
  onAccessToken,
  disabled = false,
  loading = false,
  label = 'Continue with Facebook',
  variant = 'full',
}) => {
  const onAccessTokenRef = useRef(onAccessToken);
  const [ready, setReady] = useState(false);
  const [scriptError, setScriptError] = useState('');
  const [awaitingPicker, setAwaitingPicker] = useState(false);
  const appId = process.env.REACT_APP_FACEBOOK_APP_ID;
  const isIcon = variant === 'icon';
  const showLoading = loading || awaitingPicker;

  useEffect(() => {
    onAccessTokenRef.current = onAccessToken;
  }, [onAccessToken]);

  useEffect(() => {
    if (loading) setAwaitingPicker(false);
  }, [loading]);

  useEffect(() => {
    if (!awaitingPicker || loading) return undefined;
    const timer = window.setTimeout(() => setAwaitingPicker(false), 12000);
    return () => window.clearTimeout(timer);
  }, [awaitingPicker, loading]);

  useEffect(() => {
    if (!appId) return;

    let cancelled = false;
    loadFacebookScript(appId)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((error) => {
        if (!cancelled) setScriptError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [appId]);

  const handleClick = () => {
    if (!window.FB) {
      setScriptError('Facebook sign-in is not ready yet');
      return;
    }

    setScriptError('');
    setAwaitingPicker(true);
    window.FB.login(
      (response) => {
        const accessToken = response.authResponse?.accessToken;
        if (accessToken) {
          onAccessTokenRef.current(accessToken);
        } else {
          setAwaitingPicker(false);
          setScriptError('Facebook sign-in was cancelled');
        }
      },
      { scope: 'email,public_profile' }
    );
  };

  const iconButton = (
    <Tooltip title={showLoading ? 'Signing in with Facebook…' : scriptError || 'Continue with Facebook'}>
      <span>
        <IconButton
          disabled={disabled || !ready || showLoading}
          onClick={handleClick}
          aria-label="Continue with Facebook"
          sx={{
            width: 48,
            height: 48,
            bgcolor: '#1877F2',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(24,119,242,0.35)',
            '&:hover': { bgcolor: '#166FE5' },
            '&.Mui-disabled': { bgcolor: '#1877F2', color: '#fff', opacity: showLoading ? 1 : 0.55 },
          }}
        >
          {showLoading ? (
            <CircularProgress size={22} thickness={4} sx={{ color: '#fff' }} />
          ) : (
            <FacebookIcon sx={{ fontSize: 26 }} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );

  if (!appId) {
    if (isIcon) {
      return (
        <Tooltip title="Configure Facebook App ID">
          <span>
            <IconButton disabled sx={{ width: 48, height: 48, bgcolor: '#1877F2', color: '#fff' }}>
              <FacebookIcon />
            </IconButton>
          </span>
        </Tooltip>
      );
    }
    return (
      <Button fullWidth variant="outlined" disabled sx={{ textTransform: 'none', py: 1.25 }}>
        Configure Facebook App ID
      </Button>
    );
  }

  if (isIcon) {
    return iconButton;
  }

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      {showLoading && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            bgcolor: 'rgba(24,119,242,0.92)',
            borderRadius: 1,
          }}
        >
          <CircularProgress size={18} thickness={4} sx={{ color: '#fff' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
            Signing in with Facebook…
          </Typography>
        </Box>
      )}
      <Button
        fullWidth
        variant="outlined"
        disabled={disabled || !ready || showLoading}
        onClick={handleClick}
        sx={{
          textTransform: 'none',
          py: 1.25,
          bgcolor: '#1877F2',
          color: '#fff',
          borderColor: '#1877F2',
          '&:hover': { bgcolor: '#166FE5', borderColor: '#166FE5' },
        }}
      >
        {scriptError || label}
      </Button>
    </Box>
  );
};

export default FacebookSignInButton;
