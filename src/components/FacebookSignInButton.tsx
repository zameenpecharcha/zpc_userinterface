import React, { useEffect, useRef, useState } from 'react';
import { Button, IconButton, Tooltip, Typography } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';

interface FacebookSignInButtonProps {
  onAccessToken: (accessToken: string) => void;
  disabled?: boolean;
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
  label = 'Continue with Facebook',
  variant = 'full',
}) => {
  const onAccessTokenRef = useRef(onAccessToken);
  const [ready, setReady] = useState(false);
  const [scriptError, setScriptError] = useState('');
  const appId = process.env.REACT_APP_FACEBOOK_APP_ID;
  const isIcon = variant === 'icon';

  useEffect(() => {
    onAccessTokenRef.current = onAccessToken;
  }, [onAccessToken]);

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

    window.FB.login(
      (response) => {
        const accessToken = response.authResponse?.accessToken;
        if (accessToken) {
          onAccessTokenRef.current(accessToken);
        } else {
          setScriptError('Facebook sign-in was cancelled');
        }
      },
      { scope: 'email,public_profile' }
    );
  };

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

  if (scriptError && isIcon) {
    return (
      <Tooltip title={scriptError}>
        <span>
          <IconButton
            disabled={disabled || !ready}
            onClick={handleClick}
            sx={{
              width: 48,
              height: 48,
              bgcolor: '#1877F2',
              color: '#fff',
              opacity: 0.7,
              '&:hover': { bgcolor: '#166FE5' },
            }}
            aria-label="Continue with Facebook"
          >
            <FacebookIcon />
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  if (isIcon) {
    return (
      <Tooltip title="Continue with Facebook">
        <span>
          <IconButton
            disabled={disabled || !ready}
            onClick={handleClick}
            aria-label="Continue with Facebook"
            sx={{
              width: 48,
              height: 48,
              bgcolor: '#1877F2',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(24,119,242,0.35)',
              '&:hover': { bgcolor: '#166FE5' },
              '&.Mui-disabled': { bgcolor: '#1877F2', color: '#fff', opacity: 0.55 },
            }}
          >
            <FacebookIcon sx={{ fontSize: 26 }} />
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  return (
    <Button
      fullWidth
      variant="outlined"
      disabled={disabled || !ready}
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
  );
};

export default FacebookSignInButton;
