import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';

type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with';

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  disabled?: boolean;
  text?: GoogleButtonText;
  /** Full-width labeled Google button vs compact circular icon. */
  variant?: 'full' | 'icon';
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

/** Official multicolor Google "G" mark — always visible (GIS iframe often clips in small circles). */
const GoogleGIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <Box
    component="svg"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    sx={{ width: size, height: size, display: 'block' }}
    aria-hidden
  >
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
    <path fill="none" d="M0 0h48v48H0z" />
  </Box>
);

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
  variant = 'full',
}) => {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const onCredentialRef = useRef(onCredential);
  const [scriptError, setScriptError] = useState('');
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const isIcon = variant === 'icon';

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
        window.google.accounts.id.renderButton(
          buttonRef.current,
          isIcon
            ? {
                type: 'icon',
                shape: 'circle',
                size: 'large',
                theme: 'outline',
              }
            : {
                theme: 'outline',
                size: 'large',
                type: 'standard',
                shape: 'rectangular',
                text,
                width: '100%',
              }
        );
      })
      .catch((error) => {
        if (!cancelled) setScriptError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, text, isIcon]);

  if (!clientId) {
    return (
      <Tooltip title="Configure Google Client ID">
        <span>
          <IconButton
            disabled
            size="large"
            aria-label="Continue with Google"
            sx={{
              width: 48,
              height: 48,
              bgcolor: '#fff',
              border: '1px solid rgba(0,0,0,0.12)',
            }}
          >
            <GoogleGIcon />
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  if (scriptError) {
    return (
      <Typography variant="body2" color="error" sx={{ textAlign: 'center', fontSize: 11 }}>
        {scriptError}
      </Typography>
    );
  }

  if (isIcon) {
    // Always paint our Google "G"; GIS button sits transparent on top for the real click/login.
    return (
      <Tooltip title="Continue with Google">
        <Box
          sx={{
            position: 'relative',
            width: 48,
            height: 48,
            borderRadius: '50%',
            overflow: 'hidden',
            bgcolor: '#fff',
            border: '1px solid rgba(0,0,0,0.12)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            opacity: disabled ? 0.55 : 1,
            pointerEvents: disabled ? 'none' : 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <GoogleGIcon size={22} />
          <Box
            ref={buttonRef}
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0.02,
              cursor: 'pointer',
              overflow: 'hidden',
              '& > div': {
                width: '100% !important',
                height: '100% !important',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              },
              '& iframe': {
                width: '48px !important',
                height: '48px !important',
                minWidth: '48px !important',
              },
            }}
          />
        </Box>
      </Tooltip>
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
