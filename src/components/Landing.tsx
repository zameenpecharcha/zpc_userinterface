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
    }
  }
`;

const SEND_OTP_MUTATION = gql`
  mutation SendOtp($email: String!) {
    sendOtp(email: $email) {
      success
      message
    }
  }
`;

const VERIFY_OTP_MUTATION = gql`
  mutation VerifyOtp($email: String!, $otpCode: String!) {
    verifyOtp(email: $email, otpCode: $otpCode) {
      success
      token
      message
    }
  }
`;

const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword(
    $emailOrPhone: String!
    $otpCode: String!
    $newPassword: String!
  ) {
    resetPassword(
      emailOrPhone: $emailOrPhone
      otpCode: $otpCode
      newPassword: $newPassword
    ) {
      success
      message
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
    client: authClient,
    onCompleted: (data) => {
      if (data.login.success) {
        localStorage.setItem('token', data.login.token);
        localStorage.setItem('refreshToken', data.login.refreshToken);
        setSuccessMessage(data.login.message);
        navigate('/home');
      } else {
        setError(data.login.message);
      }
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const [sendOtp] = useMutation(SEND_OTP_MUTATION, {
    client: authClient,
    onCompleted: (data) => {
      if (data.sendOtp.success) {
        setSuccessMessage(data.sendOtp.message);
        setResetStep('otp');
      } else {
        setError(data.sendOtp.message);
      }
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const [verifyOtp] = useMutation(VERIFY_OTP_MUTATION, {
    client: authClient,
    onCompleted: (data) => {
      if (data.verifyOtp.success) {
        setSuccessMessage(data.verifyOtp.message);
        setResetStep('newPassword');
      } else {
        setError(data.verifyOtp.message);
      }
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const [resetPassword] = useMutation(RESET_PASSWORD_MUTATION, {
    client: authClient,
    onCompleted: (data) => {
      if (data.resetPassword.success) {
        setSuccessMessage(data.resetPassword.message);
        setTimeout(() => {
          setForgotPasswordOpen(false);
          setResetStep('email');
          setResetData({ email: '', otp: '', newPassword: '' });
        }, 2000);
      } else {
        setError(data.resetPassword.message);
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
          variables: { email: resetData.email },
        });
      } else if (resetStep === 'otp') {
        await verifyOtp({
          variables: {
            email: resetData.email,
            otpCode: resetData.otp,
          },
        });
      } else if (resetStep === 'newPassword') {
        await resetPassword({
          variables: {
            emailOrPhone: resetData.email,
            otpCode: resetData.otp,
            newPassword: resetData.newPassword,
          },
        });
      }
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

      {/* Forgot Password Dialog */}
      <Dialog 
        open={forgotPasswordOpen} 
        onClose={() => {
          setForgotPasswordOpen(false);
          setResetStep('email');
          setResetData({ email: '', otp: '', newPassword: '' });
          setError('');
          setSuccessMessage('');
        }}
      >
        <DialogTitle>
          {resetStep === 'email' ? 'Reset Password' : 
           resetStep === 'otp' ? 'Enter OTP' : 
           'Set New Password'}
        </DialogTitle>
        <DialogContent>
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
            />
          )}
          {resetStep === 'otp' && (
            <TextField
              autoFocus
              margin="dense"
              name="otp"
              label="Enter OTP"
              fullWidth
              variant="outlined"
              value={resetData.otp}
              onChange={handleResetDataChange}
              helperText="Please check your email for the OTP"
            />
          )}
          {resetStep === 'newPassword' && (
            <TextField
              autoFocus
              margin="dense"
              name="newPassword"
              label="New Password"
              type="password"
              fullWidth
              variant="outlined"
              value={resetData.newPassword}
              onChange={handleResetDataChange}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setForgotPasswordOpen(false);
              setResetStep('email');
              setResetData({ email: '', otp: '', newPassword: '' });
              setError('');
              setSuccessMessage('');
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleForgotPassword}>
            {resetStep === 'email' ? 'Send OTP' : 
             resetStep === 'otp' ? 'Verify OTP' : 
             'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Landing; 