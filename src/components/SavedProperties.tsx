import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client';
import { REMOVE_SAVED_PROPERTY, SAVED_PROPERTIES } from '../graphql/property';
import { Property } from '../types/property';
import { ZpcNavLogo } from './brand/ZpcNavLogo';
import HeaderLogoutButton from './HeaderLogoutButton';
import { MATTE_SURFACE, MATTE_HEADER, PAGE_ATMOSPHERE } from '../theme/surfaces';

const formatPrice = (price: number) => {
  if (!price) return 'Price on request';
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
  return `₹${price.toLocaleString()}`;
};

const SavedProperties: React.FC = () => {
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const { loading, error, data, refetch } = useQuery(SAVED_PROPERTIES, {
    variables: { page: 1, limit: 50 },
    fetchPolicy: 'network-only',
  });
  const [removeSavedProperty] = useMutation(REMOVE_SAVED_PROPERTY);

  const properties: Property[] = data?.savedProperties?.properties || [];

  const handleUnsave = async (event: React.MouseEvent, propertyId: string) => {
    event.stopPropagation();
    try {
      await removeSavedProperty({ variables: { propertyId } });
      await refetch();
      setSnackbar({ open: true, message: 'Removed from saved', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Could not remove saved listing', severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', ...PAGE_ATMOSPHERE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={48} sx={{ color: '#16302A' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="error" sx={{ mb: 2 }}>{error.message}</Typography>
        <Button variant="contained" onClick={() => refetch()}>Try Again</Button>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', ...PAGE_ATMOSPHERE }}>
      <AppBar position="static" elevation={0} sx={{ ...MATTE_HEADER }}>
        <Toolbar sx={{ gap: 1 }}>
          <ZpcNavLogo size={40} animateStroke={false} onNavigate={() => navigate('/home')} />
          <IconButton onClick={() => navigate('/home')} sx={{ color: '#EBE6D4' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 600, color: '#EBE6D4' }}>
            Saved properties
          </Typography>
          <HeaderLogoutButton ink="light" />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {properties.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <FavoriteBorderIcon sx={{ fontSize: 72, color: '#D1D5DB', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 1, fontWeight: 700, color: '#16302A' }}>
              No saved properties
            </Typography>
            <Typography sx={{ color: '#5C675F', mb: 2 }}>
              Save listings you like from a property page. They will show up here.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/search')} sx={{ bgcolor: '#16302A' }}>
              Browse properties
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            {properties.map((property) => (
              <Card
                key={property.id}
                sx={{ borderRadius: 3, ...MATTE_SURFACE, cursor: 'pointer', '&:hover': { transform: 'translateY(-2px)' } }}
                onClick={() => navigate(`/property/${property.id}`)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{property.title}</Typography>
                    <IconButton
                      size="small"
                      aria-label="Remove from saved"
                      onClick={(event) => handleUnsave(event, property.id)}
                      sx={{ color: '#EF4444', mt: -0.5, mr: -0.5 }}
                    >
                      <FavoriteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {property.propertyCode} · {property.propertyType}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOnIcon sx={{ fontSize: 16, mr: 0.5, color: '#6B7280' }} />
                    <Typography variant="body2" color="text.secondary">
                      {property.location || [property.city, property.state].filter(Boolean).join(', ') || '—'}
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ color: '#16302A', fontWeight: 700, mb: 1 }}>
                    {formatPrice(property.price)}
                  </Typography>
                  <Chip
                    label={property.listingType || property.status}
                    size="small"
                    sx={{ bgcolor: 'rgba(22,48,42,0.1)', color: '#16302A', fontWeight: 700 }}
                  />
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Container>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SavedProperties;
