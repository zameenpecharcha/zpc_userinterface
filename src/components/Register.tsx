import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  BusinessCenter,
  AccountCircle,
  CheckCircle,
} from '@mui/icons-material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';
import { useApolloClient } from '@apollo/client';
import LocationAutocomplete from './LocationAutocomplete';
import SocialAuthIconsRow from './SocialAuthIconsRow';
import { COUNTRY_CODES } from '../constants/countryCodes';
import { MagicCard } from './MagicCard';
import { PAGE_ATMOSPHERE } from '../theme/surfaces';
import { ZpcLogoMark } from './brand/ZpcLogo';

const ACCENT = '#16302A';
const ACCENT_SOFT = 'rgba(143, 169, 152, 0.35)';

const professionOptions = [
  {
    id: 'agent',
    label: 'Agent',
    hint: 'Sell & lease properties',
    icon: BusinessCenter,
  },
  {
    id: 'builder',
    label: 'Builder',
    hint: 'Develop & list projects',
    icon: ApartmentIcon,
  },
  {
    id: 'general',
    label: 'General',
    hint: 'Explore & discuss',
    icon: AccountCircle,
  },
];

const fieldSx = {
  mb: 2,
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(235, 230, 212,0.78)',
    borderRadius: '12px',
    fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
    '& fieldset': { borderColor: 'rgba(22, 48, 42, 0.2)' },
    '&:hover fieldset': { borderColor: 'rgba(30, 58, 72, 0.35)' },
    '&.Mui-focused fieldset': { borderColor: ACCENT },
  },
};

