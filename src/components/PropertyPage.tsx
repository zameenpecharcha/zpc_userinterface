import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Rating,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
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
import { GET_PROPERTY_POSTS, CREATE_POST } from '../graphql/posts';
import { Property, PropertyRating } from '../types/property';
import { PropertyService } from '../services/propertyService';
import { useAuth } from '../contexts/AuthContext';
import CreatePost from './CreatePost';
import { MATTE_SURFACE, MATTE_HEADER, PAGE_ATMOSPHERE, MATTE_INSET } from '../theme/surfaces';
import ShareSymbol from './icons/ShareSymbol';
import { ZpcNavLogo } from './brand/ZpcNavLogo';
import HeaderLogoutButton from './HeaderLogoutButton';
import ScrollablePageShell from './layout/ScrollablePageShell';
import { formatRelativeTime } from '../utils/datetime';
import { postCategoryLabel, categoryFromTitle } from '../constants/postCategories';

const COVER_FALLBACK =
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1400&h=420&fit=crop';
const API_GATEWAY_URL = (process.env.REACT_APP_API_GATEWAY_URL || 'http://localhost:8080').replace(/\/$/, '');

const CARD_RADIUS = 2;
const interFont = {
  fontFamily: "'DM Sans', 'Source Sans 3', system-ui, sans-serif",
};
const displayFont = {
  fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif",
};

