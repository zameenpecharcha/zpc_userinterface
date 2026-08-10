import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  AppBar,
  Toolbar,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  AttachMoney as PriceIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useApolloClient } from '@apollo/client';
import { PropertyService, mapFormDataToPropertyInput } from '../services/propertyService';
import { PropertyType, ListingType } from '../types/property';
import LocationAutocomplete from './LocationAutocomplete';
import { MATTE_SURFACE, MATTE_HEADER, PAGE_ATMOSPHERE } from '../theme/surfaces';

const CreateProperty: React.FC = () => {
  const navigate = useNavigate();
  const client = useApolloClient();
  const propertyService = useMemo(() => new PropertyService(client), [client]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: PropertyType.APARTMENT,
    listingType: ListingType.SALE,
    price: '',
    location: '',
    bedrooms: '',
    bathrooms: '',
    city: '',
    state: '',
    country: 'India',
  });

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = (locationData: { address: string; latitude: number; longitude: number }) => {
    const truncatedLocation = locationData.address.split(',').slice(0, 3).join(',').trim();
    setFormData((prev) => ({
      ...prev,
      location: truncatedLocation,
      city: truncatedLocation.split(',')[0]?.trim() || prev.city,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      setSnackbar({ open: true, message: 'Please fill in title, description, and location', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const created = await propertyService.createProperty(mapFormDataToPropertyInput(formData));
      await propertyService.updatePropertyStatus(created.id, 'PUBLISHED');
      setSnackbar({ open: true, message: 'Property created and published!', severity: 'success' });
      setTimeout(() => navigate('/my-properties'), 1500);
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || 'Failed to create property', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', ...PAGE_ATMOSPHERE }}>
      <AppBar position="static" elevation={0} sx={{ ...MATTE_HEADER }}>
        <Toolbar>
          <IconButton onClick={() => navigate('/home')} sx={{ mr: 2, color: '#374151' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ color: '#111827', fontWeight: 600 }}>
            Create New Property
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Card sx={{ borderRadius: 3, ...MATTE_SURFACE }}>
          <CardContent sx={{ p: 4 }}>
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 3 }}>
              <TextField
                fullWidth
                label="Property Title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
                InputProps={{ startAdornment: <HomeIcon sx={{ mr: 1, color: '#6B7280' }} /> }}
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <FormControl fullWidth required>
                  <InputLabel>Property Type</InputLabel>
                  <Select
                    value={formData.propertyType}
                    onChange={(e) => handleInputChange('propertyType', e.target.value)}
                    label="Property Type"
                  >
                    {Object.values(PropertyType).map((t) => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth required>
                  <InputLabel>Listing Type</InputLabel>
                  <Select
                    value={formData.listingType}
                    onChange={(e) => handleInputChange('listingType', e.target.value)}
                    label="Listing Type"
                  >
                    {Object.values(ListingType).map((t) => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                <TextField
                  fullWidth
                  label="Price (INR)"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  type="number"
                  InputProps={{ startAdornment: <PriceIcon sx={{ mr: 1, color: '#6B7280' }} /> }}
                />
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>Location *</Typography>
                  <LocationAutocomplete
                    onLocationSelect={handleLocationSelect}
                    value={formData.location}
                    onChange={(value) => handleInputChange('location', value)}
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
                <TextField label="City" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} />
                <TextField label="State" value={formData.state} onChange={(e) => handleInputChange('state', e.target.value)} />
                <TextField label="Bedrooms" value={formData.bedrooms} onChange={(e) => handleInputChange('bedrooms', e.target.value)} type="number" />
              </Box>

              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                multiline
                rows={4}
                required
                InputProps={{ startAdornment: <DescriptionIcon sx={{ mr: 1, color: '#6B7280', alignSelf: 'flex-start', mt: 1 }} /> }}
              />

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/home')}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Create Property'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateProperty;
