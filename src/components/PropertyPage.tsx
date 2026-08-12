import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Rating,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddIcon from '@mui/icons-material/Add';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useApolloClient } from '@apollo/client';
import {
  CREATE_PROPERTY_RATING,
  GET_PROPERTY,
  GET_PROPERTY_RATINGS,
  REMOVE_SAVED_PROPERTY,
  SAVE_PROPERTY,
} from '../graphql/property';
import { Property, PropertyRating } from '../types/property';
import { PropertyService } from '../services/propertyService';
import { useAuth } from '../contexts/AuthContext';
import { MATTE_SURFACE, PAGE_ATMOSPHERE } from '../theme/surfaces';
import { ZPC_COLORS, ZPC_FONTS } from '../theme/zpcTheme';
import ShareSymbol from './icons/ShareSymbol';

const COVER_FALLBACK =
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1400&h=420&fit=crop';

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
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info',
  });

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
  const isOwner = !!user?.id && !!property?.createdBy && String(user.id) === String(property.createdBy);
  const underReview = ['UNDER_REVIEW', 'PENDING_VERIFICATION', 'PENDING'].includes(
    String(property?.status || '').toUpperCase()
  ) || String(property?.verificationStatus || '').toUpperCase() === 'UNDER_REVIEW';

  const documentFeatures = useMemo(() => {
    // Features aren't on GET_PROPERTY yet — parse from description lines until get-media exists
    const lines = String(property?.description || '').split('\n');
    const docs: string[] = [];
    for (const line of lines) {
      if (line.toLowerCase().startsWith('documents attached:')) {
        docs.push(
          ...line
            .slice('documents attached:'.length)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        );
      }
    }
    return docs;
  }, [property?.description]);

  const ratingBuckets = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    ratings.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.overallRating || 0)));
      counts[5 - star] += 1;
    });
    const total = ratings.length || 1;
    return counts.map((c, i) => ({ stars: 5 - i, pct: Math.round((c / total) * 100), count: c }));
  }, [ratings]);

  const formatPrice = (price: number) => {
    if (!price) return 'Price on request';
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

  const locationLabel = [property.city, property.state].filter(Boolean).join(', ') || 'Location TBD';
  const builder = property.builderName || `${property.creatorFirstName || ''} ${property.creatorLastName || ''}`.trim() || 'Builder';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F1F5F4', animation: 'zpcPageIn 340ms cubic-bezier(0.22,1,0.36,1) both' }}>
      {/* Cover */}
      <Box sx={{ position: 'relative', height: { xs: 180, sm: 260 }, overflow: 'hidden' }}>
        <Box
          component="img"
          src={COVER_FALLBACK}
          alt=""
          sx={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.85)' }}
        />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,18,16,0.25) 0%, rgba(10,18,16,0.05) 50%, rgba(241,245,244,1) 100%)' }} />
        <IconButton
          onClick={() => navigate(-1)}
          sx={{ position: 'absolute', top: 12, left: 12, bgcolor: 'rgba(255,255,255,0.88)', '&:hover': { bgcolor: '#fff' } }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 0.75 }}>
          <IconButton onClick={() => navigator.clipboard.writeText(window.location.href)} sx={{ bgcolor: 'rgba(255,255,255,0.88)' }}>
            <ShareSymbol />
          </IconButton>
          <IconButton onClick={handleSaveToggle} sx={{ bgcolor: 'rgba(255,255,255,0.88)' }}>
            {saved ? <FavoriteIcon sx={{ color: '#EF4444' }} /> : <FavoriteBorderIcon />}
          </IconButton>
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ mt: { xs: -4, sm: -6 }, pb: 6, position: 'relative', zIndex: 1 }}>
        {/* Title card */}
        <Box
          sx={{
            ...MATTE_SURFACE,
            bgcolor: '#fff',
            borderRadius: 3,
            p: { xs: 2, sm: 2.5 },
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            mb: 2,
            boxShadow: '0 10px 30px rgba(10,18,16,0.08)',
          }}
        >
          <Box
            component="img"
            src={COVER_FALLBACK}
            alt=""
            sx={{ width: 84, height: 84, borderRadius: 2, objectFit: 'cover', flexShrink: 0 }}
          />
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
              {underReview && (
                <Chip label="Under Review" size="small" sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 700 }} />
              )}
              <Chip label={property.status} size="small" variant="outlined" />
              <Chip label={property.listingType || 'Listing'} size="small" variant="outlined" />
            </Box>
            <Typography sx={{ fontFamily: ZPC_FONTS.display, fontWeight: 700, fontSize: { xs: 20, sm: 24 }, color: ZPC_COLORS.primary }}>
              {property.title}
            </Typography>
            <Typography sx={{ color: '#6B7280', fontSize: 13, mt: 0.35, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {builder}
            </Typography>
            <Typography sx={{ color: '#6B7280', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.35 }}>
              <LocationOnIcon sx={{ fontSize: 16 }} /> {locationLabel}
            </Typography>
            <Typography sx={{ color: '#9CA3AF', fontSize: 12.5, mt: 0.25 }}>
              {property.propertyType || 'Residential Project'} · {formatPrice(property.price)}
            </Typography>
          </Box>
          {isOwner && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" sx={{ textTransform: 'none', borderRadius: 2 }} disabled>
                Change Photo
              </Button>
              <Button
                variant="contained"
                sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ZPC_COLORS.primary }}
                onClick={() => setSnackbar({ open: true, message: 'Edit details coming soon', severity: 'info' })}
              >
                Edit Details
              </Button>
            </Box>
          )}
        </Box>

        {/* Stats */}
        <Box
          sx={{
            bgcolor: '#fff',
            borderRadius: 3,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            mb: 2.5,
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(10,18,16,0.05)',
          }}
        >
          {[
            { value: String(property.saveCount ?? 0), label: 'Followers' },
            { value: property.reraId?.trim() || '—', label: 'RERA NO' },
            { value: property.averageRating ? property.averageRating.toFixed(1) : 'N/A', label: 'Rating' },
            { value: String(property.ratingCount ?? ratings.length), label: 'Reviews' },
          ].map((stat, idx) => (
            <Box
              key={stat.label}
              sx={{
                py: 2,
                px: 1,
                textAlign: 'center',
                borderRight: idx < 3 ? '1px solid #E5E7EB' : 'none',
              }}
            >
              <Typography sx={{ fontWeight: 800, color: ZPC_COLORS.primary, fontSize: { xs: 14, sm: 18 }, wordBreak: 'break-all' }}>
                {stat.value}
              </Typography>
              <Typography sx={{ color: '#9CA3AF', fontSize: 12, mt: 0.25 }}>{stat.label}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.7fr 1fr' }, gap: 2.5 }}>
          <Box sx={{ display: 'grid', gap: 2.5 }}>
            {/* Documents */}
            <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: 2.25, boxShadow: '0 4px 16px rgba(10,18,16,0.05)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.75 }}>
                <Typography sx={{ fontWeight: 700, color: ZPC_COLORS.primary, fontFamily: ZPC_FONTS.display }}>
                  Property Documents
                </Typography>
                {isOwner && (
                  <Button size="small" startIcon={<AddIcon />} sx={{ textTransform: 'none' }} disabled>
                    Add Document
                  </Button>
                )}
              </Box>
              {documentFeatures.length === 0 ? (
                <Typography sx={{ color: '#9CA3AF', fontSize: 13.5, mb: 1.5 }}>No documents uploaded yet.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mb: 1.5 }}>
                  {documentFeatures.map((name) => (
                    <Box
                      key={name}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        border: '1px solid #E5E7EB',
                        borderRadius: 2,
                        px: 1.25,
                        py: 1,
                        minWidth: 180,
                      }}
                    >
                      {name.toLowerCase().includes('pdf') ? (
                        <PictureAsPdfIcon sx={{ color: '#DC2626' }} />
                      ) : (
                        <InsertDriveFileIcon sx={{ color: ZPC_COLORS.primary }} />
                      )}
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>{name}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              <Box
                sx={{
                  border: '1.5px dashed #D1D5DB',
                  borderRadius: 2,
                  py: 2.5,
                  textAlign: 'center',
                  color: '#9CA3AF',
                }}
              >
                <CloudUploadIcon />
                <Typography sx={{ fontSize: 13 }}>Upload New</Typography>
              </Box>
            </Box>

            {/* Updates */}
            <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: 2.25, boxShadow: '0 4px 16px rgba(10,18,16,0.05)', minHeight: 220 }}>
              <Typography sx={{ fontWeight: 700, color: ZPC_COLORS.primary, fontFamily: ZPC_FONTS.display, mb: 3 }}>
                Updates
              </Typography>
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography sx={{ fontWeight: 750, color: '#111827', mb: 0.75 }}>No Updates Yet</Typography>
                <Typography sx={{ color: '#9CA3AF', fontSize: 13.5, mb: 2 }}>
                  You haven&apos;t posted any updates for this property yet.
                </Typography>
                {isOwner && (
                  <Button
                    variant="outlined"
                    sx={{ textTransform: 'none', borderRadius: 2, borderColor: ZPC_COLORS.primary, color: ZPC_COLORS.primary }}
                    onClick={() => navigate('/home')}
                  >
                    Create Post
                  </Button>
                )}
              </Box>
            </Box>

            {/* Description */}
            <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: 2.25, boxShadow: '0 4px 16px rgba(10,18,16,0.05)' }}>
              <Typography sx={{ fontWeight: 700, color: ZPC_COLORS.primary, fontFamily: ZPC_FONTS.display, mb: 1 }}>
                About
              </Typography>
              <Typography sx={{ color: '#4B5563', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontSize: 14 }}>
                {property.description || 'No description provided.'}
              </Typography>
            </Box>
          </Box>

          {/* Ratings sidebar */}
          <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: 2.25, boxShadow: '0 4px 16px rgba(10,18,16,0.05)', alignSelf: 'start' }}>
            <Typography sx={{ fontWeight: 700, color: ZPC_COLORS.primary, fontFamily: ZPC_FONTS.display, mb: 1.5 }}>
              Ratings & Reviews
            </Typography>
            <Typography sx={{ fontSize: 36, fontWeight: 800, color: ZPC_COLORS.primary, lineHeight: 1 }}>
              {property.averageRating ? property.averageRating.toFixed(1) : 'N/A'}
            </Typography>
            <Rating
              value={property.averageRating || 0}
              readOnly
              precision={0.5}
              emptyIcon={<StarBorderIcon fontSize="inherit" />}
              sx={{ my: 0.75 }}
            />
            <Typography sx={{ color: '#9CA3AF', fontSize: 12.5, mb: 2 }}>
              Based on {property.ratingCount ?? ratings.length} reviews
            </Typography>

            <Box sx={{ display: 'grid', gap: 1, mb: 2 }}>
              {ratingBuckets.map((b) => (
                <Box key={b.stars} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ width: 42, fontSize: 12, color: '#6B7280' }}>{b.stars} star</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={ratings.length ? b.pct : 0}
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: 99,
                      bgcolor: '#E5E7EB',
                      '& .MuiLinearProgress-bar': { bgcolor: ZPC_COLORS.primary, borderRadius: 99 },
                    }}
                  />
                  <Typography sx={{ width: 32, fontSize: 12, color: '#9CA3AF', textAlign: 'right' }}>{b.pct}%</Typography>
                </Box>
              ))}
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={() => setRatingDialogOpen(true)}
              sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ZPC_COLORS.primary, mb: 2 }}
            >
              Add Review
            </Button>

            {ratings.length === 0 ? (
              <Typography sx={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, py: 1 }}>No reviews yet.</Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 1.25, maxHeight: 320, overflow: 'auto' }}>
                {ratings.map((r) => (
                  <Box key={r.id} sx={{ border: '1px solid #E5E7EB', borderRadius: 2, p: 1.25 }}>
                    <Rating value={r.overallRating} readOnly size="small" />
                    <Typography sx={{ fontWeight: 650, fontSize: 13.5, mt: 0.35 }}>{r.title || 'Review'}</Typography>
                    <Typography sx={{ color: '#6B7280', fontSize: 13 }}>{r.review}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
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
