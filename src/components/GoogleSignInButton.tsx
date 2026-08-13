import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';

type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with';

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  disabled?: boolean;
  /** Show spinner while Google auth / backend sign-in is in progress. */
  loading?: boolean;
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
            cancel_on_tap_outside?: boolean;
            auto_select?: boolean;
            /** Prefer classic OAuth button flow over FedCM when available. */
            use_fedcm_for_prompt?: boolean;
            error_callback?: (error: { type?: string; message?: string } | string) => void;
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
/** Max time to wait for Google account picker before clearing local spinner. */
const PICKER_TIMEOUT_MS = 8000;

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

const blurActiveIfInside = (root: HTMLElement | null) => {
  const active = document.activeElement;
  if (active instanceof HTMLElement && root?.contains(active)) {
    active.blur();
  }
};

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onCredential,
  disabled = false,
  loading = false,
  text = 'continue_with',
  variant = 'full',
}) => {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onCredentialRef = useRef(onCredential);
  const [scriptError, setScriptError] = useState('');
  const [pickerError, setPickerError] = useState('');
  /** True briefly after user opens Google UI until parent `loading` takes over, cancel, or timeout. */
  const [awaitingPicker, setAwaitingPicker] = useState(false);
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const isIcon = variant === 'icon';
  const showLoading = loading || awaitingPicker;

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (loading) {
      setAwaitingPicker(false);
      setPickerError('');
      blurActiveIfInside(hostRef.current);
    }
  }, [loading]);

  // If Google never returns a credential after the callback started our local wait, clear it.
  useEffect(() => {
    if (!awaitingPicker || loading) return undefined;

    const timer = window.setTimeout(() => {
      setAwaitingPicker(false);
      blurActiveIfInside(hostRef.current);
      setPickerError(
        'Google sign-in did not complete. Add http://localhost:3000 to Authorized JavaScript origins for your Google OAuth client.'
      );
    }, PICKER_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [awaitingPicker, loading]);

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;
        buttonRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: clientId,
          auto_select: false,
          cancel_on_tap_outside: true,
          // Avoid FedCM path that often fails with "origin not allowed" for local/dev.
          use_fedcm_for_prompt: false,
          callback: (response) => {
            if (response.credential) {
              setPickerError('');
              setAwaitingPicker(true);
              onCredentialRef.current(response.credential);
            } else {
              setAwaitingPicker(false);
              setPickerError('Google did not return a sign-in credential. Please try again.');
            }
          },
          error_callback: (err) => {
            setAwaitingPicker(false);
            const msg =
              typeof err === 'string'
                ? err
                : err?.message || err?.type || 'Google sign-in failed';
            setPickerError(String(msg));
            blurActiveIfInside(hostRef.current);
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
    // Do NOT put aria-hidden on the GIS host while its iframe can receive focus (browser warning + stuck UX).
    return (
      <Box ref={hostRef} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Tooltip title={showLoading ? 'Signing in with Google…' : 'Continue with Google'}>
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
              opacity: disabled && !showLoading ? 0.55 : 1,
              pointerEvents: disabled || showLoading ? 'none' : 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {showLoading ? (
              <CircularProgress size={22} thickness={4} sx={{ color: '#4285F4' }} />
            ) : (
              <GoogleGIcon size={22} />
            )}
            <Box
              ref={buttonRef}
              // Visually hide GIS chrome; never aria-hide while iframe can hold focus.
              sx={{
                position: 'absolute',
                inset: 0,
                opacity: showLoading ? 0 : 0.02,
                pointerEvents: showLoading ? 'none' : 'auto',
                cursor: 'pointer',
                overflow: 'hidden',
                ...(showLoading ? { visibility: 'hidden' as const } : {}),
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
        {pickerError ? (
          <Typography
            sx={{
              mt: 1,
              maxWidth: 280,
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: '#B42318',
              lineHeight: 1.35,
            }}
          >
            {pickerError}
          </Typography>
        ) : null}
      </Box>
    );
  }

  return (
    <Box
      ref={hostRef}
      sx={{
        width: '100%',
        position: 'relative',
        opacity: disabled && !showLoading ? 0.6 : 1,
        pointerEvents: disabled || showLoading ? 'none' : 'auto',
        '& > div': { width: '100% !important' },
        '& iframe': { width: '100% !important' },
      }}
    >
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
            bgcolor: 'rgba(255,255,255,0.92)',
            borderRadius: 1,
            border: '1px solid rgba(0,0,0,0.12)',
          }}
        >
          <CircularProgress size={18} thickness={4} sx={{ color: '#4285F4' }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#3A4540' }}>
            Signing in with Google…
          </Typography>
        </Box>
      )}
      <Box
        ref={buttonRef}
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          ...(showLoading ? { visibility: 'hidden' as const } : {}),
        }}
      />
      {pickerError ? (
        <Typography sx={{ mt: 1, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#B42318' }}>
          {pickerError}
        </Typography>
      ) : null}
    </Box>
  );
};

export default GoogleSignInButton;
