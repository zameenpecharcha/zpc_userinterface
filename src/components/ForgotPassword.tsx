import React, { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { Box, Button, Container, TextField, Typography, Link, Alert } from '@mui/material';

const SEND_OTP_MUTATION = gql`
  mutation SendVerificationOTP($email: String!, $type: OTPType!) {
    sendOtp(email: $email, type: $type) {
      success
      message
      channels
    }
  }
`;

const ForgotPassword = ({ onBackToLogin }: { onBackToLogin: () => void }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [sendOtp, { loading }] = useMutation(SEND_OTP_MUTATION, {
    onCompleted: (data) => {
      if (data.sendOtp.success) {
        setSuccess(data.sendOtp.message);
        setError('');
      } else {
        setError(data.sendOtp.message);
        setSuccess('');
      }
    },
    onError: (err) => {
      setError(err.message);
      setSuccess('');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    await sendOtp({ variables: { email, type: 'PASSWORD_RESET' } });
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 10, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ mb: 2 }}>Forgot Password</Typography>
        <Typography sx={{ mb: 4 }}>
          Enter your email or phone number and we'll send you a verification code to reset your password.
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            required
            label="Email or Phone Number"
            placeholder="Enter your email or phone number"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ bgcolor: '#7C3AED', color: '#fff', py: 1.5, mb: 2 }}
            disabled={loading}
          >
            Send Verification Code
          </Button>
        </form>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <Link
          component="button"
          variant="body2"
          onClick={onBackToLogin}
          sx={{ color: '#6366F1', textDecoration: 'none', mt: 2 }}
        >
          Back to Login
        </Link>
      </Box>
    </Container>
  );
};

export default ForgotPassword;
