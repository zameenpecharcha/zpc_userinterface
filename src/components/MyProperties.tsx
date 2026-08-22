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
  Fab
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  LocationOn as LocationIcon,
  Home as HomeIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { MY_PROPERTIES } from '../graphql/property';
import { Property } from '../types/property';
import { ZpcNavLogo } from './brand/ZpcNavLogo';
import HeaderLogoutButton from './HeaderLogoutButton';
import { MATTE_SURFACE, MATTE_HEADER, PAGE_ATMOSPHERE } from '../theme/surfaces';
import ScrollablePageShell from './layout/ScrollablePageShell';

const statusColor = (status: string) => {
  switch (String(status || '').toUpperCase()) {
    case 'PUBLISHED': return '#10B981';
    case 'UNDER_REVIEW':
    case 'PENDING_VERIFICATION':
    case 'PENDING': return '#D97706';
    case 'REJECTED': return '#EF4444';
    case 'DRAFT': return '#6B7280';
    case 'SOLD': return '#EF4444';
    case 'RENTED': return '#F59E0B';
    default: return '#6B7280';
  }
};

const formatPrice = (price: number) => {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
  return `₹${price.toLocaleString()}`;
};

const MyProperties: React.FC = () => {
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'success' | 'error' | 'info' });

  const { loading, error, data, refetch } = useQuery(MY_PROPERTIES, {
    variables: { page: 1, limit: 50 },
    fetchPolicy: 'cache-and-network',
  });

  const properties: Property[] = data?.myProperties?.properties || [];

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', ...PAGE_ATMOSPHERE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={60} sx={{ color: '#2563EB' }} />
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

  const listHeader = (
    <AppBar position="static" elevation={0} sx={{ ...MATTE_HEADER }}>
      <Toolbar sx={{ gap: 1 }}>
        <ZpcNavLogo size={40} animateStroke={false} />
        <IconButton onClick={() => navigate('/home')} sx={{ color: '#EBE6D4' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flex: 1, fontWeight: 600, color: '#EBE6D4' }}>My Properties</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/create-property')}>
          Create Property
        </Button>
        <HeaderLogoutButton ink="light" />
      </Toolbar>
    </AppBar>
  );

  return (
    <>
    <ScrollablePageShell header={listHeader}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {properties.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <HomeIcon sx={{ fontSize: 80, color: '#D1D5DB', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2 }}>No Properties Yet</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/create-property')}>
              Create Your First Property
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
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>{property.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {property.propertyCode} · {property.propertyType}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationIcon sx={{ fontSize: 16, mr: 0.5, color: '#6B7280' }} />
                    <Typography variant="body2" color="text.secondary">
                      {[property.city, property.state].filter(Boolean).join(', ') || '—'}
                    </Typography>
                  </Box>
                  <Typography variant="h6" sx={{ color: '#10B981', fontWeight: 700, mb: 1 }}>
                    {formatPrice(property.price)}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip label={property.status} size="small" sx={{ bgcolor: statusColor(property.status), color: '#fff' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <ViewIcon sx={{ fontSize: 16, mr: 0.5, color: '#6B7280' }} />
                      <Typography variant="caption">{property.viewCount} views</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Container>
    </ScrollablePageShell>

      <Fab color="primary" onClick={() => navigate('/create-property')} sx={{ position: 'fixed', bottom: 16, right: 16, display: { xs: 'flex', md: 'none' } }}>
        <AddIcon />
      </Fab>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

export default MyProperties;
