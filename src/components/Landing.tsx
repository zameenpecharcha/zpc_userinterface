import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';
import { gql, useApolloClient, useMutation } from '@apollo/client';
import { OTPType } from '../types/auth';
import LandingAtmosphereLogin from './LandingAtmosphereLogin';
import LandingLiquidGlassLogin from './LandingLiquidGlassLogin';
import { COUNTRY_CODES } from '../constants/countryCodes';
import { postLoginPath } from '../utils/roles';

const LOGIN_LAYOUT_KEY = 'zpc_login_layout';
type LoginLayoutId = 'atmosphere' | 'liquid-glass';

function readStoredLoginLayout(): LoginLayoutId {
  try {
    const v = localStorage.getItem(LOGIN_LAYOUT_KEY);
    if (v === 'atmosphere' || v === 'liquid-glass') return v;
  } catch {
    /* ignore */
  }
  return 'atmosphere';
}

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      success
      token
      refreshToken
      message
      userInfo {
        id
        firstName
        lastName
        email
        phone
        profilePhoto
        role
        address
        latitude
        longitude
        bio
        isactive
        emailVerified
        phoneVerified
        createdAt
      }
    }
  }
`;

const SEND_OTP_MUTATION = gql`
  mutation SendVerificationOTP($email: String!, $type: OTPType!) {
    sendOtp(email: $email, type: $type) {
      success
      message
      channels
    }
  }
`;

const VERIFY_OTP_MUTATION = gql`
  mutation VerifyPasswordResetOTP($email: String!, $otpCode: String!, $type: OTPType!) {
    verifyOtp(email: $email, otpCode: $otpCode, type: $type) {
      success
      message
      userInfo {
        email
        emailVerified
      }
    }
  }
`;

const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($email: String!, $otpCode: String!, $newPassword: String!, $confirmPassword: String!) {
    resetPassword(email: $email, otpCode: $otpCode, newPassword: $newPassword, confirmPassword: $confirmPassword) {
      success
      message
      userInfo {
        email
        emailVerified
      }
    }
  }
`;

