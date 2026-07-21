import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';
import { gql, useApolloClient, useMutation } from '@apollo/client';
import { OTPType } from '../types/auth';
import LandingBackground from './LandingBackground';
import BackgroundPreviewSwitcher from './BackgroundPreviewSwitcher';
import SceneSimHud from './SceneSimHud';
import {
  BACKGROUND_STORAGE_KEY,
  BackgroundId,
  getBackgroundOption,
  readStoredBackgroundId,
} from '../scene/backgroundRegistry';

const glassFieldSx = {
  mb: 2.5,
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.55)',
    backdropFilter: 'blur(8px)',
    borderRadius: '12px',
    fontFamily: '"DM Sans", sans-serif',
    transition: 'background 0.25s ease, box-shadow 0.25s ease',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
    '&:hover': {
      bgcolor: 'rgba(255,255,255,0.72)',
      '& fieldset': { borderColor: 'rgba(255,255,255,0.55)' },
    },
    '&.Mui-focused': {
      bgcolor: 'rgba(255,255,255,0.85)',
      boxShadow: '0 0 0 3px rgba(30, 58, 72, 0.15)',
      '& fieldset': { borderColor: 'rgba(30, 58, 72, 0.45)' },
    },
  },
  '& .MuiInputBase-input': { color: '#1a2a32' },
};

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
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'email' | 'otp' | 'newPassword'>('email');
  const [resetData, setResetData] = useState({
    email: '',
    otp: '',
    newPassword: '',
  });
  const [bgId, setBgId] = useState<BackgroundId>(() => readStoredBackgroundId());
  const [simSpeed, setSimSpeed] = useState(1);
  const bgOption = useMemo(() => getBackgroundOption(bgId), [bgId]);

  const [login] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      if (data && data.login && data.login.success) {
        localStorage.setItem('token', data.login.token);
        localStorage.setItem('refreshToken', data.login.refreshToken);
        // Optionally store userInfo if needed
        localStorage.setItem('userInfo', JSON.stringify(data.login.userInfo));
        setSuccessMessage(data.login.message);
        navigate('/home');
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
    setError('');
    setSuccessMessage('');
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
        navigate('/home');
      } else {
        setError(response.message || 'Login failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'An error occurred during login');
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
        minHeight: '100vh',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 3 },
        py: { xs: 4, md: 6 },
      }}
    >
      <LandingBackground option={bgOption} simSpeed={simSpeed} />
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background: bgOption.vignette,
          transition: 'background 0.5s ease',
        }}
      />

      <SceneSimHud option={bgOption} simSpeed={simSpeed} onSimSpeed={setSimSpeed} />

      <BackgroundPreviewSwitcher
        value={bgId}
        onChange={(id) => {
          setBgId(id);
          try {
            localStorage.setItem(BACKGROUND_STORAGE_KEY, id);
          } catch {
            /* ignore */
          }
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: { xs: 10, sm: 8 },
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontWeight: 600,
            fontSize: { xs: '2.35rem', sm: '2.85rem' },
            letterSpacing: '0.02em',
            color: bgOption.brandColor,
            textAlign: 'center',
            mb: 0.75,
            textShadow: '0 2px 24px rgba(0,0,0,0.35)',
            lineHeight: 1.1,
            transition: 'color 0.4s ease',
          }}
        >
          Zameen pe charcha
        </Typography>
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.95rem',
            fontWeight: 500,
            color: bgOption.taglineColor,
            mb: 3.5,
            textAlign: 'center',
            textShadow: '0 1px 12px rgba(0,0,0,0.3)',
            transition: 'color 0.4s ease',
          }}
        >
          A single platform for all your real needs
        </Typography>

        <Box
          sx={{
            width: '100%',
            p: { xs: 3, sm: 3.5 },
            borderRadius: '20px',
            background: 'rgba(248, 244, 238, 0.55)',
            backdropFilter: 'blur(22px) saturate(1.35)',
            WebkitBackdropFilter: 'blur(22px) saturate(1.35)',
            border: '1px solid rgba(255,255,255,0.45)',
            boxShadow:
              '0 8px 32px rgba(12, 24, 32, 0.18), inset 0 1px 0 rgba(255,255,255,0.55)',
            transition: 'transform 0.35s ease, box-shadow 0.35s ease',
          }}
        >
          <Typography
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontWeight: 600,
              fontSize: '1.35rem',
              color: '#1a2a32',
              mb: 2.5,
            }}
          >
            Login to your account
          </Typography>
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ width: '100%', mb: 2, borderRadius: 2 }}>
              {successMessage}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Typography sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 600, color: '#2c3e48', mb: 1 }}>
              Email
            </Typography>
            <TextField
              required
              fullWidth
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              sx={glassFieldSx}
            />
            <Typography sx={{ fontFamily: '"DM Sans", sans-serif', fontSize: 13, fontWeight: 600, color: '#2c3e48', mb: 1 }}>
              Password
            </Typography>
            <TextField
              required
              fullWidth
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              sx={{ ...glassFieldSx, mb: 1 }}
            />
            <Box sx={{ textAlign: 'right', mb: 2.5 }}>
              <Link
                component="button"
                type="button"
                onClick={() => setForgotPasswordOpen(true)}
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  color: '#1e3a48',
                  fontWeight: 600,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Forgot password?
              </Link>
            </Box>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontWeight: 600,
                bgcolor: '#1e3a48',
                color: '#f7f3ec',
                py: 1.5,
                mb: 2.5,
                borderRadius: '12px',
                textTransform: 'none',
                fontSize: '1rem',
                boxShadow: '0 8px 24px rgba(30, 58, 72, 0.35)',
                transition: 'background 0.25s ease, transform 0.2s ease',
                '&:hover': { bgcolor: '#162c38', transform: 'translateY(-1px)' },
              }}
            >
              Login
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Typography display="inline" sx={{ fontFamily: '"DM Sans", sans-serif', color: '#3a4f58', fontSize: 14 }}>
                Don't have an account?{' '}
              </Typography>
              <Link
                component="button"
                type="button"
                onClick={() => navigate('/register')}
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  color: '#1e3a48',
                  fontWeight: 700,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Sign up
              </Link>
            </Box>
          </Box>
        </Box>
      </Box>

      <Dialog
        open={forgotPasswordOpen}
        onClose={() => {
          setForgotPasswordOpen(false);
          setResetStep('email');
          setResetData({ email: '', otp: '', newPassword: '' });
          setError('');
          setSuccessMessage('');
        }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: 320,
            boxShadow: 8,
            p: 2,
            textAlign: 'center',
            background: 'rgba(248, 244, 238, 0.92)',
            backdropFilter: 'blur(16px)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 22, color: '#1e3a48', textAlign: 'center', pb: 1, fontFamily: '"DM Sans", sans-serif' }}>
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
              sx={{ mb: 2, bgcolor: '#F9FAFB' }}
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
                sx={{ mb: 2, bgcolor: '#F9FAFB' }}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
              <Button
                fullWidth
                variant="contained"
                sx={{
                  bgcolor: '#1e3a48',
                  color: '#fff',
                  fontWeight: 600,
                  mb: 2,
                  mt: 1,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#162c38' },
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
            sx={{ color: '#1e3a48', fontWeight: 500, textTransform: 'none' }}
          >
            Cancel
          </Button>
          {resetStep === 'email' && (
            <Button
              onClick={handleForgotPassword}
              sx={{ color: '#1e3a48', fontWeight: 600, textTransform: 'none' }}
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