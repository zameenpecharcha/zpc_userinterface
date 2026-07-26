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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  ArrowBack,
  BusinessCenter,
  Home,
  MapOutlined,
  // Engineering,      // unused
  AccountCircle,
} from '@mui/icons-material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import BalanceIcon from '@mui/icons-material/Balance';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';
import { useApolloClient } from '@apollo/client';
import LocationAutocomplete from './LocationAutocomplete';
import GoogleSignInButton from './GoogleSignInButton';
import FacebookSignInButton from './FacebookSignInButton';
import { COUNTRY_CODES } from '../constants/countryCodes';

const professionOptions = [
  { id: 'builder', label: 'Builder', icon: ApartmentIcon, color: '#6366F1' },
  { id: 'agent', label: 'Agent', icon: BusinessCenter, color: '#8B5CF6' },
  { id: 'buyer_renter', label: 'Looking for buy/rent', icon: Home, color: '#EC4899' },
  { id: 'litigation_lawyer', label: 'Litigation Lawyer', icon: BalanceIcon, color: '#8B5CF6' },
  { id: 'land_surveyor', label: 'Land Surveyor', icon: MapOutlined, color: '#8B5CF6' },
  { id: 'general_user', label: 'General User', icon: AccountCircle, color: '#8B5CF6' },
];

