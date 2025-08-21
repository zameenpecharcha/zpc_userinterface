import React, { useState, useEffect } from 'react';
import { Box, Button, Container, TextField, Typography, Link, Alert } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApolloClient } from '@apollo/client';
import { AuthService } from '../services/authService';
import { OTPType } from '../types/auth';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const client = useApolloClient();
  const authService = new AuthService(client);

  const [formData, setFormData] = useState({
    email: '',
    otpCode: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get email from URL params
    const params = new URLSearchParams(location.search);
    const email = params.get('email');
    if (email) {
      setFormData(prev => ({ ...prev, email }));
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.resetPassword({
        email: formData.email,
        otpCode: formData.otpCode,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      if (response.success) {
        setSuccess(response.message || 'Password reset successful');
        // After success, redirect to login page
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setError(response.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 10, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Reset Password
        </Typography>
        <Typography sx={{ mb: 4 }}>
          Enter the verification code sent to your email and your new password.
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            required
            label="Email"
            name="email"
            type="email"
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
          <TextField
            fullWidth
            required
            label="Verification Code"
            name="otpCode"
            value={formData.otpCode}
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
          <TextField
            fullWidth
            required
            label="New Password"
            name="newPassword"
            type="password"
            value={formData.newPassword}
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
          <TextField
            fullWidth
            required
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
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
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              bgcolor: '#7C3AED',
              color: '#fff',
              py: 1.5,
              mb: 2,
              '&:hover': {
                bgcolor: '#6D28D9',
              },
            }}
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/')}
          sx={{ color: '#6366F1', textDecoration: 'none', mt: 2 }}
        >
          Back to Login
        </Link>
      </Box>
    </Container>
  );
};

export default ResetPassword;