const Landing = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const client = useApolloClient();
  const authService = new AuthService(client);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [facebookSigningIn, setFacebookSigningIn] = useState(false);
  const [mobileSignInOpen, setMobileSignInOpen] = useState(false);
  const [mobileStep, setMobileStep] = useState<'phone' | 'otp'>('phone');
  const [mobileData, setMobileData] = useState({ countryCode: '+91', phone: '', otp: '' });
  const [mobileLoading, setMobileLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'newPassword'>('email');
  const [resetData, setResetData] = useState({
    email: '',
    otp: '',
    newPassword: '',
  });
  const [loginLayout, setLoginLayout] = useState<LoginLayoutId>(() => readStoredLoginLayout());
  const isAtmosphere = loginLayout === 'atmosphere';

  const setLayout = (id: LoginLayoutId) => {
    setLoginLayout(id);
    try {
      localStorage.setItem(LOGIN_LAYOUT_KEY, id);
    } catch {
      /* ignore */
    }
  };

  const [login] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      if (data && data.login && data.login.success) {
        localStorage.setItem('token', data.login.token);
        localStorage.setItem('refreshToken', data.login.refreshToken);
        // Optionally store userInfo if needed
        localStorage.setItem('userInfo', JSON.stringify(data.login.userInfo));
        setSuccessMessage(data.login.message);
        navigate(postLoginPath(data.login.userInfo));
      } else {
        setError(data?.login?.message || 'Login failed. Please try again.');
      }
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const [sendOtp] = useMutation(SEND_OTP_MUTATION, {
    onCompleted: (data) => {
      if (data && data.sendOtp && data.sendOtp.success) {
        setSuccessMessage(data.sendOtp.message + ' Channels: ' + (data.sendOtp.channels ? data.sendOtp.channels.join(', ') : ''));
        // Delay showing OTP input so user sees the success message, then show OTP input
        setTimeout(() => {
          setSuccessMessage('');
          setResetStep('otp');
        }, 1200);
        setForgotPasswordOpen(true); // Ensure dialog stays open
      } else {
        setError(data?.sendOtp?.message || 'OTP request failed.');
      }
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const [verifyOtp] = useMutation(VERIFY_OTP_MUTATION, {
    onCompleted: (data) => {
      if (data && data.verifyOtp && data.verifyOtp.success) {
        setSuccessMessage(data.verifyOtp.message + (data.verifyOtp.userInfo ? ` (Email: ${data.verifyOtp.userInfo.email}, Verified: ${data.verifyOtp.userInfo.emailVerified})` : ''));
        // Navigate to reset password page with email and otp in query params
        navigate(`/forgot-password?step=reset&email=${encodeURIComponent(resetData.email)}&otp=${encodeURIComponent(resetData.otp)}`);
      } else {
        setError(data?.verifyOtp?.message || 'OTP verification failed.');
      }
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const [resetPassword] = useMutation(RESET_PASSWORD_MUTATION, { // eslint-disable-line @typescript-eslint/no-unused-vars
    onCompleted: (data) => {
      if (data && data.resetPassword && data.resetPassword.success) {
        setSuccessMessage(data.resetPassword.message + (data.resetPassword.userInfo ? ` (Email: ${data.resetPassword.userInfo.email}, Verified: ${data.resetPassword.userInfo.emailVerified})` : ''));
        // Navigate to home page after successful password reset
        setTimeout(() => {
          navigate('/home');
          setForgotPasswordOpen(false);
          setResetStep('email');
          setResetData({ email: '', otp: '', newPassword: '' });
        }, 2000);
      } else {
        setError(data?.resetPassword?.message || 'Password reset failed.');
      }
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loggingIn) return;
    setError('');
    setSuccessMessage('');
    setLoggingIn(true);
    try {
      const response = await authService.login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (response.success && response.token && response.userInfo) {
        setAuth(
          response.token,
          response.refreshToken || '',
          response.userInfo
        );
        setSuccessMessage(response.message || 'Login successful');
        navigate(postLoginPath(response.userInfo));
      } else {
        setError(response.message || 'Login failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    if (googleSigningIn) return;
    setError('');
    setSuccessMessage('');
    setGoogleSigningIn(true);
    try {
      const response = await authService.googleSignIn({ idToken: credential });

      if (response.success && response.token && response.userInfo) {
        setAuth(
          response.token,
          response.refreshToken || '',
          response.userInfo
        );
        setSuccessMessage(response.message || 'Google sign-in successful');
        navigate('/home');
      } else {
        setError(response.message || 'Google sign-in failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'An error occurred during Google sign-in');
    } finally {
      setGoogleSigningIn(false);
    }
  };

  const handleFacebookAccessToken = async (accessToken: string) => {
    if (facebookSigningIn) return;
    setError('');
    setSuccessMessage('');
    setFacebookSigningIn(true);
    try {
      const response = await authService.facebookSignIn({ accessToken });

      if (response.success && response.token && response.userInfo) {
        setAuth(
          response.token,
          response.refreshToken || '',
          response.userInfo
        );
        setSuccessMessage(response.message || 'Facebook sign-in successful');
        navigate('/home');
      } else {
        setError(response.message || 'Facebook sign-in failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Facebook sign-in error:', err);
      setError(err.message || 'An error occurred during Facebook sign-in');
    } finally {
      setFacebookSigningIn(false);
    }
  };

  const handleSendMobileOTP = async () => {
    setError('');
    setSuccessMessage('');
    setMobileLoading(true);
    try {
      const response = await authService.sendMobileOTP({
        phone: `${mobileData.countryCode}${mobileData.phone.replace(/\D/g, '')}`,
      });
      if (response.success) {
        setSuccessMessage(response.message || 'OTP sent to your mobile number');
        setMobileStep('otp');
      } else {
        setError(response.message || 'Failed to send mobile OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send mobile OTP');
    } finally {
      setMobileLoading(false);
    }
  };

  const handleVerifyMobileOTP = async () => {
    setError('');
    setSuccessMessage('');
    setMobileLoading(true);
    try {
      const response = await authService.verifyMobileOTP({
        phone: `${mobileData.countryCode}${mobileData.phone.replace(/\D/g, '')}`,
        otpCode: mobileData.otp.trim(),
      });

      if (response.success && response.token && response.userInfo) {
        setAuth(
          response.token,
          response.refreshToken || '',
          response.userInfo
        );
        setSuccessMessage(response.message || 'Mobile sign-in successful');
        setMobileSignInOpen(false);
        setMobileStep('phone');
        setMobileData({ countryCode: '+91', phone: '', otp: '' });
        navigate('/home');
      } else {
        setError(response.message || 'Invalid mobile OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify mobile OTP');
    } finally {
      setMobileLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccessMessage('');
    try {
      if (resetStep === 'email') {
        const response = await authService.forgotPassword({
          email: resetData.email,
        });

        if (response.success) {
          setSuccessMessage(
            response.message +
            ' Channels: ' +
            (response.channels ? response.channels.join(', ') : '')
          );
          setTimeout(() => {
            setSuccessMessage('');
            setResetStep('otp');
          }, 1200);
        } else {
          setError(response.message || 'Failed to send OTP');
        }
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    setSuccessMessage('');
    try {
      const response = await authService.verifyOTP({
        email: resetData.email,
        otpCode: resetData.otp,
        type: OTPType.PASSWORD_RESET,
      });

      if (response.success) {
        setSuccessMessage(
          response.message +
          (response.userInfo
            ? ` (Email: ${response.userInfo.email}, Verified: ${response.userInfo.emailVerified})`
            : '')
        );
        navigate(
          `/forgot-password?step=reset&email=${encodeURIComponent(
            resetData.email
          )}&otp=${encodeURIComponent(resetData.otp)}`
        );
      } else {
        setError(response.message || 'OTP verification failed');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleResetDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResetData({
      ...resetData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: { xs: '100dvh', sm: '100vh' },
        width: '100%',
        maxWidth: '100vw',
        overflow: isAtmosphere ? 'auto' : 'hidden',
        boxSizing: 'border-box',
        ...(isAtmosphere
          ? {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: { xs: 2, sm: 3 },
              pt: {
                xs: 'max(20px, env(safe-area-inset-top))',
                sm: 4,
                md: 6,
              },
              pb: {
                xs: 'max(24px, env(safe-area-inset-bottom))',
                sm: 6,
                md: 6,
              },
              bgcolor: '#16302A',
              backgroundColor: '#16302A',
              backgroundImage: 'none',
            }
          : { bgcolor: '#000' }),
      }}
    >
      {/* Layout toggle: Atmosphere vs Liquid Glass */}
      <Box
        sx={{
          position: 'fixed',
          top: { xs: 'max(10px, env(safe-area-inset-top))', sm: 16 },
          right: { xs: 12, sm: 18 },
          zIndex: 40,
          display: 'flex',
          gap: 0.5,
          p: 0.4,
          borderRadius: 999,
          bgcolor: isAtmosphere ? 'rgba(22, 48, 42, 0.9)' : 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
        }}
      >
        {(
          [
            { id: 'atmosphere' as const, label: 'Atmosphere' },
            { id: 'liquid-glass' as const, label: 'Liquid Glass' },
          ] as const
        ).map((opt) => {
          const active = loginLayout === opt.id;
          return (
            <Button
              key={opt.id}
              size="small"
              onClick={() => setLayout(opt.id)}
              sx={{
                textTransform: 'none',
                fontFamily: isAtmosphere
                  ? '"Source Serif 4", "Source Serif Pro", Georgia, serif'
                  : '"Poppins", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: 12,
                px: 1.5,
                py: 0.55,
                minWidth: 0,
                borderRadius: 999,
                color: active
                  ? isAtmosphere
                    ? '#16302A'
                    : '#0A0A0A'
                  : 'rgba(255,255,255,0.85)',
                bgcolor: active ? '#EBE6D4' : 'transparent',
                '&:hover': {
                  bgcolor: active ? '#EBE6D4' : 'rgba(255,255,255,0.12)',
                },
              }}
            >
              {opt.label}
            </Button>
          );
        })}
      </Box>

      {isAtmosphere ? (
        <LandingAtmosphereLogin
          email={formData.email}
          password={formData.password}
          error={error}
          successMessage={successMessage}
          loggingIn={loggingIn}
          googleSigningIn={googleSigningIn}
          facebookSigningIn={facebookSigningIn}
          mobileLoading={mobileLoading}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onForgotPassword={() => setForgotPasswordOpen(true)}
          onSignUp={() => navigate('/register')}
          onGoogleCredential={handleGoogleCredential}
          onFacebookAccessToken={handleFacebookAccessToken}
          onMobileSignIn={() => setMobileSignInOpen(true)}
        />
      ) : (
        <LandingLiquidGlassLogin
          email={formData.email}
          password={formData.password}
          error={error}
          successMessage={successMessage}
          loggingIn={loggingIn}
          googleSigningIn={googleSigningIn}
          facebookSigningIn={facebookSigningIn}
          mobileLoading={mobileLoading}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onForgotPassword={() => setForgotPasswordOpen(true)}
          onSignUp={() => navigate('/register')}
          onGoogleCredential={handleGoogleCredential}
          onFacebookAccessToken={handleFacebookAccessToken}
          onMobileSignIn={() => setMobileSignInOpen(true)}
        />
      )}

      <Dialog
        open={mobileSignInOpen}
        fullWidth
        maxWidth="xs"
        onClose={() => {
          setMobileSignInOpen(false);
          setMobileStep('phone');
          setMobileData({ countryCode: '+91', phone: '', otp: '' });
          setError('');
          setSuccessMessage('');
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: '#1e3a48', fontFamily: '"DM Sans", sans-serif' }}>
          Continue with mobile number
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              select
              margin="dense"
              label="Code"
              value={mobileData.countryCode}
              disabled={mobileStep === 'otp' || mobileLoading}
              onChange={(e) => setMobileData((prev) => ({ ...prev, countryCode: e.target.value }))}
              sx={{ width: 150 }}
            >
              {COUNTRY_CODES.map((country) => (
                <MenuItem key={country.code} value={country.code}>
                  {country.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              autoFocus
              margin="dense"
              label="Mobile number"
              fullWidth
              value={mobileData.phone}
              disabled={mobileStep === 'otp' || mobileLoading}
              onChange={(e) => setMobileData((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
              placeholder="7675023613"
            />
          </Box>
          {mobileStep === 'otp' && (
            <TextField
              margin="dense"
              label="OTP"
              fullWidth
              value={mobileData.otp}
              disabled={mobileLoading}
              onChange={(e) => setMobileData((prev) => ({ ...prev, otp: e.target.value }))}
              placeholder="Enter OTP"
              sx={{ mb: 2 }}
            />
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => {
              setMobileSignInOpen(false);
              setMobileStep('phone');
              setMobileData({ countryCode: '+91', phone: '', otp: '' });
              setError('');
              setSuccessMessage('');
            }}
            disabled={mobileLoading}
          >
            Cancel
          </Button>
          {mobileStep === 'phone' ? (
            <Button
              onClick={handleSendMobileOTP}
              disabled={mobileLoading || !mobileData.phone.trim()}
              startIcon={mobileLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {mobileLoading ? 'Sending OTP…' : 'Send OTP'}
            </Button>
          ) : (
            <Button
              onClick={handleVerifyMobileOTP}
              disabled={mobileLoading || !mobileData.otp.trim()}
              startIcon={mobileLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {mobileLoading ? 'Verifying…' : 'Verify OTP'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={forgotPasswordOpen}
        fullWidth
        maxWidth="xs"
        onClose={() => {
          setForgotPasswordOpen(false);
          setResetStep('email');
          setResetData({ email: '', otp: '', newPassword: '' });
          setError('');
          setSuccessMessage('');
        }}
        PaperProps={{
          sx: {
            borderRadius: { xs: 2, sm: 3 },
            m: { xs: 1.5, sm: 2 },
            width: { xs: 'calc(100% - 24px)', sm: 'auto' },
            maxWidth: { xs: 'calc(100% - 24px)', sm: 400 },
            boxShadow: 8,
            p: { xs: 1, sm: 2 },
            textAlign: 'center',
            background: 'rgba(248, 244, 238, 0.92)',
            backdropFilter: 'blur(16px)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 22, color: '#16302A', textAlign: 'center', pb: 1, fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif' }}>
          Reset Password
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          {resetStep === 'email' && (
            <TextField
              autoFocus
              margin="dense"
              name="email"
              label="Email"
              type="email"
              fullWidth
              variant="outlined"
              value={resetData.email}
              onChange={handleResetDataChange}
              sx={{ mb: 2, bgcolor: '#EBE6D4' }}
              InputProps={{ sx: { borderRadius: 2 } }}
            />
          )}
          {resetStep === 'otp' && (
            <>
              <TextField
                autoFocus
                margin="dense"
                name="otp"
                label="Enter OTP"
                type="text"
                fullWidth
                variant="outlined"
                value={resetData.otp}
                onChange={handleResetDataChange}
                sx={{ mb: 2, bgcolor: '#EBE6D4' }}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
              <Button
                fullWidth
                variant="contained"
                sx={{
                  bgcolor: '#16302A',
                  color: '#EBE6D4',
                  fontWeight: 600,
                  mb: 2,
                  mt: 1,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#0F221C' },
                }}
                onClick={handleVerifyOTP}
              >
                Verify OTP
              </Button>
            </>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            onClick={() => {
              setForgotPasswordOpen(false);
              setResetStep('email');
              setResetData({ email: '', otp: '', newPassword: '' });
              setError('');
              setSuccessMessage('');
            }}
            sx={{ color: '#16302A', fontWeight: 500, textTransform: 'none' }}
          >
            Cancel
          </Button>
          {resetStep === 'email' && (
            <Button
              onClick={handleForgotPassword}
              sx={{ color: '#16302A', fontWeight: 600, textTransform: 'none' }}
            >
              Send OTP
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Landing;
