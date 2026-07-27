import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';

type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with';

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  disabled?: boolean;
  text?: GoogleButtonText;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              type?: 'standard' | 'icon';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: GoogleButtonText;
              width?: string | number;
            }
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = 'google-identity-services-script';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

const loadGoogleScript = () =>
  new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Google sign-in')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Google sign-in'));
    document.head.appendChild(script);
  });

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onCredential,
  disabled = false,
  text = 'continue_with',
}) => {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const onCredentialRef = useRef(onCredential);
  const [scriptError, setScriptError] = useState('');
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;
        buttonRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              onCredentialRef.current(response.credential);
            }
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text,
          width: '100%',
        });
      })
      .catch((error) => {
        if (!cancelled) setScriptError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, text]);

  if (!clientId) {
    return (
      <Button fullWidth variant="outlined" disabled sx={{ textTransform: 'none', py: 1.25 }}>
        Configure Google Client ID
      </Button>
    );
  }

  if (scriptError) {
    return (
      <Typography variant="body2" color="error" sx={{ textAlign: 'center' }}>
        {scriptError}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        '& > div': { width: '100% !important' },
        '& iframe': { width: '100% !important' },
      }}
    >
      <Box ref={buttonRef} sx={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
    </Box>
  );
};

export default GoogleSignInButton;
