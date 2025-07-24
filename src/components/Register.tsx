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

const CREATE_USER = gql`
  mutation CreateUser(
    $name: String!
    $email: String!
    $phone: Int!
    $password: String!
    $role: String!
    $location: String!
  ) {
    createUser(
      name: $name
      email: $email
      phone: $phone
      password: $password
      role: $role
      location: $location
    ) {
      userId
      name
      email
      phone
      role
      location
    }
  }
`;

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: '',
    location: '',
  });
  const [error, setError] = useState('');

  const [createUser] = useMutation(CREATE_USER, {
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
      // Remove any non-numeric characters and convert to integer
      const phoneNumber = parseInt(formData.phone.replace(/\D/g, ''), 10);
      
      if (isNaN(phoneNumber)) {
        setError('Please enter a valid phone number');
        return;
      }

      await createUser({
        variables: {
          ...formData,
          phone: phoneNumber,
        },
      });
    } catch (err) {
      console.error('Registration error:', err);
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
            Create your account
          </Typography>
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Full Name
            </Typography>
            <TextField
              required
              fullWidth
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
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
              Email Address
            </Typography>
            <TextField
              required
              fullWidth
              name="email"
              type="email"
              placeholder="Enter your email address"
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
              Phone Number
            </Typography>
            <TextField
              required
              fullWidth
              name="phone"
              placeholder="Enter your phone number (numbers only)"
              value={formData.phone}
              onChange={handleChange}
              helperText="Only numbers will be saved"
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
              Role
            </Typography>
            <TextField
              required
              fullWidth
              name="role"
              placeholder="Enter your role"
              value={formData.role}
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
              Location
            </Typography>
            <TextField
              required
              fullWidth
              name="location"
              placeholder="Enter your location"
              value={formData.location}
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
                bgcolor: '#6366F1',
                py: 1.5,
                mb: 3,
                '&:hover': {
                  bgcolor: '#4F46E5',
                },
              }}
            >
              Register
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body1" display="inline">
                Already have an account?{' '}
              </Typography>
              <Link
                component="button"
                variant="body1"
                onClick={() => navigate('/')}
                sx={{ color: '#6366F1', textDecoration: 'none' }}
              >
                Sign in
              </Link>
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Register; 