const PropertyPage: React.FC = () => {
  const navigate = useNavigate();
  const { propertyId } = useParams<{ propertyId: string }>();
  const { user } = useAuth();
  const client = useApolloClient();
  const isMobile = useMediaQuery('(max-width:900px)');
  const propertyService = useMemo(() => new PropertyService(client), [client]);

  const [saved, setSaved] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [cpSubmitting, setCpSubmitting] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);
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

  const {
    data: postsData,
    loading: postsLoading,
    fetchMore: fetchMorePosts,
    refetch: refetchPosts,
  } = useQuery(GET_PROPERTY_POSTS, {
    variables: { propertyId: propertyId || '', page: 1, limit: 8 },
    skip: !propertyId,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'ignore',
  });

  const [saveProperty] = useMutation(SAVE_PROPERTY);
  const [removeSavedProperty] = useMutation(REMOVE_SAVED_PROPERTY);
  const [createPropertyRating] = useMutation(CREATE_PROPERTY_RATING);
  const [createPostMutation] = useMutation(CREATE_POST);

  useEffect(() => {
    if (propertyId && user?.id) {
      propertyService.recordPropertyView(propertyId).catch(() => undefined);
    }
  }, [propertyId, user?.id, propertyService]);

  const property: Property | undefined = data?.property;
  const ratings: PropertyRating[] = ratingsData?.propertyRatings || [];
  const propertyPosts = postsData?.propertyPosts?.posts || [];
  const postsPage = postsData?.propertyPosts?.page || 1;
  const postsTotalPages = postsData?.propertyPosts?.totalPages || 1;
  const postsHasMore = postsPage < postsTotalPages;
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const isOwner = !!user?.id && !!property?.createdBy && String(user.id) === String(property.createdBy);
  const underReview = ['UNDER_REVIEW', 'PENDING_VERIFICATION', 'PENDING'].includes(
    String(property?.status || '').toUpperCase()
  ) || String(property?.verificationStatus || '').toUpperCase() === 'UNDER_REVIEW';

  const documentFeatures = useMemo(() => {
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
        setSnackbar({ open: true, message: 'Saved. Open Saved properties from the profile menu.', severity: 'success' });
      }
    } catch {
      setSnackbar({ open: true, message: 'Failed to update saved status', severity: 'error' });
    }
  };

  const handleCreatePost = useCallback(async (postData: any) => {
    if (!user?.id) {
      setCpError('You must be signed in to create a post.');
      return;
    }
    setCpError(null);
    setCpSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authorization token found. Please sign in again.');

      const uploadedMedia: { name: string; url: string; contentType: string }[] = [];
      if (postData.media && postData.media.length > 0) {
        for (const file of postData.media) {
          const qs = new URLSearchParams({
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
          }).toString();
          const presignRes = await fetch(`${API_GATEWAY_URL}/api/v1/uploads/presign-post-media?${qs}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!presignRes.ok) {
            const errorText = await presignRes.text();
            throw new Error(`Failed to get upload URL: ${presignRes.status} ${errorText}`);
          }
          const { url, publicUrl } = await presignRes.json();
          if (!url || !publicUrl) throw new Error('Upload service returned an incomplete response.');
          const putRes = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            body: file,
          });
          if (!putRes.ok) {
            const errorText = await putRes.text();
            throw new Error(`Failed to upload media: ${putRes.status} ${errorText}`);
          }
          uploadedMedia.push({
            name: file.name,
            url: publicUrl,
            contentType: file.type || 'application/octet-stream',
          });
        }
      }

      const { data, errors } = await createPostMutation({
        variables: {
          userId: String(user.id),
          title: postData.title,
          content: postData.content,
          visibility: postData.visibility || 'public',
          propertyType: postData.type,
          location: postData.location || property?.location || property?.city || '',
          price: 0,
          status: 'active',
          latitude: postData.latitude ?? null,
          longitude: postData.longitude ?? null,
          propertyId: propertyId || postData.propertyId || null,
          media:
            uploadedMedia.length > 0
              ? uploadedMedia.map((media, index) => ({
                  mediaType: media.contentType.startsWith('video/') ? 'VIDEO' : 'IMAGE',
                  mediaOrder: index + 1,
                  filePath: media.url,
                  fileName: media.name,
                  contentType: media.contentType,
                }))
              : null,
        },
        errorPolicy: 'all',
      });

      if (errors?.length && !data?.createPost?.success) {
        throw new Error(errors.map((e: any) => e.message).join('; ') || 'Failed to create post');
      }
      if (!data?.createPost?.success) {
        throw new Error(data?.createPost?.message || 'Failed to create post');
      }

      setCreateOpen(false);
      setCpError(null);
      setSnackbar({ open: true, message: 'Post published', severity: 'success' });
      try {
        await refetchPosts();
      } catch {
        /* keep the created post even if refresh fails */
      }
    } catch (error: any) {
      setCpError(error?.message || 'Failed to create post');
    } finally {
      setCpSubmitting(false);
    }
  }, [user?.id, createPostMutation, propertyId, property?.location, property?.city, refetchPosts]);

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

  const loadMorePosts = async () => {
    if (!propertyId || loadingMorePosts || !postsHasMore) return;
    setLoadingMorePosts(true);
    try {
      await fetchMorePosts({
        variables: { propertyId, page: postsPage + 1, limit: 8 },
        updateQuery: (prev: any, { fetchMoreResult }: any) => {
          const incoming = fetchMoreResult?.propertyPosts;
          if (!incoming) return prev;
          const existing = prev?.propertyPosts?.posts || [];
          const seen = new Set(existing.map((p: any) => String(p.id)));
          const appended = (incoming.posts || []).filter((p: any) => !seen.has(String(p.id)));
          return {
            ...prev,
            propertyPosts: {
              ...incoming,
              posts: [...existing, ...appended],
            },
          };
        },
      });
    } finally {
      setLoadingMorePosts(false);
    }
  };

  const goBack = () => navigate(-1);

  const propertyHeader = (
    <AppBar position="static" elevation={0} sx={{ ...MATTE_HEADER, borderRadius: 0, zIndex: 1201 }}>
      <Toolbar sx={{ justifyContent: 'flex-start', px: { xs: 1, sm: 2 }, minHeight: { xs: 56, sm: 64 }, gap: 1, bgcolor: 'transparent' }}>
        <ZpcNavLogo size={isMobile ? 32 : 36} animateStroke={false} onNavigate={() => navigate('/home')} />
        <IconButton onClick={goBack} size={isMobile ? 'small' : 'medium'} sx={{ color: '#EBE6D4' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#EBE6D4', fontSize: { xs: '1rem', sm: '1.25rem' }, flex: 1 }}>
          Property
        </Typography>
        <HeaderLogoutButton ink="light" size={isMobile ? 'small' : 'medium'} />
      </Toolbar>
    </AppBar>
  );

  if (loading && !property) {
    return (
      <Box sx={{ ...PAGE_ATMOSPHERE, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', ...interFont }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ color: '#16302A', mb: 2 }} />
          <Typography sx={{ color: '#6B7280' }}>Loading property...</Typography>
        </Box>
      </Box>
    );
  }

  if (error || !property) {
    return (
      <ScrollablePageShell header={propertyHeader} sx={{ ...interFont }}>
        <Box sx={{ px: { xs: 1.25, sm: 2 }, py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100%' }}>
          <Alert severity="error" sx={{ maxWidth: 400, width: '100%' }}>
            Property not found
          </Alert>
        </Box>
      </ScrollablePageShell>
    );
  }

  const locationLabel = [property.city, property.state].filter(Boolean).join(', ') || 'Location TBD';
  const builder = property.builderName || `${property.creatorFirstName || ''} ${property.creatorLastName || ''}`.trim() || 'Builder';
  const avgRating = property.averageRating || 0;
  const reviewCount = property.ratingCount ?? ratings.length;

  return (
    <>
    <ScrollablePageShell header={propertyHeader} sx={{ ...interFont }}>
      <Box sx={{ position: 'relative', zIndex: 1, px: { xs: 1.25, sm: 2 }, pb: { xs: 3, sm: 4 } }}>
        <Box sx={{ maxWidth: 1128, mx: 'auto' }}>
          <Box sx={{ ...MATTE_SURFACE, borderRadius: CARD_RADIUS, overflow: 'hidden', mb: 1.5 }}>
            <Box
              component="img"
              src={COVER_FALLBACK}
              alt=""
              sx={{
                width: '100%',
                height: { xs: 120, sm: 160, md: 200 },
                objectFit: 'cover',
                display: 'block',
              }}
            />

            <Box sx={{ px: { xs: 1.5, sm: 2.5 }, pb: { xs: 1.5, sm: 2 }, pt: 0 }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'flex-start' },
                  justifyContent: 'space-between',
                  gap: 1.5,
                  mb: 1.25,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: { xs: 1.5, sm: 2 }, minWidth: 0, mt: { xs: -5, sm: -7 } }}>
                  <Box
                    component="img"
                    src={COVER_FALLBACK}
                    alt=""
                    sx={{
                      width: { xs: 88, sm: 112 },
                      height: { xs: 88, sm: 112 },
                      borderRadius: CARD_RADIUS,
                      objectFit: 'cover',
                      border: '4px solid #EBE6D4',
                      boxShadow: '0 4px 12px rgba(10,18,16,0.18)',
                      flexShrink: 0,
                      bgcolor: '#EBE6D4',
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    width: { xs: '100%', sm: 'auto' },
                    flexShrink: 0,
                    justifyContent: { xs: 'stretch', sm: 'flex-end' },
                    mt: { xs: 0.5, sm: 1.5 },
                  }}
                >
                  <Button
                    variant="outlined"
                    size={isMobile ? 'small' : 'medium'}
                    startIcon={<ShareSymbol />}
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setSnackbar({ open: true, message: 'Link copied', severity: 'success' });
                    }}
                    sx={{
                      borderColor: '#16302A',
                      color: '#16302A',
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 999,
                      flex: { xs: '1 1 auto', sm: '0 0 auto' },
                    }}
                  >
                    Share
                  </Button>
                  {!isOwner && (
                  <Button
                    variant={saved ? 'outlined' : 'contained'}
                    size={isMobile ? 'small' : 'medium'}
                    startIcon={saved ? <FavoriteIcon sx={{ color: '#EF4444' }} /> : <FavoriteBorderIcon />}
                    onClick={handleSaveToggle}
                    sx={{
                      bgcolor: saved ? 'transparent' : '#16302A',
                      borderColor: '#16302A',
                      color: saved ? '#16302A' : '#fff',
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 999,
                      flex: { xs: '1 1 auto', sm: '0 0 auto' },
                      '&:hover': { bgcolor: saved ? 'rgba(22, 48, 42, 0.08)' : '#0A1C18' },
                    }}
                  >
                    {saved ? 'Saved' : 'Save'}
                  </Button>
                  )}
                  {isOwner && (
                    <Button
                      variant="outlined"
                      size={isMobile ? 'small' : 'medium'}
                      onClick={() => navigate(`/create-property?edit=${property.id}`)}
                      sx={{
                        borderColor: '#16302A',
                        color: '#16302A',
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 999,
                        flex: { xs: '1 1 auto', sm: '0 0 auto' },
                      }}
                    >
                      Edit details
                    </Button>
                  )}
                </Box>
              </Box>

              <Box sx={{ minWidth: 0, mt: { xs: 0.5, sm: 0 } }}>
                <Box sx={{ display: 'flex', gap: 0.75, mb: 0.75, flexWrap: 'wrap' }}>
                  {underReview && (
                    <Chip label="Under Review" size="small" sx={{ bgcolor: 'rgba(180,83,9,0.12)', color: '#B45309', fontWeight: 700, height: 22 }} />
                  )}
                  <Chip
                    label={property.status}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22, borderColor: 'rgba(22,48,42,0.28)', color: '#16302A', fontWeight: 650 }}
                  />
                  <Chip
                    label={property.listingType || 'Listing'}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22, borderColor: 'rgba(22,48,42,0.28)', color: '#16302A', fontWeight: 650 }}
                  />
                </Box>
                <Typography
                  sx={{
                    fontWeight: 750,
                    color: '#16302A',
                    mb: 0.35,
                    fontSize: { xs: '1.35rem', sm: '1.65rem' },
                    lineHeight: 1.2,
                    wordBreak: 'break-word',
                    ...displayFont,
                  }}
                >
                  {property.title}
                </Typography>
                <Typography
                  onClick={() => property.createdBy && navigate(`/profile/${property.createdBy}`)}
                  sx={{
                    color: '#3A4540',
                    mb: 0.35,
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.3,
                    cursor: property.createdBy ? 'pointer' : 'default',
                    '&:hover': property.createdBy ? { textDecoration: 'underline' } : undefined,
                  }}
                >
                  {builder}
                </Typography>
                <Typography sx={{ color: '#5C675F', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocationOnIcon sx={{ fontSize: 16 }} /> {locationLabel}
                </Typography>
                <Typography sx={{ color: '#5C675F', fontSize: '0.875rem', mt: 0.25 }}>
                  {String(property.propertyType || 'Residential').replace(/_/g, ' ')} · {formatPrice(property.price)}
                </Typography>
                {property.description ? (
                  <Typography sx={{ color: '#3A4540', fontSize: '0.9rem', mt: 0.75, maxWidth: 560, lineHeight: 1.45 }}>
                    {property.description.split('\n').filter((line) => !line.toLowerCase().startsWith('documents attached:')).join('\n').trim()}
                  </Typography>
                ) : null}
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: { xs: 1.25, sm: 2 },
                  pt: 1.5,
                  mt: 1.25,
                  borderTop: '1px solid rgba(22,48,42,0.1)',
                }}
              >
                <Typography sx={{ fontSize: 14, color: '#5C675F' }}>
                  <Box component="span" sx={{ color: '#16302A', fontWeight: 750 }}>{(property.saveCount ?? 0).toLocaleString()}</Box> followers
                </Typography>
                <Typography sx={{ fontSize: 14, color: '#5C675F' }}>
                  <Box component="span" sx={{ color: '#16302A', fontWeight: 750 }}>{property.reraId?.trim() || '—'}</Box> RERA
                </Typography>
                <Typography sx={{ fontSize: 14, color: '#5C675F' }}>
                  <Box component="span" sx={{ color: '#16302A', fontWeight: 750 }}>{avgRating > 0 ? avgRating.toFixed(1) : '—'}</Box> rating
                  <Box component="span" sx={{ mx: 0.75, color: 'rgba(22,48,42,0.35)' }}>·</Box>
                  <Box component="span" sx={{ color: '#16302A', fontWeight: 750 }}>{reviewCount}</Box> reviews
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 300px' }, gap: 1.5, alignItems: 'start' }}>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ ...MATTE_SURFACE, borderRadius: CARD_RADIUS, px: { xs: 1.5, sm: 2 }, py: 1.5, mb: 1.25, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box>
                <Typography sx={{ fontWeight: 750, color: '#16302A', fontSize: 18, ...displayFont }}>
                  Activity
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#5C675F', mt: 0.25 }}>
                  Updates for this property
                </Typography>
                </Box>
                {isOwner && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setCreateOpen(true)}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      borderRadius: 999,
                      borderColor: '#16302A',
                      color: '#16302A',
                      flexShrink: 0,
                    }}
                  >
                    Create post
                  </Button>
                )}
              </Box>

              {postsLoading && propertyPosts.length === 0 ? (
                <Box sx={{ ...MATTE_SURFACE, borderRadius: CARD_RADIUS, py: 4, textAlign: 'center' }}>
                  <CircularProgress size={28} sx={{ color: '#16302A', mb: 1 }} />
                  <Typography sx={{ color: '#5C675F', fontSize: 13.5 }}>Loading posts...</Typography>
                </Box>
              ) : propertyPosts.length === 0 ? (
                <Box sx={{ ...MATTE_SURFACE, borderRadius: CARD_RADIUS, p: { xs: 2.5, sm: 3.5 }, textAlign: 'center' }}>
                  <Typography sx={{ color: '#16302A', fontWeight: 750, mb: 0.5, fontSize: 16, ...displayFont }}>
                    No posts yet
                  </Typography>
                  <Typography sx={{ color: '#5C675F', fontSize: 13.5 }}>
                    {isOwner
                      ? "When you share an update for this property, it will show up here."
                      : 'No updates have been posted for this property yet.'}
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.25}>
                  {propertyPosts.map((post: any) => {
                    const postType =
                      postCategoryLabel(post.propertyType) || categoryFromTitle(String(post.title || ''));
                    return (
                    <Box key={post.id} sx={{ ...MATTE_SURFACE, borderRadius: CARD_RADIUS, p: { xs: 1.5, sm: 2 }, position: 'relative' }}>
                      {postType ? (
                        <Chip
                          label={postType}
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            height: 22,
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#16302A',
                            bgcolor: 'rgba(22,48,42,0.08)',
                            border: '1px solid rgba(22,48,42,0.16)',
                          }}
                        />
                      ) : null}
                      <Typography sx={{ fontWeight: 700, color: '#16302A', fontSize: 15, mb: 0.35, pr: 10 }}>
                        {post.title || 'Update'}
                      </Typography>
                      {post.content ? (
                        <Typography sx={{ color: '#3A4540', fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                          {post.content}
                        </Typography>
                      ) : null}
                      <Typography sx={{ color: '#5C675F', fontSize: 12, mt: 0.75 }}>
                        {`${post.userFirstName || ''} ${post.userLastName || ''}`.trim() || builder}
                        {post.createdAt ? ` · ${formatRelativeTime(post.createdAt)}` : ''}
                      </Typography>
                    </Box>
                    );
                  })}
                  {postsHasMore && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                      <Button
                        variant="text"
                        size="small"
                        disabled={loadingMorePosts}
                        onClick={loadMorePosts}
                        sx={{ textTransform: 'none', color: '#16302A', fontWeight: 600 }}
                      >
                        {loadingMorePosts ? 'Loading...' : 'Load more posts'}
                      </Button>
                    </Box>
                  )}
                </Stack>
              )}

              <Box sx={{ ...MATTE_SURFACE, borderRadius: CARD_RADIUS, p: { xs: 1.5, sm: 2 }, mt: 1.25 }}>
                <Typography sx={{ fontWeight: 750, color: '#16302A', fontSize: 16, mb: 1.25, ...displayFont }}>
                  Property documents
                </Typography>
                {documentFeatures.length === 0 ? (
                  <Typography sx={{ color: '#5C675F', fontSize: 13.5, mb: 1.25 }}>No documents uploaded yet.</Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mb: 1.25 }}>
                    {documentFeatures.map((name) => (
                      <Box
                        key={name}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          borderRadius: CARD_RADIUS,
                          px: 1.25,
                          py: 1,
                          minWidth: 160,
                          ...MATTE_INSET,
                        }}
                      >
                        {name.toLowerCase().includes('pdf') ? (
                          <PictureAsPdfIcon sx={{ color: '#DC2626' }} />
                        ) : (
                          <InsertDriveFileIcon sx={{ color: '#16302A' }} />
                        )}
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>{name}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                {isOwner && (
                  <Box
                    sx={{
                      border: '1.5px dashed rgba(22,48,42,0.22)',
                      borderRadius: CARD_RADIUS,
                      py: 2,
                      textAlign: 'center',
                      color: '#5C675F',
                    }}
                  >
                    <CloudUploadIcon />
                    <Typography sx={{ fontSize: 13 }}>Upload new</Typography>
                  </Box>
                )}
              </Box>
            </Box>

            <Box sx={{ minWidth: 0, position: { lg: 'sticky' }, top: { lg: 80 } }}>
              <Box sx={{ ...MATTE_SURFACE, borderRadius: CARD_RADIUS, p: { xs: 1.5, sm: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Typography sx={{ fontWeight: 750, color: '#16302A', fontSize: 16, ...displayFont }}>
                    Ratings & Reviews
                  </Typography>
                  {!isOwner && user?.id && (
                    <Button
                      size={isMobile ? 'small' : 'medium'}
                      onClick={() => setRatingDialogOpen(true)}
                      sx={{ color: '#16302A', textTransform: 'none', fontWeight: 600 }}
                    >
                      Add review
                    </Button>
                  )}
                </Box>

                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: '#16302A',
                      mb: 1,
                      fontSize: avgRating > 0 ? { xs: '2rem', sm: '3.75rem' } : { xs: '1.35rem', sm: '1.75rem' },
                      lineHeight: 1.15,
                    }}
                  >
                    {avgRating > 0 ? avgRating.toFixed(1) : 'No Ratings'}
                  </Typography>
                  <Rating
                    value={avgRating}
                    readOnly
                    precision={0.5}
                    emptyIcon={<StarBorderIcon fontSize="inherit" />}
                  />
                  <Typography sx={{ color: '#5C675F', fontSize: 12.5, mt: 0.5 }}>
                    Based on {reviewCount} reviews
                  </Typography>
                </Box>

                <Box sx={{ display: 'grid', gap: 1, mb: 2 }}>
                  {ratingBuckets.map((b) => (
                    <Box key={b.stars} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ width: 42, fontSize: 12, color: '#5C675F' }}>{b.stars} star</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={ratings.length ? b.pct : 0}
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 99,
                          bgcolor: 'rgba(22,48,42,0.1)',
                          '& .MuiLinearProgress-bar': { bgcolor: '#16302A', borderRadius: 99 },
                        }}
                      />
                      <Typography sx={{ width: 32, fontSize: 12, color: '#5C675F', textAlign: 'right' }}>{b.pct}%</Typography>
                    </Box>
                  ))}
                </Box>

                {ratings.length === 0 ? (
                  <Typography sx={{ textAlign: 'center', color: '#5C675F', fontSize: 13, py: 1 }}>No reviews yet.</Typography>
                ) : (
                  <Box sx={{ display: 'grid', gap: 1.25 }}>
                    {ratings.map((r) => (
                      <Box key={r.id} sx={{ ...MATTE_INSET, borderRadius: CARD_RADIUS, p: 1.25 }}>
                        <Rating value={r.overallRating} readOnly size="small" />
                        <Typography sx={{ fontWeight: 650, fontSize: 13.5, mt: 0.35, color: '#16302A' }}>{r.title || 'Review'}</Typography>
                        <Typography sx={{ color: '#5C675F', fontSize: 13 }}>{r.review}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </ScrollablePageShell>

      <CreatePost
        open={createOpen}
        onClose={() => {
          if (!cpSubmitting) {
            setCreateOpen(false);
            setCpError(null);
          }
        }}
        onSubmit={handleCreatePost}
        loading={cpSubmitting}
        error={cpError}
        seed={{
          location: property.location || [property.city, property.state].filter(Boolean).join(', '),
          propertyId: property.id,
          propertyTitle: property.title,
        }}
      />

      <Dialog open={ratingDialogOpen} onClose={() => setRatingDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', color: '#16302A' }}>
          Rate Property
          <IconButton onClick={() => setRatingDialogOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Rating value={ratingValue} onChange={(_, v) => setRatingValue(v)} size="large" sx={{ mb: 2 }} />
          <TextField fullWidth label="Title" value={ratingTitle} onChange={(e) => setRatingTitle(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Review" multiline rows={4} value={ratingReview} onChange={(e) => setRatingReview(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRatingDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!ratingValue}
            onClick={handleSubmitRating}
            sx={{ textTransform: 'none', bgcolor: '#16302A', '&:hover': { bgcolor: '#0A1C18' } }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

export default PropertyPage;
