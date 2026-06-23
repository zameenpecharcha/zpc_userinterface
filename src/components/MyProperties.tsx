import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Grid,
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
  AttachMoney as PriceIcon,
  Home as HomeIcon,
  Villa as VillaIcon,
  Apartment as ApartmentIcon,
  Landscape as LandIcon,
  Visibility as ViewIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_USER_PROPERTIES, Property, PropertyType } from '../graphql/property';
import { useAuth } from '../contexts/AuthContext';

const MyProperties: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const { loading, error, data, refetch } = useQuery(GET_USER_PROPERTIES, {
    variables: { userId: String(user?.id || '') },
    skip: !user?.id,
    fetchPolicy: 'cache-and-network'
  });

  const handleGoBack = () => {
    navigate('/home');
  };

  const handleCreateProperty = () => {
    navigate('/create-property');
  };

  const handlePropertyClick = (propertyId: string) => {
    navigate(`/property/${propertyId}`);
  };

  const getPropertyIcon = (propertyType: PropertyType) => {
    switch (propertyType) {
      case PropertyType.APARTMENT:
        return <ApartmentIcon sx={{ fontSize: 24, color: '#6366F1' }} />;
      case PropertyType.VILLA:
        return <VillaIcon sx={{ fontSize: 24, color: '#8B5CF6' }} />;
      case PropertyType.HOUSE:
        return <HomeIcon sx={{ fontSize: 24, color: '#10B981' }} />;
      case PropertyType.LAND:
        return <LandIcon sx={{ fontSize: 24, color: '#F59E0B' }} />;
      default:
        return <HomeIcon sx={{ fontSize: 24, color: '#6B7280' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#10B981';
      case 'SOLD':
        return '#EF4444';
      case 'RENTED':
        return '#F59E0B';
      case 'INACTIVE':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)}Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)}L`;
    } else {
      return `₹${price.toLocaleString()}`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: '#F6F8FB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress size={60} sx={{ color: '#2563EB' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F6F8FB' }}>
        <AppBar position="static" sx={{ bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <Toolbar>
            <IconButton onClick={handleGoBack} sx={{ mr: 2, color: '#374151' }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ color: '#111827', fontWeight: 600 }}>
              My Properties
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h5" color="error" sx={{ mb: 2 }}>
            Error loading properties
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {error.message}
          </Typography>
          <Button variant="contained" onClick={() => refetch()}>
            Try Again
          </Button>
        </Container>
      </Box>
    );
  }

  const properties = data?.userProperties || [];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F6F8FB' }}>
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <Toolbar>
          <IconButton onClick={handleGoBack} sx={{ mr: 2, color: '#374151' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ color: '#111827', fontWeight: 600, flex: 1 }}>
            My Properties
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateProperty}
            sx={{
              bgcolor: '#2563EB',
              '&:hover': { bgcolor: '#1D4ED8' },
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Create Property
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {properties.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <HomeIcon sx={{ fontSize: 80, color: '#D1D5DB', mb: 2 }} />
            <Typography variant="h5" sx={{ color: '#6B7280', mb: 2, fontWeight: 600 }}>
              No Properties Yet
            </Typography>
            <Typography variant="body1" sx={{ color: '#9CA3AF', mb: 4 }}>
              You haven't created any properties yet. Start by creating your first property listing!
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleCreateProperty}
              sx={{
                bgcolor: '#2563EB',
                px: 4,
                py: 1.5,
                '&:hover': { bgcolor: '#1D4ED8' },
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              Create Your First Property
            </Button>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" sx={{ color: '#111827', fontWeight: 700, mb: 1 }}>
                Your Properties ({properties.length})
              </Typography>
              <Typography variant="body1" sx={{ color: '#6B7280' }}>
                Manage and view all your property listings
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
              {properties.map((property: Property) => (
                <Box key={property.propertyId}>
                  <Card
                    sx={{
                      height: '100%',
                      borderRadius: 3,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                      }
                    }}
                    onClick={() => handlePropertyClick(property.propertyId)}
                  >
                    <CardMedia
                      component="img"
                      height="200"
                      image={property.images && property.images.length > 0 
                        ? property.images[0] 
                        : 'https://via.placeholder.com/400x200?text=No+Image'
                      }
                      alt={property.title}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        {getPropertyIcon(property.propertyType)}
                        <Typography variant="h6" sx={{ ml: 1, fontWeight: 700, color: '#111827' }}>
                          {property.title}
                        </Typography>
                      </Box>

                      <Typography variant="body2" sx={{ color: '#6B7280', mb: 2, lineHeight: 1.5 }}>
                        {property.description.length > 100 
                          ? `${property.description.substring(0, 100)}...` 
                          : property.description
                        }
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <LocationIcon sx={{ fontSize: 16, color: '#6B7280', mr: 0.5 }} />
                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                          {property.location}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PriceIcon sx={{ fontSize: 16, color: '#10B981', mr: 0.5 }} />
                        <Typography variant="h6" sx={{ color: '#10B981', fontWeight: 700 }}>
                          {formatPrice(property.price)}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Chip
                          label={property.status}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(property.status),
                            color: 'white',
                            fontWeight: 600
                          }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <ViewIcon sx={{ fontSize: 16, color: '#6B7280', mr: 0.5 }} />
                          <Typography variant="body2" sx={{ color: '#6B7280' }}>
                            {property.viewCount || 0} views
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                          Created {formatDate(property.createdAt)}
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          sx={{
                            color: '#2563EB',
                            textTransform: 'none',
                            fontWeight: 600,
                            '&:hover': { bgcolor: 'rgba(37,99,235,0.08)' }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Navigate to edit property page
                            setSnackbar({
                              open: true,
                              message: 'Edit functionality coming soon!',
                              severity: 'info'
                            });
                          }}
                        >
                          Edit
                        </Button>
                      </Box>
                                         </CardContent>
                   </Card>
                 </Box>
               ))}
             </Box>
          </>
        )}
      </Container>

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        aria-label="Create Property"
        onClick={handleCreateProperty}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          bgcolor: '#2563EB',
          '&:hover': { bgcolor: '#1D4ED8' },
          display: { xs: 'flex', md: 'none' }
        }}
      >
        <AddIcon />
      </Fab>

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

export default MyProperties;
