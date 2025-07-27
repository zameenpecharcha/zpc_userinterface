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
    $firstName: String!
    $lastName: String!
    $email: String!
    $phone: String!
    $password: String!
    $role: String!
    $address: String!
    $latitude: Float!
    $longitude: Float!
    $bio: String!
  ) {
    createUser(
      firstName: $firstName
      lastName: $lastName
      email: $email
      phone: $phone
      password: $password
      role: $role
      address: $address
      latitude: $latitude
      longitude: $longitude
      bio: $bio
    ) {
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
`;

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: '',
    address: '',
    latitude: '',
    longitude: '',
    bio: '',
  });
  const [error, setError] = useState('');

  const [createUser] = useMutation(CREATE_USER, {
    onCompleted: (data) => {
      if (data && data.createUser) {
        // Optionally store user info in localStorage
        localStorage.setItem('userInfo', JSON.stringify(data.createUser));
        navigate('/home');
      } else {
        setError('Registration failed. Please try again.');
      }
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate latitude and longitude
      const latitude = parseFloat(formData.latitude);
      const longitude = parseFloat(formData.longitude);
      if (isNaN(latitude) || isNaN(longitude)) {
        setError('Please enter valid latitude and longitude');
        return;
      }
      await createUser({
        variables: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role,
          address: formData.address,
          latitude,
          longitude,
          bio: formData.bio,
        },
      });
    } catch (err: any) {
      setError('Registration error: ' + (err && err.message ? err.message : 'Unknown error'));
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
              First Name
            </Typography>
            <TextField
              required
              fullWidth
              name="firstName"
              placeholder="Enter your first name"
              value={formData.firstName}
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
              Last Name
            </Typography>
            <TextField
              required
              fullWidth
              name="lastName"
              placeholder="Enter your last name"
              value={formData.lastName}
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
              Address
            </Typography>
            <TextField
              required
              fullWidth
              name="address"
              placeholder="Enter your address"
              value={formData.address}
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
              Latitude
            </Typography>
            <TextField
              required
              fullWidth
              name="latitude"
              placeholder="Enter latitude"
              value={formData.latitude}
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
              Longitude
            </Typography>
            <TextField
              required
              fullWidth
              name="longitude"
              placeholder="Enter longitude"
              value={formData.longitude}
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
              Bio
            </Typography>
            <TextField
              required
              fullWidth
              name="bio"
              placeholder="Enter your bio"
              value={formData.bio}
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