import React, { useEffect, useMemo, useState } from 'react';
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
  Rating,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useApolloClient } from '@apollo/client';
import {
  GET_PROPERTY,
  GET_PROPERTY_RATINGS,
  CREATE_PROPERTY_RATING,
  SAVE_PROPERTY,
  REMOVE_SAVED_PROPERTY,
} from '../graphql/property';
import { Property, PropertyRating } from '../types/property';
import { PropertyService } from '../services/propertyService';
import { useAuth } from '../contexts/AuthContext';
import { MATTE_SURFACE, MATTE_HEADER, PAGE_ATMOSPHERE } from '../theme/surfaces';
import ShareSymbol from './icons/ShareSymbol';

const PropertyPage: React.FC = () => {
  const navigate = useNavigate();
  const { propertyId } = useParams<{ propertyId: string }>();
  const { user } = useAuth();
  const client = useApolloClient();
  const propertyService = useMemo(() => new PropertyService(client), [client]);

  const [saved, setSaved] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [ratingTitle, setRatingTitle] = useState('');
  const [ratingReview, setRatingReview] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });

  const { loading, error, data } = useQuery(GET_PROPERTY, {
    variables: { propertyId: propertyId || '' },
    skip: !propertyId,
    fetchPolicy: 'cache-and-network',
  });

  const { data: ratingsData, refetch: refetchRatings } = useQuery(GET_PROPERTY_RATINGS, {
    variables: { propertyId: propertyId || '' },
    skip: !propertyId,
  });

  const [saveProperty] = useMutation(SAVE_PROPERTY);
  const [removeSavedProperty] = useMutation(REMOVE_SAVED_PROPERTY);
  const [createPropertyRating] = useMutation(CREATE_PROPERTY_RATING);

  useEffect(() => {
    if (propertyId && user?.id) {
      propertyService.recordPropertyView(propertyId).catch(() => undefined);
    }
  }, [propertyId, user?.id, propertyService]);

  const property: Property | undefined = data?.property;
  const ratings: PropertyRating[] = ratingsData?.propertyRatings || [];

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
    return `₹${price.toLocaleString()}`;
  };

  const handleSaveToggle = async () => {
    if (!user?.id || !propertyId) {
      setSnackbar({ open: true, message: 'Please login to save properties', severity: 'error' });
      return;
    }
    try {
      if (saved) {
        await removeSavedProperty({ variables: { propertyId } });
        setSaved(false);
        setSnackbar({ open: true, message: 'Removed from saved', severity: 'success' });
      } else {
        await saveProperty({ variables: { propertyId } });
        setSaved(true);
        setSnackbar({ open: true, message: 'Property saved', severity: 'success' });
      }
    } catch {
      setSnackbar({ open: true, message: 'Failed to update saved status', severity: 'error' });
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingValue || !propertyId) return;
    try {
      await createPropertyRating({
        variables: {
          propertyId,
          overallRating: ratingValue,
          title: ratingTitle,
          review: ratingReview,
          isAnonymous: false,
        },
      });
      setRatingDialogOpen(false);
      setRatingValue(null);
      setRatingTitle('');
      setRatingReview('');
      refetchRatings();
      setSnackbar({ open: true, message: 'Rating submitted', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to submit rating', severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', ...PAGE_ATMOSPHERE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !property) {
    return (
      <Container sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="error" sx={{ mb: 2 }}>Property not found</Typography>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', ...PAGE_ATMOSPHERE }}>
      <AppBar position="static" elevation={0} sx={{ ...MATTE_HEADER }}>
        <Toolbar>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}><ArrowBackIcon /></IconButton>
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>{property.title}</Typography>
          <IconButton onClick={() => navigator.clipboard.writeText(window.location.href)}><ShareSymbol /></IconButton>
          <IconButton onClick={handleSaveToggle}>
            {saved ? <FavoriteIcon sx={{ color: '#EF4444' }} /> : <FavoriteBorderIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Card sx={{ borderRadius: 3, ...MATTE_SURFACE, mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip label={property.status} size="small" />
              <Chip label={property.verificationStatus} size="small" variant="outlined" />
              <Chip label={property.listingType} size="small" variant="outlined" />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>{property.title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{property.propertyCode}</Typography>
            <Typography variant="h4" sx={{ color: '#10B981', fontWeight: 700, mb: 2 }}>
              {formatPrice(property.price)} {property.currency}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocationIcon sx={{ mr: 1, color: '#6B7280' }} />
              <Typography color="text.secondary">
                {[property.city, property.state, property.country].filter(Boolean).join(', ')}
              </Typography>
            </Box>
            <Typography sx={{ mb: 3, lineHeight: 1.7 }}>{property.description}</Typography>
            <Typography variant="body2" color="text.secondary">
              Listed by {property.creatorFirstName} {property.creatorLastName} · {property.viewCount} views · {property.saveCount} saves
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3, ...MATTE_SURFACE }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Reviews</Typography>
              <Button variant="contained" onClick={() => setRatingDialogOpen(true)}>Add Review</Button>
            </Box>
            <Rating value={property.averageRating} readOnly precision={0.5} sx={{ mb: 2 }} />
            <List>
              {ratings.map((r) => (
                <ListItem key={r.id} alignItems="flex-start" sx={{ flexDirection: 'column', alignItems: 'stretch', mb: 1, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                  <ListItemText
                    primary={r.title || 'Review'}
                    secondary={
                      <>
                        <Rating value={r.overallRating} readOnly size="small" />
                        <Typography variant="body2" sx={{ mt: 1 }}>{r.review}</Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
              {ratings.length === 0 && (
                <Typography color="text.secondary">No reviews yet.</Typography>
              )}
            </List>
          </CardContent>
        </Card>
      </Container>

      <Dialog open={ratingDialogOpen} onClose={() => setRatingDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          Rate Property
          <IconButton onClick={() => setRatingDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Rating value={ratingValue} onChange={(_, v) => setRatingValue(v)} size="large" sx={{ mb: 2 }} />
          <TextField fullWidth label="Title" value={ratingTitle} onChange={(e) => setRatingTitle(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Review" multiline rows={4} value={ratingReview} onChange={(e) => setRatingReview(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRatingDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!ratingValue} onClick={handleSubmitRating}>Submit</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default PropertyPage;
