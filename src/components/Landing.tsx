import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
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
import { useApolloClient } from '@apollo/client';
import { OTPType } from '../types/auth';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    try {
      const response = await authService.login({
        email: formData.email,
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
        const response = await authService.sendOTP({
          email: resetData.email,
          type: OTPType.PASSWORD_RESET,
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
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography
          component="h1"
          variant="h3"
          sx={{ color: '#6366F1', mb: 2, fontWeight: 500 }}
        >
          Zameen pe charcha
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{ color: '#6B7280', mb: 6, textAlign: 'center' }}
        >
          A single platform for all your real needs
        </Typography>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Typography variant="h4" component="h2" sx={{ mb: 4 }}>
            Login to your account
          </Typography>
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
              {successMessage}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
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
              sx={{ mb: 3 }}
              InputProps={{
                sx: {
                  bgcolor: '#F9FAFB',
                  '&:hover': {
                    bgcolor: '#F3F4F6',
                  },
                },
              }}
            />
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
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
              sx={{ mb: 1 }}
              InputProps={{
                sx: {
                  bgcolor: '#F9FAFB',
                  '&:hover': {
                    bgcolor: '#F3F4F6',
                  },
                },
              }}
            />
            <Box sx={{ textAlign: 'right', mb: 3 }}>
              <Link
                component="button"
                type="button"
                onClick={() => setForgotPasswordOpen(true)}
                sx={{ color: '#6366F1', textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </Box>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                bgcolor: '#6366F1',
                py: 1.5,
                mb: 3,
                '&:hover': {
                  bgcolor: '#4F46E5',
                },
              }}
            >
              Login
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body1" display="inline">
                Don't have an account?{' '}
              </Typography>
              <Link
                component="button"
                variant="body1"
                onClick={() => navigate('/register')}
                sx={{ color: '#6366F1', textDecoration: 'none' }}
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
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: 22, color: '#4F46E5', textAlign: 'center', pb: 1 }}>
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
                  bgcolor: '#7C3AED',
                  color: '#fff',
                  fontWeight: 500,
                  mb: 2,
                  mt: 1,
                  '&:hover': { bgcolor: '#6D28D9' },
                }}
                onClick={handleVerifyOTP}
              >
                VERIFY OTP
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
            sx={{ color: '#7C3AED', fontWeight: 500 }}
          >
            CANCEL
          </Button>
          {resetStep === 'email' && (
            <Button
              onClick={handleForgotPassword}
              sx={{ color: '#7C3AED', fontWeight: 500 }}
            >
              SEND OTP
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Landing;