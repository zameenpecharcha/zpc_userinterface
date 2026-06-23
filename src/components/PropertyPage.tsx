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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ImageList,
  ImageListItem,
  Tabs,
  Tab,
  Avatar,
  Rating,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Badge
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationIcon,
  Home as HomeIcon,
  Villa as VillaIcon,
  Apartment as ApartmentIcon,
  Landscape as LandIcon,
  Visibility as ViewIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Share as ShareIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Bed as BedIcon,
  Bathtub as BathIcon,
  SquareFoot as AreaIcon,
  CalendarToday as YearIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Message as MessageIcon,
  CalendarToday,
  People as PeopleIcon,
  RateReview as RateReviewIcon,
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { 
  GET_PROPERTY, 
  GET_PROPERTY_FOLLOWERS, 
  GET_PROPERTY_RATINGS,
  GET_USER_FOLLOWED_PROPERTIES,
  FOLLOW_PROPERTY,
  CREATE_PROPERTY_RATING,
  Property, 
  PropertyType,
  PropertyRating,
  PropertyFollow
} from '../graphql/property';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`property-tabpanel-${index}`}
      aria-labelledby={`property-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const PropertyPage: React.FC = () => {
  const navigate = useNavigate();
  const { propertyId } = useParams<{ propertyId: string }>();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [ratingTitle, setRatingTitle] = useState('');
  const [ratingReview, setRatingReview] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const { loading, error, data } = useQuery(GET_PROPERTY, {
    variables: { propertyId: propertyId || '' },
    skip: !propertyId,
    fetchPolicy: 'cache-and-network'
  });

  const { data: followersData } = useQuery(GET_PROPERTY_FOLLOWERS, {
    variables: { propertyId: parseInt(propertyId || '0') },
    skip: !propertyId,
    fetchPolicy: 'cache-and-network'
  });

  const { data: ratingsData } = useQuery(GET_PROPERTY_RATINGS, {
    variables: { propertyId: parseInt(propertyId || '0') },
    skip: !propertyId,
    fetchPolicy: 'cache-and-network'
  });

  const { data: followedPropertiesData } = useQuery(GET_USER_FOLLOWED_PROPERTIES, {
    variables: { userId: user?.id || '' },
    skip: !user?.id,
    fetchPolicy: 'cache-and-network'
  });

  const [followProperty] = useMutation(FOLLOW_PROPERTY, {
    refetchQueries: [
      { query: GET_PROPERTY_FOLLOWERS, variables: { propertyId: parseInt(propertyId || '0') } }
    ]
  });

  const [createPropertyRating] = useMutation(CREATE_PROPERTY_RATING, {
    refetchQueries: [
      { query: GET_PROPERTY_RATINGS, variables: { propertyId: parseInt(propertyId || '0') } }
    ]
  });

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFavoriteToggle = () => {
    setIsFavorite(!isFavorite);
    setSnackbar({
      open: true,
      message: isFavorite ? 'Removed from favorites' : 'Added to favorites',
      severity: 'success'
    });
  };

  const handleFollowProperty = async () => {
    if (!user?.id) {
      setSnackbar({
        open: true,
        message: 'Please login to follow properties',
        severity: 'error'
      });
      return;
    }

    try {
      await followProperty({
        variables: {
          userId: String(user.id),  // Explicitly convert to string
          propertyId: String(propertyId || '0'),  // Explicitly convert to string
          status: 'active'
        }
      });
      setSnackbar({
        open: true,
        message: 'Successfully followed property!',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to follow property',
        severity: 'error'
      });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: data?.property?.title,
        text: data?.property?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setSnackbar({
        open: true,
        message: 'Link copied to clipboard!',
        severity: 'success'
      });
    }
  };

  const handleContact = () => {
    setSnackbar({
      open: true,
      message: 'Contact functionality coming soon!',
      severity: 'info'
    });
  };

  const handleOpenRatingDialog = () => {
    setRatingDialogOpen(true);
  };

  const handleCloseRatingDialog = () => {
    setRatingDialogOpen(false);
    setRatingValue(null);
    setRatingTitle('');
    setRatingReview('');
  };

  const handleSubmitRating = async () => {
    if (!user?.id || !ratingValue) {
      setSnackbar({
        open: true,
        message: 'Please provide a rating',
        severity: 'error'
      });
      return;
    }

    try {
      await createPropertyRating({
        variables: {
          propertyId: String(propertyId || '0'),  // Explicitly convert to string
          ratedByUserId: String(user.id),  // Explicitly convert to string
          ratingValue: ratingValue,
          title: ratingTitle,
          review: ratingReview,
          ratingType: 'general',
          isAnonymous: false
        }
      });
      handleCloseRatingDialog();
      setSnackbar({
        open: true,
        message: 'Rating submitted successfully!',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to submit rating',
        severity: 'error'
      });
    }
  };

  const getPropertyIcon = (propertyType: PropertyType) => {
    switch (propertyType) {
      case PropertyType.APARTMENT:
        return <ApartmentIcon sx={{ fontSize: 32, color: '#6366F1' }} />;
      case PropertyType.VILLA:
        return <VillaIcon sx={{ fontSize: 32, color: '#8B5CF6' }} />;
      case PropertyType.HOUSE:
        return <HomeIcon sx={{ fontSize: 32, color: '#10B981' }} />;
      case PropertyType.LAND:
        return <LandIcon sx={{ fontSize: 32, color: '#F59E0B' }} />;
      default:
        return <HomeIcon sx={{ fontSize: 32, color: '#6B7280' }} />;
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
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateAverageRating = (ratings: PropertyRating[]) => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, rating) => acc + rating.ratingValue, 0);
    return sum / ratings.length;
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

  if (error || !data?.property) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F6F8FB' }}>
        <AppBar position="static" sx={{ bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <Toolbar>
            <IconButton onClick={handleGoBack} sx={{ mr: 2, color: '#374151' }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ color: '#111827', fontWeight: 600 }}>
              Property Details
            </Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h5" color="error" sx={{ mb: 2 }}>
            Property not found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {error?.message || 'The property you are looking for does not exist.'}
          </Typography>
          <Button variant="contained" onClick={handleGoBack}>
            Go Back
          </Button>
        </Container>
      </Box>
    );
  }

  const property: Property = data.property;
  const followers: PropertyFollow[] = followersData?.propertyFollowers || [];
  const ratings: PropertyRating[] = ratingsData?.propertyRatings || [];
  const averageRating = calculateAverageRating(ratings);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F6F8FB' }}>
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <Toolbar>
          <IconButton onClick={handleGoBack} sx={{ mr: 2, color: '#374151' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ color: '#111827', fontWeight: 600, flex: 1 }}>
            {property.title}
          </Typography>
          <IconButton onClick={handleShare} sx={{ color: '#374151', mr: 1 }}>
            <ShareIcon />
          </IconButton>
          <IconButton onClick={handleFavoriteToggle} sx={{ color: '#374151' }}>
            {isFavorite ? <FavoriteIcon sx={{ color: '#EF4444' }} /> : <FavoriteBorderIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 4 }}>
          {/* Main Content */}
          <Box>
            {/* Property Images */}
            <Card sx={{ mb: 4, borderRadius: 3, overflow: 'hidden' }}>
              {property.images && property.images.length > 0 ? (
                <ImageList cols={2} rowHeight={300} sx={{ m: 0 }}>
                  {property.images.slice(0, 4).map((image, index) => (
                    <ImageListItem key={index} sx={{ overflow: 'hidden' }}>
                      <img
                        src={image}
                        alt={`${property.title} ${index + 1}`}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          cursor: 'pointer'
                        }}
                      />
                    </ImageListItem>
                  ))}
                </ImageList>
              ) : (
                <Box sx={{ height: 300, bgcolor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography color="text.secondary">No images available</Typography>
                </Box>
              )}
            </Card>

            {/* Property Details */}
            <Card sx={{ mb: 4, borderRadius: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  {getPropertyIcon(property.propertyType)}
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#111827', mb: 1 }}>
                      {property.title}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                  </Box>
                </Box>

                <Typography variant="h3" sx={{ color: '#10B981', fontWeight: 700, mb: 3 }}>
                  {formatPrice(property.price)}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <LocationIcon sx={{ color: '#6B7280', mr: 1 }} />
                  <Typography variant="body1" sx={{ color: '#6B7280' }}>
                    {property.location}
                  </Typography>
                </Box>

                <Typography variant="body1" sx={{ color: '#374151', lineHeight: 1.7, mb: 4 }}>
                  {property.description}
                </Typography>

                {/* Property Features */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
                  <Box>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F9FAFB', borderRadius: 2 }}>
                      <BedIcon sx={{ fontSize: 24, color: '#2563EB', mb: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
                        {property.bedrooms}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280' }}>
                        Bedrooms
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F9FAFB', borderRadius: 2 }}>
                      <BathIcon sx={{ fontSize: 24, color: '#2563EB', mb: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
                        {property.bathrooms}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280' }}>
                        Bathrooms
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F9FAFB', borderRadius: 2 }}>
                      <AreaIcon sx={{ fontSize: 24, color: '#2563EB', mb: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
                        {property.area}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280' }}>
                        Sq Ft
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F9FAFB', borderRadius: 2 }}>
                      <YearIcon sx={{ fontSize: 24, color: '#2563EB', mb: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
                        {property.yearBuilt}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280' }}>
                        Year Built
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Amenities */}
                {property.amenities && property.amenities.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 2 }}>
                      Amenities
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {property.amenities.map((amenity, index) => (
                        <Chip
                          key={index}
                          label={amenity}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(37,99,235,0.1)',
                            color: '#2563EB',
                            fontWeight: 500
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Tabs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="Details" />
                    <Tab label="Location" />
                    <Tab label="Reviews" />
                    <Tab label="Followers" />
                    <Tab label="Followed Properties" />
                  </Tabs>
                </Box>

                <TabPanel value={tabValue} index={0}>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <HomeIcon sx={{ color: '#2563EB' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Property Type"
                        secondary={property.propertyType}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <LocationIcon sx={{ color: '#2563EB' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Address"
                        secondary={property.address}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CalendarToday sx={{ color: '#2563EB' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Listed On"
                        secondary={formatDate(property.createdAt)}
                      />
                    </ListItem>
                  </List>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <Typography variant="body1" sx={{ color: '#374151', mb: 2 }}>
                    <strong>Full Address:</strong> {property.address}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#374151', mb: 2 }}>
                    <strong>City:</strong> {property.city}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#374151', mb: 2 }}>
                    <strong>State:</strong> {property.state}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#374151', mb: 2 }}>
                    <strong>Country:</strong> {property.country}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#374151', mb: 2 }}>
                    <strong>ZIP Code:</strong> {property.zipCode}
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#374151' }}>
                    <strong>Coordinates:</strong> {property.latitude}, {property.longitude}
                  </Typography>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 1 }}>
                        Reviews & Ratings
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Rating value={averageRating} readOnly precision={0.5} />
                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                          ({ratings.length} reviews)
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleOpenRatingDialog}
                      sx={{
                        bgcolor: '#2563EB',
                        '&:hover': { bgcolor: '#1D4ED8' },
                        textTransform: 'none',
                        fontWeight: 600
                      }}
                    >
                      Add Review
                    </Button>
                  </Box>

                  {ratings.length > 0 ? (
                    <List>
                      {ratings.map((rating) => (
                        <Card key={rating.id} sx={{ mb: 2, borderRadius: 2 }}>
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                              <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                                  {rating.title || 'Anonymous Review'}
                                </Typography>
                                <Rating value={rating.ratingValue} readOnly size="small" sx={{ mt: 0.5 }} />
                              </Box>
                              <Typography variant="body2" sx={{ color: '#6B7280' }}>
                                {formatDate(rating.createdAt)}
                              </Typography>
                            </Box>
                            {rating.review && (
                              <Typography variant="body1" sx={{ color: '#374151', lineHeight: 1.6 }}>
                                {rating.review}
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <StarBorderIcon sx={{ fontSize: 48, color: '#D1D5DB', mb: 2 }} />
                      <Typography variant="h6" sx={{ color: '#6B7280', mb: 1 }}>
                        No Reviews Yet
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 3 }}>
                        Be the first to review this property!
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleOpenRatingDialog}
                        sx={{
                          bgcolor: '#2563EB',
                          '&:hover': { bgcolor: '#1D4ED8' },
                          textTransform: 'none',
                          fontWeight: 600
                        }}
                      >
                        Add Review
                      </Button>
                    </Box>
                  )}
                </TabPanel>

                <TabPanel value={tabValue} index={3}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 1 }}>
                        Property Followers
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6B7280' }}>
                        {followers.length} followers
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<PeopleIcon />}
                      onClick={handleFollowProperty}
                      sx={{
                        bgcolor: '#10B981',
                        '&:hover': { bgcolor: '#059669' },
                        textTransform: 'none',
                        fontWeight: 600
                      }}
                    >
                      Follow Property
                    </Button>
                  </Box>

                  {followers.length > 0 ? (
                    <List>
                      {followers.map((follower) => (
                        <Card key={follower.id} sx={{ mb: 2, borderRadius: 2 }}>
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ bgcolor: '#2563EB', width: 40, height: 40 }}>
                                <PeopleIcon />
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827' }}>
                                  User {follower.userId}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#6B7280' }}>
                                  Following since {formatDate(follower.followedAt)}
                                </Typography>
                              </Box>
                              <Chip
                                label={follower.status}
                                size="small"
                                sx={{
                                  bgcolor: follower.status === 'active' ? '#10B981' : '#6B7280',
                                  color: 'white',
                                  fontWeight: 600
                                }}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <PeopleIcon sx={{ fontSize: 48, color: '#D1D5DB', mb: 2 }} />
                      <Typography variant="h6" sx={{ color: '#6B7280', mb: 1 }}>
                        No Followers Yet
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#9CA3AF', mb: 3 }}>
                        Be the first to follow this property!
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<PeopleIcon />}
                        onClick={handleFollowProperty}
                        sx={{
                          bgcolor: '#10B981',
                          '&:hover': { bgcolor: '#059669' },
                          textTransform: 'none',
                          fontWeight: 600
                        }}
                      >
                        Follow Property
                      </Button>
                    </Box>
                  )}
                </TabPanel>
              </CardContent>
            </Card>
          </Box>

          {/* Sidebar */}
          <Box>
            {/* Contact Card */}
            <Card sx={{ mb: 4, borderRadius: 3, position: 'sticky', top: 100 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 3 }}>
                  Contact Owner
                </Typography>
                
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<PhoneIcon />}
                  onClick={handleContact}
                  sx={{
                    bgcolor: '#10B981',
                    mb: 2,
                    py: 1.5,
                    '&:hover': { bgcolor: '#059669' },
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Call Owner
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<EmailIcon />}
                  onClick={handleContact}
                  sx={{
                    borderColor: '#2563EB',
                    color: '#2563EB',
                    mb: 2,
                    py: 1.5,
                    '&:hover': { borderColor: '#1D4ED8', bgcolor: 'rgba(37,99,235,0.04)' },
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Send Message
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<MessageIcon />}
                  onClick={handleContact}
                  sx={{
                    borderColor: '#8B5CF6',
                    color: '#8B5CF6',
                    py: 1.5,
                    '&:hover': { borderColor: '#7C3AED', bgcolor: 'rgba(139,92,246,0.04)' },
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Schedule Visit
                </Button>
              </CardContent>
            </Card>

            {/* Property Stats */}
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827', mb: 3 }}>
                  Property Stats
                </Typography>
                
                <List>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      <ViewIcon sx={{ color: '#2563EB' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Total Views"
                      secondary={property.viewCount || 0}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      <StarIcon sx={{ color: '#F59E0B' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Rating"
                      secondary={ratings.length > 0 ? `${averageRating.toFixed(1)} (${ratings.length} reviews)` : 'No ratings yet'}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      <PeopleIcon sx={{ color: '#10B981' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Followers"
                      secondary={followers.length}
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      <CalendarToday sx={{ color: '#8B5CF6' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Listed"
                      secondary={formatDate(property.createdAt)}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onClose={handleCloseRatingDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Rate This Property
          </Typography>
          <IconButton onClick={handleCloseRatingDialog}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 1, fontWeight: 600 }}>
              Rating
            </Typography>
            <Rating
              value={ratingValue}
              onChange={(event, newValue) => setRatingValue(newValue)}
              size="large"
            />
          </Box>
          <TextField
            fullWidth
            label="Title (optional)"
            value={ratingTitle}
            onChange={(e) => setRatingTitle(e.target.value)}
            sx={{ mb: 3 }}
          />
          <TextField
            fullWidth
            label="Review (optional)"
            value={ratingReview}
            onChange={(e) => setRatingReview(e.target.value)}
            multiline
            rows={4}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseRatingDialog} sx={{ color: '#6B7280' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitRating}
            variant="contained"
            disabled={!ratingValue}
            sx={{
              bgcolor: '#2563EB',
              '&:hover': { bgcolor: '#1D4ED8' },
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            Submit Rating
          </Button>
        </DialogActions>
      </Dialog>

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

export default PropertyPage;
