import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SocialAuthIconsRow from './SocialAuthIconsRow';
import '../styles/liquidGlass.css';

const VIDEO_SRC = `${process.env.PUBLIC_URL || ''}/media/ZPC_And_caption_also_change_th.mp4`;
const LOGO_SRC = `${process.env.PUBLIC_URL || ''}/logo.svg`;
/** Video watermark: green mask for first N seconds, then solid black cover. */
const WATERMARK_GREEN_MS = 5000;

type Props = {
  email: string;
  password: string;
  error: string;
  successMessage: string;
  loggingIn: boolean;
  googleSigningIn?: boolean;
  facebookSigningIn?: boolean;
  mobileLoading?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
  onSignUp: () => void;
  onGoogleCredential?: (credential: string) => void;
  onFacebookAccessToken?: (accessToken: string) => void;
  onMobileSignIn?: () => void;
};

/**
 * Liquid-glass login — video background + 3D layered glass card.
 */
const LandingLiquidGlassLogin: React.FC<Props> = ({
  email,
  password,
  error,
  successMessage,
  loggingIn,
  googleSigningIn = false,
  facebookSigningIn = false,
  mobileLoading = false,
  onChange,
  onSubmit,
  onForgotPassword,
  onSignUp,
  onGoogleCredential,
  onFacebookAccessToken,
  onMobileSignIn,
}) => {
  const busy = loggingIn || googleSigningIn || facebookSigningIn || mobileLoading;
  const showSocial = Boolean(onGoogleCredential || onFacebookAccessToken || onMobileSignIn);
  const [watermarkCoverBlack, setWatermarkCoverBlack] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setWatermarkCoverBlack(false);
    const t = window.setTimeout(() => setWatermarkCoverBlack(true), WATERMARK_GREEN_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <Box
      className="liquid-glass-page"
      sx={{
        position: 'relative',
        minHeight: { xs: '100dvh', sm: '100vh' },
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 3,
        boxSizing: 'border-box',
      }}
    >
      <Box
        component="video"
        autoPlay
        muted
        playsInline
        preload="auto"
        src={VIDEO_SRC}
        onEnded={(e) => {
          const el = e.currentTarget;
          try {
            const end = Math.max(0, (el.duration || 0) - 0.05);
            el.currentTime = end;
          } catch {
            /* ignore */
          }
          el.pause();
        }}
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background:
            'radial-gradient(80% 70% at 50% 40%, rgba(8,20,16,0.15), rgba(4,10,8,0.45) 70%, rgba(2,6,5,0.62)), linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.28))',
        }}
      />
      <Box
        aria-hidden
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'absolute',
          right: 190,
          bottom: 70,
          zIndex: 5,
          width: { xs: 110, sm: 140 },
          height: { xs: 110, sm: 140 },
          pointerEvents: 'none',
          transition: 'background 0.6s ease, opacity 0.6s ease',
          background: watermarkCoverBlack
            ? 'radial-gradient(circle at 78% 78%, rgba(5,8,12,1) 0%, rgba(5,8,12,1) 42%, rgba(5,8,12,0.92) 58%, rgba(5,8,12,0.55) 72%, transparent 85%)'
            : 'radial-gradient(circle at 78% 78%, rgba(34,120,72,0.95) 0%, rgba(34,120,72,0.75) 38%, rgba(34,120,72,0.35) 58%, transparent 85%)',
        }}
      />

      <Box className="lg-stack" sx={{ zIndex: 10 }}>
        <Box className="lg-stack-layer lg-stack-layer--back" aria-hidden />
        <Box className="lg-stack-layer lg-stack-layer--mid" aria-hidden />

        <Box
          component="form"
          onSubmit={onSubmit}
          className="liquid-glass-login"
          sx={{
            width: '100%',
            borderRadius: '1.75rem',
            p: { xs: 2.75, sm: 3.25 },
            bgcolor: 'transparent',
          }}
        >
          <Box className="lg-login-sheen" aria-hidden />
          <Box className="lg-login-content" sx={{ display: 'grid', gap: 1.4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: 2.5,
                  display: 'grid',
                  placeItems: 'center',
                  background:
                    'linear-gradient(160deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04))',
                  border: '1px solid rgba(255,255,255,0.28)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.4), 0 10px 24px rgba(0,0,0,0.25)',
                }}
              >
                <Box
                  component="img"
                  src={LOGO_SRC}
                  alt="ZPC"
                  sx={{ width: 46, height: 46, objectFit: 'contain' }}
                />
              </Box>
              <Typography
                sx={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '1.55rem',
                  letterSpacing: '0.14em',
                  color: '#fff',
                  textShadow: '0 2px 16px rgba(0,0,0,0.35)',
                }}
              >
                ZPC
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.62)',
                  textAlign: 'center',
                  lineHeight: 1.4,
                  maxWidth: 280,
                }}
              >
                Sign in to continue your real estate search
              </Typography>
            </Box>

            {error && (
              <Alert
                severity="error"
                sx={{
                  borderRadius: 999,
                  py: 0.25,
                  bgcolor: 'rgba(255, 236, 239, 0.92)',
                  border: '1px solid rgba(244,63,94,0.25)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                }}
              >
                {error}
              </Alert>
            )}
            {successMessage && (
              <Alert
                severity="success"
                sx={{
                  borderRadius: 999,
                  py: 0.25,
                  bgcolor: 'rgba(236, 253, 245, 0.92)',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}
              >
                {successMessage}
              </Alert>
            )}

            <Typography
              component="h1"
              sx={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 600,
                fontSize: { xs: '1.65rem', sm: '1.85rem' },
                letterSpacing: '-0.02em',
                color: '#fff',
                textAlign: 'center',
                mt: 0.25,
                textShadow: '0 2px 18px rgba(0,0,0,0.3)',
              }}
            >
              Sign in
            </Typography>

            <input
              className="lg-field"
              name="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={onChange}
              disabled={busy}
              required
              autoComplete="email"
            />
            <Box sx={{ position: 'relative', width: '100%' }}>
              <input
                className="lg-field"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={onChange}
                disabled={busy}
                required
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <IconButton
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                disabled={busy}
                size="small"
                sx={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255,255,255,0.78)',
                  zIndex: 2,
                  '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            </Box>

            <Box sx={{ textAlign: 'right', mt: -0.25 }}>
              <Link
                component="button"
                type="button"
                disabled={busy}
                onClick={onForgotPassword}
                sx={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.72)',
                  textDecoration: 'none',
                  '&:hover': { color: '#fff' },
                }}
              >
                Forgot your password?
              </Link>
            </Box>

            <Button
              type="submit"
              disabled={busy}
              className="liquid-glass lg-interactive lg-cta"
              fullWidth
              sx={{
                mt: 0.35,
                py: 1.2,
                borderRadius: 999,
                textTransform: 'none',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 14,
                color: '#fff',
              }}
            >
              {loggingIn ? (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  Signing in…
                  <CircularProgress size={16} sx={{ color: '#fff' }} />
                </Box>
              ) : (
                'Sign In'
              )}
            </Button>

            {showSocial && (
              <>
                <Box className="lg-divider" sx={{ my: 0.35 }}>
                  or
                </Box>
                <SocialAuthIconsRow
                  disabled={busy}
                  googleLoading={googleSigningIn}
                  facebookLoading={facebookSigningIn}
                  mobileLoading={mobileLoading}
                  tone="dark"
                  onGoogleCredential={onGoogleCredential}
                  onFacebookAccessToken={onFacebookAccessToken}
                  onMobileSignIn={onMobileSignIn}
                />
              </>
            )}

            <Box sx={{ textAlign: 'center', mt: 0.35 }}>
              <Typography
                component="span"
                sx={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                Don&apos;t have an account?{' '}
              </Typography>
              <Link
                component="button"
                type="button"
                onClick={onSignUp}
                sx={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.92)',
                  textDecoration: 'none',
                  '&:hover': { color: '#fff' },
                }}
              >
                Sign up
              </Link>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LandingLiquidGlassLogin;