const Register = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const client = useApolloClient();
  const authService = useMemo(() => new AuthService(client), [client]);

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
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
  const [selectedProfession, setSelectedProfession] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [facebookSigningIn, setFacebookSigningIn] = useState(false);
  const [mobileSignInOpen, setMobileSignInOpen] = useState(false);
  const [mobileStep, setMobileStep] = useState<'phone' | 'otp'>('phone');
  const [mobileData, setMobileData] = useState({ countryCode: '+91', phone: '', otp: '' });
  const [mobileLoading, setMobileLoading] = useState(false);

  const selectedLabel = professionOptions.find((p) => p.id === selectedProfession)?.label;

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
      setError('Pick a location from the suggestions so we can place you on the map');
      return;
    }
    setError('');
    setFormData((prev) => ({ ...prev, role: selectedProfession }));
    setCurrentStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSuccessMessage('');

    const latitude = parseFloat(formData.latitude);
    const longitude = parseFloat(formData.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError('Please select a valid location from the suggestions');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password should be at least 6 characters');
      return;
    }

    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      setError('Enter a valid phone number');
      return;
    }

    setSubmitting(true);
    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      await authService.register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: normalizedEmail,
        phone: phoneDigits,
        password: formData.password,
        role: formData.role,
        address: formData.address,
        latitude,
        longitude,
        bio: formData.bio.trim() || `${selectedLabel || 'Member'} on Zameen pe charcha`,
      });

      const loginResponse = await authService.login({
        email: normalizedEmail,
        password: formData.password,
      });

      if (loginResponse.success && loginResponse.token && loginResponse.userInfo) {
        setAuth(loginResponse.token, loginResponse.refreshToken || '', loginResponse.userInfo);
        setSuccessMessage('Welcome aboard — taking you home…');
        setTimeout(() => navigate('/home'), 1200);
      } else {
        setError('Account created. Please sign in to continue.');
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
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
    const { name, value } = e.target;
    if (name === 'phone') {
      setFormData((prev) => ({ ...prev, phone: value.replace(/[^\d+\s-]/g, '') }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const closeMobileDialog = () => {
    setMobileSignInOpen(false);
    setMobileStep('phone');
    setMobileData({ countryCode: '+91', phone: '', otp: '' });
    setError('');
    setSuccessMessage('');
  };

  const mobileSignInDialog = (
    <Dialog open={mobileSignInOpen} fullWidth maxWidth="xs" onClose={closeMobileDialog}>
      <DialogTitle
        sx={{
          fontWeight: 700,
          fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
          color: ACCENT,
        }}
      >
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
            sx={{ width: 150, ...fieldSx, mb: 0 }}
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
            sx={{ ...fieldSx, mb: 0 }}
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
            sx={{ ...fieldSx, mb: 2 }}
          />
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
            {successMessage}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={closeMobileDialog}
          disabled={mobileLoading}
          sx={{
            textTransform: 'none',
            fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
            color: '#3A4540',
          }}
        >
          Cancel
        </Button>
        {mobileStep === 'phone' ? (
          <Button
            onClick={handleSendMobileOTP}
            disabled={mobileLoading || !mobileData.phone.trim()}
            variant="contained"
            sx={{
              textTransform: 'none',
              fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
              fontWeight: 700,
              bgcolor: ACCENT,
              color: '#EBE6D4',
              '&:hover': { bgcolor: '#0F221C' },
            }}
          >
            {mobileLoading ? 'Sending...' : 'Send OTP'}
          </Button>
        ) : (
          <Button
            onClick={handleVerifyMobileOTP}
            disabled={mobileLoading || !mobileData.otp.trim()}
            variant="contained"
            sx={{
              textTransform: 'none',
              fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
              fontWeight: 700,
              bgcolor: ACCENT,
              color: '#EBE6D4',
              '&:hover': { bgcolor: '#0F221C' },
            }}
          >
            {mobileLoading ? 'Verifying...' : 'Verify OTP'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  const socialAuthDisabled = googleSigningIn || facebookSigningIn || mobileLoading;

  return (
    <Box
      sx={{
        minHeight: { xs: '100dvh', sm: '100vh' },
        ...PAGE_ATMOSPHERE,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: { xs: 2, sm: 3 },
        pt: { xs: 'max(12px, env(safe-area-inset-top))', sm: 3 },
        pb: { xs: 'max(24px, env(safe-area-inset-bottom))', sm: 4 },
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 520, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <IconButton
            onClick={() => (currentStep === 1 ? navigate('/') : setCurrentStep(1))}
            sx={{
              color: ACCENT,
              bgcolor: 'rgba(235,230,212,0.7)',
              border: '1px solid rgba(22,48,42,0.16)',
              '&:hover': { bgcolor: '#0F221C' },
            }}
          >
            <ArrowBack />
          </IconButton>

          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
            {[1, 2].map((step) => (
              <Box
                key={step}
                sx={{
                  height: 6,
                  width: step === currentStep ? 28 : 10,
                  borderRadius: 999,
                  bgcolor: step <= currentStep ? ACCENT : 'rgba(30,58,72,0.18)',
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
            <Typography
              sx={{
                ml: 1,
                fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                fontSize: 12,
                fontWeight: 700,
                color: '#3A4540',
              }}
            >
              Step {currentStep} of 2
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 1.25, display: 'flex', justifyContent: 'center' }}>
          <ZpcLogoMark size={148} showTagline animateStroke />
        </Box>
        <Typography
          sx={{
            fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
            fontSize: 13,
            fontWeight: 500,
            color: '#3A4540',
            textAlign: 'center',
            mb: 3,
          }}
        >
          {currentStep === 1
            ? 'Tell us how you use property — we’ll tailor your feed'
            : 'Create your account to join the charcha'}
        </Typography>

        {currentStep === 1 ? (
          <MagicCard
            gradientSize={260}
            gradientColor={ACCENT_SOFT}
            gradientFrom="#5F8670"
            gradientTo="#EBE6D4"
          >
            <Box sx={{ px: { xs: 2, sm: 2.75 }, py: { xs: 2.25, sm: 2.75 } }}>
              <Typography
                sx={{
                  fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                  fontWeight: 800,
                  fontSize: { xs: '1.15rem', sm: '1.3rem' },
                  color: '#0A1210',
                  mb: 0.35,
                }}
              >
                Select your profession
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                  fontSize: 13,
                  color: '#3A4540',
                  mb: 2.25,
                }}
              >
                Choose the role that best describes you
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}
              {successMessage && (
                <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                  {successMessage}
                </Alert>
              )}

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: { xs: 0.85, sm: 1.25 },
                  mb: 2.5,
                }}
              >
                {professionOptions.map((profession) => {
                  const Icon = profession.icon;
                  const selected = selectedProfession === profession.id;
                  return (
                    <Box
                      key={profession.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedProfession(profession.id);
                        setError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedProfession(profession.id);
                          setError('');
                        }
                      }}
                      sx={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: 0.75,
                        px: { xs: 0.75, sm: 1.25 },
                        py: { xs: 1.15, sm: 1.35 },
                        minWidth: 0,
                        borderRadius: '14px',
                        cursor: 'pointer',
                        border: selected
                          ? `1.5px solid ${ACCENT}`
                          : '1.5px solid rgba(22, 48, 42, 0.18)',
                        bgcolor: selected ? 'rgba(30, 58, 72, 0.06)' : 'rgba(235,230,212,0.72)',
                        transition: 'border-color 0.2s ease, background 0.2s ease, transform 0.15s ease',
                        '&:hover': {
                          bgcolor: selected ? 'rgba(30, 58, 72, 0.08)' : 'rgba(235,230,212,0.92)',
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      {selected && (
                        <CheckCircle
                          sx={{
                            color: ACCENT,
                            fontSize: 16,
                            position: 'absolute',
                            top: 6,
                            right: 6,
                          }}
                        />
                      )}
                      <Box
                        sx={{
                          width: { xs: 34, sm: 40 },
                          height: { xs: 34, sm: 40 },
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          bgcolor: selected ? ACCENT : 'rgba(143, 169, 152, 0.35)',
                          color: selected ? '#EBE6D4' : ACCENT,
                        }}
                      >
                        <Icon sx={{ fontSize: { xs: 18, sm: 22 } }} />
                      </Box>
                      <Box sx={{ minWidth: 0, width: '100%' }}>
                        <Typography
                          sx={{
                            fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                            fontWeight: 700,
                            fontSize: { xs: 12.5, sm: 14 },
                            color: '#0A1210',
                            lineHeight: 1.2,
                          }}
                        >
                          {profession.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                            fontSize: { xs: 10, sm: 11.5 },
                            fontWeight: 500,
                            color: '#3A4540',
                            mt: 0.25,
                            lineHeight: 1.25,
                          }}
                        >
                          {profession.hint}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              <Typography
                sx={{
                  fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                  fontWeight: 700,
                  fontSize: 13,
                  color: ACCENT,
                  mb: 1,
                }}
              >
                Your location
              </Typography>
              <LocationAutocomplete
                value={formData.address}
                onChange={(value) => setFormData((prev) => ({ ...prev, address: value }))}
                onLocationSelect={(location) => {
                  setFormData((prev) => ({
                    ...prev,
                    address: location.address,
                    latitude: location.latitude.toString(),
                    longitude: location.longitude.toString(),
                  }));
                  setError('');
                }}
                error={Boolean(error && (!formData.address.trim() || !formData.latitude))}
                helperText={
                  formData.latitude
                    ? 'Location locked in — you can change it later in profile'
                    : 'Start typing and pick a suggestion'
                }
              />

              <Button
                fullWidth
                variant="contained"
                onClick={handleContinueFromStep1}
                disabled={socialAuthDisabled}
                sx={{
                  mt: 2.5,
                  py: 1.35,
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                  fontWeight: 700,
                  fontSize: '1rem',
                  bgcolor: ACCENT,
                  color: '#EBE6D4',
                  boxShadow: '0 8px 22px rgba(30, 58, 72, 0.28)',
                  '&:hover': { bgcolor: '#0F221C' },
                }}
              >
                Continue with email
              </Button>

              <Divider
                sx={{
                  my: 2,
                  fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                  fontSize: 12,
                  color: '#3A4540',
                  '&::before, &::after': { borderColor: 'rgba(22, 48, 42, 0.2)' },
                }}
              >
                or
              </Divider>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <SocialAuthIconsRow
                  disabled={socialAuthDisabled}
                  tone="light"
                  onGoogleCredential={handleGoogleCredential}
                  onFacebookAccessToken={handleFacebookAccessToken}
                  onMobileSignIn={() => setMobileSignInOpen(true)}
                />
              </Box>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography
                  component="span"
                  sx={{ fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif', fontSize: 13, color: '#3A4540' }}
                >
                  Already have an account?{' '}
                </Typography>
                <Link
                  component="button"
                  type="button"
                  onClick={() => navigate('/')}
                  sx={{
                    fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                    fontSize: 13,
                    fontWeight: 700,
                    color: ACCENT,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Sign in
                </Link>
              </Box>
            </Box>
          </MagicCard>
        ) : (
          <MagicCard
            gradientSize={240}
            gradientColor={ACCENT_SOFT}
            gradientFrom="#5F8670"
            gradientTo="#EBE6D4"
          >
            <Box component="form" onSubmit={handleSubmit}>
              <Box
                sx={{
                  borderBottom: '1px solid rgba(90, 70, 50, 0.1)',
                  px: 2.5,
                  py: 2,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    color: '#0A1210',
                  }}
                >
                  Complete your profile
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                    fontSize: 13,
                    color: '#3A4540',
                    mt: 0.35,
                  }}
                >
                  Joining as <strong style={{ color: ACCENT }}>{selectedLabel}</strong>
                  {formData.address ? ` · ${formData.address.split(',')[0]}` : ''}
                </Typography>
              </Box>

              <Box sx={{ px: 2.5, py: 2.25 }}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}
                {successMessage && (
                  <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                    {successMessage}
                  </Alert>
                )}

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 0, sm: 1.5 } }}>
                  <Box>
                    <Typography sx={{ fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif', fontSize: 13, fontWeight: 700, color: ACCENT, mb: 0.75 }}>
                      First name
                    </Typography>
                    <TextField
                      required
                      fullWidth
                      name="firstName"
                      placeholder="Rohit"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={submitting}
                      sx={fieldSx}
                    />
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif', fontSize: 13, fontWeight: 700, color: ACCENT, mb: 0.75 }}>
                      Last name
                    </Typography>
                    <TextField
                      required
                      fullWidth
                      name="lastName"
                      placeholder="Sharma"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={submitting}
                      sx={fieldSx}
                    />
                  </Box>
                </Box>

                <Typography sx={{ fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif', fontSize: 13, fontWeight: 700, color: ACCENT, mb: 0.75 }}>
                  Email
                </Typography>
                <TextField
                  required
                  fullWidth
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={submitting}
                  sx={fieldSx}
                />

                <Typography sx={{ fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif', fontSize: 13, fontWeight: 700, color: ACCENT, mb: 0.75 }}>
                  Phone
                </Typography>
                <TextField
                  required
                  fullWidth
                  name="phone"
                  placeholder="10-digit mobile number"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={submitting}
                  helperText="Digits only — used for verification & contact"
                  sx={fieldSx}
                />

                <Typography sx={{ fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif', fontSize: 13, fontWeight: 700, color: ACCENT, mb: 0.75 }}>
                  Password
                </Typography>
                <TextField
                  required
                  fullWidth
                  name="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={submitting}
                  sx={fieldSx}
                />

                <Typography sx={{ fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif', fontSize: 13, fontWeight: 700, color: ACCENT, mb: 0.75 }}>
                  Short bio <Typography component="span" sx={{ color: '#A89F84', fontWeight: 500, fontSize: 12 }}>(optional)</Typography>
                </Typography>
                <TextField
                  fullWidth
                  name="bio"
                  placeholder="What are you looking for on Zameen pe charcha?"
                  value={formData.bio}
                  onChange={handleChange}
                  disabled={submitting}
                  multiline
                  minRows={2}
                  maxRows={4}
                  sx={{ ...fieldSx, mb: 0.5 }}
                />
              </Box>

              <Box
                sx={{
                  borderTop: '1px solid rgba(90, 70, 50, 0.1)',
                  px: 2.5,
                  py: 2,
                }}
              >
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={submitting}
                  startIcon={
                    submitting ? (
                      <CircularProgress size={18} thickness={5} sx={{ color: '#EBE6D4' }} />
                    ) : undefined
                  }
                  sx={{
                    py: 1.3,
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                    fontWeight: 700,
                    fontSize: '1rem',
                    bgcolor: ACCENT,
                    color: '#EBE6D4',
                    boxShadow: '0 8px 22px rgba(30, 58, 72, 0.28)',
                    '&:hover': { bgcolor: '#0F221C' },
                    '&.Mui-disabled': { bgcolor: ACCENT, color: '#EBE6D4', opacity: 0.85 },
                  }}
                >
                  {submitting ? 'Creating account…' : 'Create account'}
                </Button>
              </Box>
            </Box>
          </MagicCard>
        )}
      </Box>
      {mobileSignInDialog}
    </Box>
  );
};

export default Register;
