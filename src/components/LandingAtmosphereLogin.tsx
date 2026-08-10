import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Link,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { ZpcLogoMark } from './brand/ZpcLogo';
import { MagicCard } from './MagicCard';
import GoogleSignInButton from './GoogleSignInButton';
import FacebookSignInButton from './FacebookSignInButton';

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

const NIGHT = '#16302A';
const CREAM = '#EBE6D4';

/** Soft mouse-follow field for Atmosphere login. */
const AtmosphereField: React.FC<{
  name: string;
  type?: string;
  placeholder: string;
  value: string;
  disabled?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  /** When true, show eye toggle (for password fields). */
  passwordToggle?: boolean;
}> = ({ name, type = 'text', placeholder, value, disabled, onChange, required, passwordToggle }) => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputType = passwordToggle ? (showPassword ? 'text' : 'password') : type;

  return (
    <Box
      sx={{ width: '100%', position: 'relative' }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Box
        component="input"
        name={name}
        type={inputType}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: 52,
          px: 2,
          pr: passwordToggle ? 5.5 : 2,
          boxSizing: 'border-box',
          borderRadius: '12px',
          border: '1.5px solid rgba(235, 230, 212, 0.28)',
          bgcolor: 'rgba(235,230,212,0.12)',
          fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
          fontSize: 15,
          fontWeight: 500,
          color: CREAM,
          outline: 'none',
          transition: 'background 0.2s ease, box-shadow 0.2s ease',
          '&::placeholder': { color: 'rgba(235,230,212,0.45)', fontWeight: 500 },
          '&:focus': {
            bgcolor: 'rgba(235,230,212,0.16)',
            boxShadow: '0 0 0 3px rgba(235, 230, 212, 0.18)',
            borderColor: 'rgba(235, 230, 212, 0.45)',
          },
          '&:disabled': { opacity: 0.7 },
        }}
      />
      {passwordToggle && (
        <IconButton
          type="button"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          onClick={() => setShowPassword((v) => !v)}
          disabled={disabled}
          size="small"
          sx={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 2,
            color: 'rgba(235,230,212,0.8)',
            '&:hover': { color: CREAM, bgcolor: 'rgba(235,230,212,0.1)' },
          }}
        >
          {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
        </IconButton>
      )}
      {hover && (
        <>
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              pointerEvents: 'none',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              zIndex: 2,
              borderRadius: '12px 12px 0 0',
              overflow: 'hidden',
              background: `radial-gradient(40px circle at ${mouse.x}px 0px, ${CREAM} 0%, transparent 70%)`,
            }}
          />
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              pointerEvents: 'none',
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              zIndex: 2,
              borderRadius: '0 0 12px 12px',
              overflow: 'hidden',
              background: `radial-gradient(40px circle at ${mouse.x}px 2px, ${CREAM} 0%, transparent 70%)`,
            }}
          />
        </>
      )}
    </Box>
  );
};

/**
 * Atmosphere login — flat night + mouse spotlight / field pointer animation.
 */
const LandingAtmosphereLogin: React.FC<Props> = ({
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

  return (
    <Box
      sx={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: 440,
        mx: 'auto',
      }}
    >
      <MagicCard
        gradientSize={300}
        gradientColor="rgba(235, 230, 212, 0.16)"
        gradientOpacity={0.9}
        gradientFrom="#EBE6D4"
        gradientTo="#5F8670"
        bgcolor={NIGHT}
        sx={{
          width: '100%',
          boxShadow: 'none',
          border: '1px solid rgba(235, 230, 212, 0.28)',
        }}
      >
        <Box
          sx={{
            px: { xs: 2.5, sm: 4 },
            py: { xs: 3, sm: 4.5 },
            color: CREAM,
          }}
        >
          <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center' }}>
            <ZpcLogoMark size={160} showTagline animateStroke={false} ink="light" />
          </Box>
          <Typography
            sx={{
              fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
              fontSize: 13,
              fontWeight: 500,
              color: 'rgba(235, 230, 212,0.78)',
              mb: 2.5,
              textAlign: 'center',
            }}
          >
            Sign in to continue your real-estate charcha
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              {successMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={onSubmit} sx={{ display: 'grid', gap: 1.75 }}>
            <Typography
              sx={{
                fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                fontWeight: 700,
                fontSize: { xs: '1.15rem', sm: '1.35rem' },
                color: CREAM,
                textAlign: 'center',
                mb: 0.5,
              }}
            >
              Sign in
            </Typography>

            <AtmosphereField
              name="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={onChange}
              disabled={busy}
              required
            />
            <AtmosphereField
              name="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={onChange}
              disabled={busy}
              required
              passwordToggle
            />

            <Box sx={{ textAlign: 'right' }}>
              <Link
                component="button"
                type="button"
                disabled={busy}
                onClick={onForgotPassword}
                sx={{
                  fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'rgba(235, 230, 212,0.9)',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Forgot your password?
              </Link>
            </Box>

            <Button
              type="submit"
              disabled={busy}
              startIcon={
                loggingIn ? (
                  <CircularProgress size={18} thickness={5} sx={{ color: CREAM }} />
                ) : undefined
              }
              sx={{
                mt: 0.5,
                alignSelf: 'center',
                minWidth: 140,
                fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '12px',
                px: 3,
                py: 1.15,
                bgcolor: '#0F221C',
                color: CREAM,
                border: '1px solid rgba(235,230,212,0.28)',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#0A1C18' },
                '&.Mui-disabled': { bgcolor: '#0F221C', color: CREAM, opacity: 0.85 },
              }}
            >
              {loggingIn ? 'Signing in…' : 'Sign In'}
            </Button>

            {showSocial && (
              <>
                <Divider
                  sx={{
                    my: 0.5,
                    fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                    fontSize: 12,
                    color: 'rgba(235,230,212,0.55)',
                    '&::before, &::after': { borderColor: 'rgba(235,230,212,0.22)' },
                  }}
                >
                  or
                </Divider>
                {onGoogleCredential && (
                  <Box>
                    <GoogleSignInButton
                      text="continue_with"
                      disabled={busy}
                      onCredential={onGoogleCredential}
                    />
                  </Box>
                )}
                {onFacebookAccessToken && (
                  <Box>
                    <FacebookSignInButton
                      disabled={busy}
                      onAccessToken={onFacebookAccessToken}
                    />
                  </Box>
                )}
                {onMobileSignIn && (
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled={busy}
                    onClick={onMobileSignIn}
                    sx={{
                      fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                      textTransform: 'none',
                      borderRadius: '12px',
                      py: 1.25,
                      color: CREAM,
                      borderColor: 'rgba(235,230,212,0.35)',
                      bgcolor: 'rgba(235,230,212,0.08)',
                      '&:hover': {
                        borderColor: 'rgba(235,230,212,0.55)',
                        bgcolor: 'rgba(235,230,212,0.14)',
                      },
                    }}
                  >
                    Continue with mobile number
                  </Button>
                )}
              </>
            )}

            <Box sx={{ textAlign: 'center', mt: 0.5 }}>
              <Typography
                component="span"
                sx={{
                  fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                  fontSize: 13,
                  color: 'rgba(235,230,212,0.78)',
                }}
              >
                Don&apos;t have an account?{' '}
              </Typography>
              <Link
                component="button"
                type="button"
                onClick={onSignUp}
                sx={{
                  fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                  fontSize: 13,
                  fontWeight: 700,
                  color: CREAM,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Sign up
              </Link>
            </Box>
          </Box>
        </Box>
      </MagicCard>
    </Box>
  );
};

export default LandingAtmosphereLogin;
