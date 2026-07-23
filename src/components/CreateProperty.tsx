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
import { PropertyType, PropertyStatus } from '../graphql/property';
import LocationAutocomplete from './LocationAutocomplete';
import { MATTE_SURFACE, MATTE_HEADER, PAGE_ATMOSPHERE } from '../theme/surfaces';

const CreateProperty: React.FC = () => {
  const navigate = useNavigate();
  const client = useApolloClient();
  const propertyService = useMemo(() => new PropertyService(client), [client]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: '',
    price: '',
    location: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    yearBuilt: new Date().getFullYear().toString(),
    status: 'ACTIVE',
    address: '',
    city: '',
    state: '',
    country: 'India',
    zipCode: '',
    latitude: '',
    longitude: '',
    images: [] as string[],
    amenities: [] as string[]
  });

  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationSelect = (locationData: { address: string; latitude: number; longitude: number }) => {
    console.log('Location selected:', locationData);
    // Truncate location to up to 2 commas
    const truncatedLocation = locationData.address.split(',').slice(0, 3).join(',').trim();
    console.log('Truncated location:', truncatedLocation);
    setFormData(prev => ({
      ...prev,
      location: truncatedLocation,
      address: locationData.address,
      latitude: locationData.latitude.toString(),
      longitude: locationData.longitude.toString()
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.propertyType || !formData.location.trim()) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields (title, description, property type, and location)',
        severity: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Form data:', formData);
      const propertyInput = mapFormDataToPropertyInput(formData);
      console.log('Property input:', propertyInput);
      
      const result = await propertyService.createProperty(propertyInput);
      console.log('Property created:', result);
      
      setSnackbar({
        open: true,
        message: 'Property created successfully!',
        severity: 'success'
      });
      
      // Navigate to home after a short delay
      setTimeout(() => {
        navigate('/home');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error creating property:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to create property',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/home');
  };

  return (
    <Box sx={{ minHeight: '100vh', ...PAGE_ATMOSPHERE }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ ...MATTE_HEADER }}>
        <Toolbar>
          <IconButton onClick={handleGoBack} sx={{ mr: 2, color: '#374151' }}>
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
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#111827' }}>
              Property Details
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              <Box sx={{ display: 'grid', gap: 3 }}>
                {/* Title */}
                <Box>
                  <TextField
                    fullWidth
                    label="Property Title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                    placeholder="Enter property title"
                    InputProps={{
                      startAdornment: <HomeIcon sx={{ mr: 1, color: '#6B7280' }} />
                    }}
                  />
                </Box>

                {/* Property Type and Status */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Property Type</InputLabel>
                    <Select
                      value={formData.propertyType}
                      onChange={(e) => handleInputChange('propertyType', e.target.value)}
                      label="Property Type"
                    >
                                           <MenuItem value={PropertyType.APARTMENT}>Apartment</MenuItem>
                     <MenuItem value={PropertyType.HOUSE}>House</MenuItem>
                     <MenuItem value={PropertyType.VILLA}>Villa</MenuItem>
                     <MenuItem value={PropertyType.LAND}>Land</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth required>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      label="Status"
                    >
                                           <MenuItem value={PropertyStatus.ACTIVE}>Active</MenuItem>
                     <MenuItem value={PropertyStatus.INACTIVE}>Inactive</MenuItem>
                     <MenuItem value={PropertyStatus.SOLD}>Sold</MenuItem>
                     <MenuItem value={PropertyStatus.RENTED}>Rented</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                                                   {/* Price and Location */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                    <TextField
                      fullWidth
                      label="Price"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      placeholder="Enter price"
                      type="number"
                      InputProps={{
                        startAdornment: <PriceIcon sx={{ mr: 1, color: '#6B7280' }} />
                      }}
                    />

                    <Box>
                      <Typography variant="body2" sx={{ mb: 1, color: '#374151', fontWeight: 500 }}>
                        Location *
                      </Typography>
                      <LocationAutocomplete
                        onLocationSelect={handleLocationSelect}
                        value={formData.location}
                        onChange={(value) => handleInputChange('location', value)}
                      />
                    </Box>
                  </Box>

                 {/* Address and City */}
                 <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                   <TextField
                     fullWidth
                     label="Address"
                     value={formData.address}
                     onChange={(e) => handleInputChange('address', e.target.value)}
                     placeholder="Enter full address"
                   />

                   <TextField
                     fullWidth
                     label="City"
                     value={formData.city}
                     onChange={(e) => handleInputChange('city', e.target.value)}
                     placeholder="Enter city"
                   />
                 </Box>

                 {/* State and Zip Code */}
                 <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                   <TextField
                     fullWidth
                     label="State"
                     value={formData.state}
                     onChange={(e) => handleInputChange('state', e.target.value)}
                     placeholder="Enter state"
                   />

                   <TextField
                     fullWidth
                     label="Zip Code"
                     value={formData.zipCode}
                     onChange={(e) => handleInputChange('zipCode', e.target.value)}
                     placeholder="Enter zip code"
                   />
                 </Box>

                 {/* Latitude and Longitude */}
                 <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                   <TextField
                     fullWidth
                     label="Latitude"
                     value={formData.latitude}
                     onChange={(e) => handleInputChange('latitude', e.target.value)}
                     placeholder="Enter latitude"
                     type="number"
                     inputProps={{ step: 'any' }}
                   />

                   <TextField
                     fullWidth
                     label="Longitude"
                     value={formData.longitude}
                     onChange={(e) => handleInputChange('longitude', e.target.value)}
                     placeholder="Enter longitude"
                     type="number"
                     inputProps={{ step: 'any' }}
                   />
                 </Box>

                 {/* Year Built */}
                 <Box>
                   <TextField
                     fullWidth
                     label="Year Built"
                     value={formData.yearBuilt}
                     onChange={(e) => handleInputChange('yearBuilt', e.target.value)}
                     placeholder="Enter year built"
                     type="number"
                   />
                 </Box>

                {/* Bedrooms, Bathrooms, Area */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
                  <TextField
                    fullWidth
                    label="Bedrooms"
                    value={formData.bedrooms}
                    onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                    placeholder="Number of bedrooms"
                    type="number"
                  />

                  <TextField
                    fullWidth
                    label="Bathrooms"
                    value={formData.bathrooms}
                    onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                    placeholder="Number of bathrooms"
                    type="number"
                  />

                  <TextField
                    fullWidth
                    label="Area (sq ft)"
                    value={formData.area}
                    onChange={(e) => handleInputChange('area', e.target.value)}
                    placeholder="Property area"
                    type="number"
                  />
                </Box>

                {/* Description */}
                <Box>
                  <TextField
                    fullWidth
                    label="Description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    multiline
                    rows={4}
                    placeholder="Describe your property..."
                    InputProps={{
                      startAdornment: <DescriptionIcon sx={{ mr: 1, color: '#6B7280', alignSelf: 'flex-start', mt: 1 }} />
                    }}
                  />
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleGoBack}
                    sx={{
                      borderColor: '#E5E7EB',
                      color: '#6B7280',
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      fontWeight: 600,
                      textTransform: 'none'
                    }}
                  >
                    Cancel
                  </Button>
                                     <Button
                     type="submit"
                     variant="contained"
                     disabled={loading}
                     sx={{
                       bgcolor: '#2563EB',
                       px: 4,
                       py: 1.5,
                       borderRadius: 2,
                       fontWeight: 600,
                       textTransform: 'none',
                       '&:hover': {
                         bgcolor: '#1D4ED8'
                       }
                     }}
                   >
                     {loading ? (
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                         <CircularProgress size={20} color="inherit" />
                         Creating...
                       </Box>
                     ) : (
                       'Create Property'
                     )}
                   </Button>
                </Box>
              </Box>
            </Box>
          </CardContent>
                 </Card>
       </Container>

       {/* Snackbar for notifications */}
       <Snackbar
         open={snackbar.open}
         autoHideDuration={6000}
         onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
         anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
       >
         <Alert
           onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
           severity={snackbar.severity}
           sx={{ width: '100%' }}
         >
           {snackbar.message}
         </Alert>
       </Snackbar>
     </Box>
   );
 };

export default CreateProperty;
