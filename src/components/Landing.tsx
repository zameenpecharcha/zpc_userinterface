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
} from '@mui/material';

const LOGIN_USER = gql`
  mutation LoginUser($identifier: String!, $password: String!) {
    loginUser(identifier: $identifier, password: $password) {
      userId
      name
      email
      phone
      role
      location
    }
  }
`;

const Landing = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [error, setError] = useState('');

  const [loginUser] = useMutation(LOGIN_USER, {
    onCompleted: () => {
      navigate('/home');
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginUser({
        variables: formData,
      });
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
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
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Username or Phone Number
            </Typography>
            <TextField
              fullWidth
              name="identifier"
              placeholder="Enter your username or phone number"
              value={formData.identifier}
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
              fullWidth
              type="password"
              name="password"
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
              <Link href="#" sx={{ color: '#6366F1', textDecoration: 'none' }}>
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
    </Container>
  );
};

export default Landing; 