const Register = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const client = useApolloClient();
  const authService = new AuthService(client);

  const [currentStep, setCurrentStep] = useState(1);
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
  const [selectedProfession, setSelectedProfession] = useState<string>('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [facebookSigningIn, setFacebookSigningIn] = useState(false);
  const [mobileSignInOpen, setMobileSignInOpen] = useState(false);
  const [mobileStep, setMobileStep] = useState<'phone' | 'otp'>('phone');
  const [mobileData, setMobileData] = useState({ countryCode: '+91', phone: '', otp: '' });
  const [mobileLoading, setMobileLoading] = useState(false);

  const handleProfessionSelect = (professionId: string) => {
    setSelectedProfession(professionId);
  };

  const handleLocationSelect = (location: { address: string; latitude: number; longitude: number }) => {
    setFormData(prev => ({
      ...prev,
      address: location.address,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
    }));
  };

  const handleContinueFromStep1 = () => {
    if (!selectedProfession) {
      setError('Please select a profession');
      return;
    }
    if (!formData.address.trim()) {
      setError('Please enter your location');
      return;
    }
    if (!formData.latitude || !formData.longitude) {
      setError('Please select a location from the suggestions');
      return;
    }
    setError('');
    setFormData(prev => ({
      ...prev,
      role: selectedProfession
    }));
    setCurrentStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      // Validate latitude and longitude
      const latitude = parseFloat(formData.latitude);
      const longitude = parseFloat(formData.longitude);
      if (isNaN(latitude) || isNaN(longitude)) {
        setError('Please select a valid location from the suggestions');
        return;
      }

      const normalizedEmail = formData.email.trim().toLowerCase();
      const response = await authService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: normalizedEmail,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        address: formData.address,
        latitude,
        longitude,
        bio: formData.bio,
      });

      if (response) {
        // After successful registration, login the user
        const loginResponse = await authService.login({
          email: normalizedEmail,
          password: formData.password,
        });

        if (loginResponse.success && loginResponse.token && loginResponse.userInfo) {
          setAuth(
            loginResponse.token,
            loginResponse.refreshToken || '',
            loginResponse.userInfo
          );
          setSuccessMessage('Registration successful! Redirecting...');
          setTimeout(() => navigate('/home'), 1500);
        } else {
          setError('Registration successful but login failed. Please try logging in.');
          setTimeout(() => navigate('/'), 1500);
        }
      }
    } catch (err: any) {
      setError('Registration error: ' + (err && err.message ? err.message : 'Unknown error'));
      console.error('Registration error:', err);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    if (googleSigningIn) return;
    setError('');
    setSuccessMessage('');

    const role = selectedProfession || formData.role;
    if (!role) {
      setError('Please select a profession before signing up with Google');
      return;
    }
    if (!formData.address.trim()) {
      setError('Please enter your location before signing up with Google');
      return;
    }

    const latitude = parseFloat(formData.latitude);
    const longitude = parseFloat(formData.longitude);
    if (isNaN(latitude) || isNaN(longitude)) {
      setError('Please select a location from the suggestions before signing up with Google');
      return;
    }

    setGoogleSigningIn(true);
    try {
      const response = await authService.googleSignIn({
        idToken: credential,
        role,
        address: formData.address,
        latitude,
        longitude,
        bio: formData.bio,
        phone: formData.phone,
      });

      if (response.success && response.token && response.userInfo) {
        setAuth(
          response.token,
          response.refreshToken || '',
          response.userInfo
        );
        setSuccessMessage('Google signup successful! Redirecting...');
        setTimeout(() => navigate('/home'), 800);
      } else {
        setError(response.message || 'Google signup failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Google signup error:', err);
      setError('Google signup error: ' + (err && err.message ? err.message : 'Unknown error'));
    } finally {
      setGoogleSigningIn(false);
    }
  };

  const handleFacebookAccessToken = async (accessToken: string) => {
    if (facebookSigningIn) return;
    setError('');
    setSuccessMessage('');

    const role = selectedProfession || formData.role;
    if (!role) {
      setError('Please select a profession before signing up with Facebook');
      return;
    }
    if (!formData.address.trim()) {
      setError('Please enter your location before signing up with Facebook');
      return;
    }

    const latitude = parseFloat(formData.latitude);
    const longitude = parseFloat(formData.longitude);
    if (isNaN(latitude) || isNaN(longitude)) {
      setError('Please select a location from the suggestions before signing up with Facebook');
      return;
    }

    setFacebookSigningIn(true);
    try {
      const response = await authService.facebookSignIn({
        accessToken,
        role,
        address: formData.address,
        latitude,
        longitude,
        bio: formData.bio,
        phone: formData.phone,
      });

      if (response.success && response.token && response.userInfo) {
        setAuth(
          response.token,
          response.refreshToken || '',
          response.userInfo
        );
        setSuccessMessage('Facebook signup successful! Redirecting...');
        setTimeout(() => navigate('/home'), 800);
      } else {
        setError(response.message || 'Facebook signup failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Facebook signup error:', err);
      setError('Facebook signup error: ' + (err && err.message ? err.message : 'Unknown error'));
    } finally {
      setFacebookSigningIn(false);
    }
  };

  const handleSendMobileOTP = async () => {
    setError('');
    setSuccessMessage('');
    setMobileLoading(true);
    try {
      const response = await authService.sendMobileOTP({
        phone: `${mobileData.countryCode}${mobileData.phone.replace(/\D/g, '')}`,
      });
      if (response.success) {
        setSuccessMessage(response.message || 'OTP sent to your mobile number');
        setMobileStep('otp');
      } else {
        setError(response.message || 'Failed to send mobile OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send mobile OTP');
    } finally {
      setMobileLoading(false);
    }
  };

  const handleVerifyMobileOTP = async () => {
    setError('');
    setSuccessMessage('');
    setMobileLoading(true);
    try {
      const response = await authService.verifyMobileOTP({
        phone: `${mobileData.countryCode}${mobileData.phone.replace(/\D/g, '')}`,
        otpCode: mobileData.otp.trim(),
      });

      if (response.success && response.token && response.userInfo) {
        setAuth(
          response.token,
          response.refreshToken || '',
          response.userInfo
        );
        setSuccessMessage(response.message || 'Mobile sign-in successful');
        setMobileSignInOpen(false);
        setMobileStep('phone');
        setMobileData({ countryCode: '+91', phone: '', otp: '' });
        navigate('/home');
      } else {
        setError(response.message || 'Invalid mobile OTP');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify mobile OTP');
    } finally {
      setMobileLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const mobileSignInDialog = (
    <Dialog
      open={mobileSignInOpen}
      fullWidth
      maxWidth="xs"
      onClose={() => {
        setMobileSignInOpen(false);
        setMobileStep('phone');
        setMobileData({ countryCode: '+91', phone: '', otp: '' });
        setError('');
        setSuccessMessage('');
      }}
    >
      <DialogTitle sx={{ fontWeight: 600, color: '#1e3a48' }}>
        Continue with mobile number
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            select
            margin="dense"
            label="Code"
            value={mobileData.countryCode}
            disabled={mobileStep === 'otp' || mobileLoading}
            onChange={(e) => setMobileData((prev) => ({ ...prev, countryCode: e.target.value }))}
            sx={{ width: 150 }}
          >
            {COUNTRY_CODES.map((country) => (
              <MenuItem key={country.code} value={country.code}>
                {country.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            autoFocus
            margin="dense"
            label="Mobile number"
            fullWidth
            value={mobileData.phone}
            disabled={mobileStep === 'otp' || mobileLoading}
            onChange={(e) => setMobileData((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
            placeholder="7675023613"
          />
        </Box>
        {mobileStep === 'otp' && (
          <TextField
            margin="dense"
            label="OTP"
            fullWidth
            value={mobileData.otp}
            disabled={mobileLoading}
            onChange={(e) => setMobileData((prev) => ({ ...prev, otp: e.target.value }))}
            placeholder="Enter OTP"
            sx={{ mb: 2 }}
          />
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
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={() => {
            setMobileSignInOpen(false);
            setMobileStep('phone');
            setMobileData({ countryCode: '+91', phone: '', otp: '' });
            setError('');
            setSuccessMessage('');
          }}
          disabled={mobileLoading}
        >
          Cancel
        </Button>
        {mobileStep === 'phone' ? (
          <Button onClick={handleSendMobileOTP} disabled={mobileLoading || !mobileData.phone.trim()}>
            {mobileLoading ? 'Sending...' : 'Send OTP'}
          </Button>
        ) : (
          <Button onClick={handleVerifyMobileOTP} disabled={mobileLoading || !mobileData.otp.trim()}>
            {mobileLoading ? 'Verifying...' : 'Verify OTP'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  // Step 1: Profession and Location Selection
  if (currentStep === 1) {
    return (
      <Container component="main" maxWidth="sm" disableGutters>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            px: 2,
            pt: 2,
            pb: 8,
          }}
        >
          <IconButton
            onClick={() => navigate('/')}
            sx={{ alignSelf: 'flex-start' }}
          >
            <ArrowBack />
          </IconButton>

          <Typography
            variant="h5"
            sx={{ fontWeight: 600, mt: 4, mb: 1, textAlign: 'center' }}
          >
            Select your profession
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{ color: '#6B7280', mb: 4, textAlign: 'center' }}
          >
            Choose one or more options that describe your role
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

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              width: '100%',
              maxWidth: 500,
              mb: 4,
            }}
          >
            {professionOptions.map((profession) => {
              const IconComponent = profession.icon;
              const isSelected = selectedProfession === profession.id;

              return (
                <Box
                  key={profession.id}
                  onClick={() => handleProfessionSelect(profession.id)}
                  sx={{
                    border: isSelected ? `2px solid ${profession.color}` : '1px solid #E5E7EB',
                    borderRadius: 2,
                    px: 2,
                    py: 1.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.5,
                    backgroundColor: isSelected ? '#F5F3FF' : '#fff',
                    transition: '0.2s',
                    '&:hover': {
                      backgroundColor: '#F9FAFB',
                    },
                  }}
                >
                  <IconComponent sx={{ fontSize: 20, color: profession.color }} />
                  <Typography
                    variant="body1"
                    sx={{ color: isSelected ? profession.color : '#374151', fontWeight: 500 }}
                  >
                    {profession.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          <LocationAutocomplete
            value={formData.address}
            onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
            onLocationSelect={handleLocationSelect}
            error={Boolean(error && !formData.address.trim())}
            helperText={error && !formData.address.trim() ? 'Please enter your location' : undefined}
          />

          <Box
            sx={{
              position: 'fixed',
              bottom: 16,
              left: 0,
              right: 0,
              px: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Button
              fullWidth
              variant="contained"
              onClick={handleContinueFromStep1}
              sx={{
                maxWidth: 500,
                bgcolor: '#8B5CF6',
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: 2,
                py: 1.5,
                '&:hover': {
                  bgcolor: '#7C3AED',
                },
              }}
            >
              Continue with email
            </Button>
            <Box sx={{ width: '100%', maxWidth: 500 }}>
              <GoogleSignInButton
                text="continue_with"
                disabled={googleSigningIn || facebookSigningIn}
                onCredential={handleGoogleCredential}
              />
            </Box>
            <Box sx={{ width: '100%', maxWidth: 500 }}>
              <FacebookSignInButton
                label="Continue with Facebook"
                disabled={googleSigningIn || facebookSigningIn}
                onAccessToken={handleFacebookAccessToken}
              />
            </Box>
            <Button
              fullWidth
              variant="outlined"
              disabled={googleSigningIn || facebookSigningIn || mobileLoading}
              onClick={() => setMobileSignInOpen(true)}
              sx={{ width: '100%', maxWidth: 500, textTransform: 'none', py: 1.25 }}
            >
              Continue with mobile number
            </Button>
          </Box>
          {mobileSignInDialog}
        </Box>
      </Container>
    );
  }

  // Step 2: Personal Details Form
  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <IconButton
          onClick={() => setCurrentStep(1)}
          sx={{ alignSelf: 'flex-start', mb: 2 }}
        >
          <ArrowBack />
        </IconButton>

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
            Complete your profile
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
              Bio
            </Typography>
            <TextField
              required
              fullWidth
              name="bio"
              placeholder="Enter your bio"
              value={formData.bio}
              onChange={handleChange}
              multiline
              rows={3}
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

            <Divider sx={{ mb: 3 }}>or</Divider>

            <Box sx={{ mb: 3 }}>
              <GoogleSignInButton
                text="continue_with"
                disabled={googleSigningIn || facebookSigningIn}
                onCredential={handleGoogleCredential}
              />
            </Box>
            <Box sx={{ mb: 3 }}>
              <FacebookSignInButton
                label="Continue with Facebook"
                disabled={googleSigningIn || facebookSigningIn}
                onAccessToken={handleFacebookAccessToken}
              />
            </Box>
            <Button
              fullWidth
              variant="outlined"
              disabled={googleSigningIn || facebookSigningIn || mobileLoading}
              onClick={() => setMobileSignInOpen(true)}
              sx={{ textTransform: 'none', py: 1.25, mb: 3 }}
            >
              Continue with mobile number
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
        {mobileSignInDialog}
      </Box>
    </Container>
  );
};

export default Register;