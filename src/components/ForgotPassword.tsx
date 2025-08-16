import React, { useState } from 'react';
import { Box, Button, Container, TextField, Typography, Link, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useApolloClient } from '@apollo/client';
import { AuthService } from '../services/authService';
import { OTPType } from '../types/auth';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const client = useApolloClient();
  const authService = new AuthService(client);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authService.forgotPassword({
        email,
        type: OTPType.PASSWORD_RESET,
      });

      if (response.success) {
        setSuccess(
          response.message +
          (response.channels ? ` Sent via: ${response.channels.join(', ')}` : '')
        );
        // After success, redirect to reset password page
        setTimeout(() => {
          navigate(`/reset-password?email=${encodeURIComponent(email)}`);
        }, 2000);
      } else {
        setError(response.message || 'Failed to process request');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 10, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Forgot Password
        </Typography>
        <Typography sx={{ mb: 4 }}>
          Enter your email and we'll send you a verification code to reset your password.
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            required
            label="Email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            {loading ? 'Sending...' : 'Send Verification Code'}
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

export default ForgotPassword;