import React, { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { Box, Button, Container, TextField, Typography, Link, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';

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

const ForgotPasswordPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'newPassword'>('email');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const [sendOtp, { loading }] = useMutation(SEND_OTP_MUTATION, {
    onCompleted: (data) => {
      if (data.sendOtp.success) {
        setSuccess(data.sendOtp.message);
        setError('');
        setTimeout(() => {
          setSuccess('');
          setStep('otp');
        }, 1200);
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

  const [verifyOtp, { loading: loadingVerify }] = useMutation(VERIFY_OTP_MUTATION, {
    onCompleted: (data) => {
      if (data.verifyOtp.success) {
        setSuccess(data.verifyOtp.message);
        setError('');
        setTimeout(() => {
          setSuccess('');
          setStep('newPassword');
        }, 1200);
      } else {
        setError(data.verifyOtp.message);
        setSuccess('');
      }
    },
    onError: (err) => {
      setError(err.message);
      setSuccess('');
    },
  });

  const [resetPassword, { loading: loadingReset }] = useMutation(RESET_PASSWORD_MUTATION, {
    onCompleted: (data) => {
      if (data.resetPassword.success) {
        setSuccess(data.resetPassword.message);
        setError('');
        setTimeout(() => {
          navigate('/home');
        }, 1200);
      } else {
        setError(data.resetPassword.message);
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
        <Typography variant="h4" sx={{ mb: 2, color: '#4F46E5', fontWeight: 700 }}>Forgot Password</Typography>
        <Typography sx={{ mb: 4, color: '#374151' }}>
          Enter your email or phone number and we'll send you a verification code to reset your password.
        </Typography>
        {step === 'email' && (
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              required
              label="Email or Phone Number"
              placeholder="Enter your email or phone number"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 3, bgcolor: '#F9FAFB', borderRadius: 2 }}
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ bgcolor: '#7C3AED', color: '#fff', py: 1.5, mb: 2, fontWeight: 600, fontSize: 16, borderRadius: 2 }}
              disabled={loading}
            >
              Send Verification Code
            </Button>
          </form>
        )}
        {step === 'otp' && (
          <Box>
            <TextField
              fullWidth
              required
              label="Enter OTP"
              placeholder="Enter the OTP you received"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              sx={{ mb: 3, bgcolor: '#F9FAFB', borderRadius: 2 }}
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            <Button
              fullWidth
              variant="contained"
              sx={{ bgcolor: '#7C3AED', color: '#fff', py: 1.5, mb: 2, fontWeight: 600, fontSize: 16, borderRadius: 2 }}
              disabled={loadingVerify}
              onClick={async () => {
                setError('');
                setSuccess('');
                await verifyOtp({ variables: { email, otpCode: otp, type: 'PASSWORD_RESET' } });
              }}
            >
              Verify OTP
            </Button>
          </Box>
        )}
        {step === 'newPassword' && (
          <Box>
            <TextField
              fullWidth
              required
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              sx={{ mb: 3, bgcolor: '#F9FAFB', borderRadius: 2 }}
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            <TextField
              fullWidth
              required
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              sx={{ mb: 3, bgcolor: '#F9FAFB', borderRadius: 2 }}
              InputProps={{ sx: { borderRadius: 2 } }}
            />
            <Button
              fullWidth
              variant="contained"
              sx={{ bgcolor: '#7C3AED', color: '#fff', py: 1.5, mb: 2, fontWeight: 600, fontSize: 16, borderRadius: 2 }}
              disabled={loadingReset}
              onClick={async () => {
                setError('');
                setSuccess('');
                if (!newPassword || !confirmPassword) {
                  setError('Please enter and confirm your new password.');
                  return;
                }
                if (newPassword !== confirmPassword) {
                  setError('Passwords do not match.');
                  return;
                }
                await resetPassword({
                  variables: {
                    email,
                    otpCode: otp,
                    newPassword,
                    confirmPassword,
                  },
                });
              }}
            >
              Reset Password
            </Button>
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/')}
          sx={{ color: '#6366F1', textDecoration: 'none', mt: 2, fontWeight: 500 }}
        >
          Back to Login
        </Link>
      </Box>
    </Container>
  );
};

export default ForgotPasswordPage;
