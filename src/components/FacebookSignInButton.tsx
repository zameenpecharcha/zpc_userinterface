import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@mui/material';

interface FacebookSignInButtonProps {
  onAccessToken: (accessToken: string) => void;
  disabled?: boolean;
  label?: string;
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
}) => {
  const onAccessTokenRef = useRef(onAccessToken);
  const [ready, setReady] = useState(false);
  const [scriptError, setScriptError] = useState('');
  const appId = process.env.REACT_APP_FACEBOOK_APP_ID;

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
    return (
      <Button fullWidth variant="outlined" disabled sx={{ textTransform: 'none', py: 1.25 }}>
        Configure Facebook App ID
      </Button>
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
