import React, { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
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
import authClient from '../auth-client';

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

  const [resetPassword] = useMutation(RESET_PASSWORD_MUTATION, {
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
      await login({
        variables: {
          email: formData.email,
          password: formData.password,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccessMessage('');
    try {
      if (resetStep === 'email') {
        await sendOtp({
          variables: { email: resetData.email, type: 'PASSWORD_RESET' },
        });
        // After sending OTP, show OTP input (handled by sendOtp onCompleted)
      }
      // For OTP step, verifyOtp is triggered only when user clicks VERIFY OTP
      // For newPassword step, resetPassword is triggered only when user clicks RESET PASSWORD (if implemented)
    } catch (err: any) {
      console.error('Error:', err);
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
                onClick={() => navigate('/forgot-password')}
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

      {/* Forgot Password Dialog - Styled to match your screenshot */}
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
                sx={{ bgcolor: '#7C3AED', color: '#fff', fontWeight: 500, mb: 2, mt: 1, '&:hover': { bgcolor: '#6D28D9' } }}
                onClick={async () => {
                  setError('');
                  setSuccessMessage('');
                  try {
                    await verifyOtp({
                      variables: {
                        email: resetData.email,
                        otpCode: resetData.otp,
                        type: 'PASSWORD_RESET',
                      },
                    });
                  } catch (err: any) {
                    setError(err.message);
                  }
                }}
              >
                VERIFY OTP
              </Button>
            </>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}
          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>
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
          {/* VERIFY OTP button is now inside the OTP input above */}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Landing; 