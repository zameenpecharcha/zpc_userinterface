import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLazyQuery } from '@apollo/client';
import { SEARCH_USERS_LIGHT } from '../graphql/user';
import { PUBLIC_PROPERTIES } from '../graphql/property';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Modal,
  Select,
  MenuItem,
  FormControl,
  Chip,
  IconButton,
  Divider,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  CircularProgress,
  Alert,
  Grow,
} from '@mui/material';
// Removed Grid import to avoid dependency on Unstable_Grid2; using CSS grid instead
import {
  Home as HomeIcon,
  Lightbulb as LightbulbIcon,
  Forum as ForumIcon,
  Flag as FlagIcon,
  Close as CloseIcon,
  LocationOn as LocationIcon,
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon
} from '@mui/icons-material';
import LocationAutocomplete from './LocationAutocomplete';
import { MATTE_SURFACE, MATTE_INSET, THIN_CREAM_SCROLLBAR } from '../theme/surfaces';
import { expandPrettyMentions, getTextareaCaretOffset } from '../utils/mentions';
import { ZPC_MOTION } from '../theme/motion';

const interFont = {
  fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif",
};

interface CreatePostProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (postData: any) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
}

const CreatePost: React.FC<CreatePostProps> = ({ open, onClose, onSubmit, loading = false, error = null }) => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [visibility, setVisibility] = useState('public');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState({ top: 0, left: 0 });
  const mentionedUserIdsRef = useRef<Set<string>>(new Set());
  const mentionedUserNamesRef = useRef<Map<string, string>>(new Map());
  const mentionedPropertyNamesRef = useRef<Map<string, string>>(new Map());
  const descriptionRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const descriptionWrapRef = useRef<HTMLDivElement | null>(null);
  const mentionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchUsers, { data: mentionData, loading: mentionLoading, error: mentionError }] = useLazyQuery(
    SEARCH_USERS_LIGHT,
    { fetchPolicy: 'network-only', nextFetchPolicy: 'cache-first', errorPolicy: 'all' }
  );
  const [searchPropertiesQuery, { data: propertyMentionData, loading: propertyMentionLoading, error: propertyMentionError }] = useLazyQuery(
    PUBLIC_PROPERTIES,
    { fetchPolicy: 'network-only', nextFetchPolicy: 'cache-first', errorPolicy: 'all' }
  );

  const postTypes = [
    {
      id: 'buy-sell',
      title: 'Buy/Sell',
      icon: <HomeIcon sx={{ fontSize: 32, color: '#16302A' }} />,
      description: 'Buy or sell properties'
    },
    {
      id: 'suggestion',
      title: 'Suggestion',
      icon: <LightbulbIcon sx={{ fontSize: 32, color: '#5F8670' }} />,
      description: 'Share your ideas'
    },
    {
      id: 'discussion',
      title: 'Discussion',
      icon: <ForumIcon sx={{ fontSize: 32, color: '#A89F84' }} />,
      description: 'Start a conversation'
    },
    {
      id: 'flag-area',
      title: 'Flag an Area',
      icon: <FlagIcon sx={{ fontSize: 32, color: '#16302A' }} />,
      description: 'Report issues'
    }
  ];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    
    setUploadedFiles(prev => [...prev, ...validFiles].slice(0, 10)); // Limit to 10 files
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...files].slice(0, 10));
    }
  }, []);

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleLocationSelect = (locationData: { address: string; latitude: number; longitude: number }) => {
    // Truncate location to up to 2 commas
    const truncatedLocation = locationData.address.split(',').slice(0, 3).join(',').trim();
    setLocation(truncatedLocation);
    setLatitude(locationData.latitude);
    setLongitude(locationData.longitude);
  };

  const updateMentionAnchor = (el: HTMLTextAreaElement | HTMLInputElement, cursorPos: number) => {
    const coords = getTextareaCaretOffset(el, cursorPos);
    const fieldRect = el.getBoundingClientRect();
    const wrapRect = descriptionWrapRef.current?.getBoundingClientRect();
    const offsetTop = wrapRect ? fieldRect.top - wrapRect.top : el.offsetTop;
    const offsetLeft = wrapRect ? fieldRect.left - wrapRect.left : el.offsetLeft;
    const panelWidth = 280;
    const maxLeft = Math.max(8, (wrapRect?.width || fieldRect.width) - panelWidth - 8);
    setMentionAnchor({
      top: offsetTop + coords.top + coords.height + 4,
      left: Math.min(Math.max(8, offsetLeft + coords.left), maxLeft),
    });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDescription(value);

    const cursorPos = e.target.selectionStart ?? value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([\w\s]*)$/);

    if (mentionTimerRef.current) {
      clearTimeout(mentionTimerRef.current);
      mentionTimerRef.current = null;
    }

    if (atMatch) {
      const searchTerm = atMatch[1] || '';
      setMentionOpen(true);
      setMentionSearch(searchTerm);
      setMentionStart(cursorPos - atMatch[0].length);
      updateMentionAnchor(e.target, cursorPos);
      mentionTimerRef.current = setTimeout(() => {
        const term = searchTerm.trim();
        if (term.length < 2) return;
        searchUsers({ variables: { search: term, page: 1, limit: 8 } });
        const cityToken = term.split(/\s+/)[0];
        if (cityToken.length >= 2) {
          searchPropertiesQuery({ variables: { city: cityToken, page: 1, limit: 8 } });
        }
      }, 280);
    } else {
      setMentionOpen(false);
      setMentionSearch('');
      setMentionStart(null);
    }
  };

  const handleSelectMention = (user: { id: string; firstName: string; lastName?: string }) => {
    if (mentionStart === null) return;
    const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
    const token = `@${displayName}`;
    const before = description.slice(0, mentionStart);
    const after = description.slice(mentionStart + 1 + mentionSearch.length);
    const nextDescription = `${before}${token} ${after}`.slice(0, 500);
    setDescription(nextDescription);
    mentionedUserIdsRef.current.add(user.id);
    mentionedUserNamesRef.current.set(displayName, user.id);
    setMentionOpen(false);
    setMentionSearch('');
    setMentionStart(null);
    setTimeout(() => descriptionRef.current?.focus(), 0);
  };

  const handleSelectPropertyMention = (prop: { id: string; title: string }) => {
    if (mentionStart === null) return;
    const label = (prop.title || 'Property').replace(/[\[\]]/g, '').slice(0, 40);
    const token = `@${label}`;
    const before = description.slice(0, mentionStart);
    const after = description.slice(mentionStart + 1 + mentionSearch.length);
    const nextDescription = `${before}${token} ${after}`.slice(0, 500);
    setDescription(nextDescription);
    mentionedPropertyNamesRef.current.set(label, prop.id);
    setMentionOpen(false);
    setMentionSearch('');
    setMentionStart(null);
    setTimeout(() => descriptionRef.current?.focus(), 0);
  };

  const handleSubmit = () => {
    if (!selectedType || !title.trim() || !description.trim() || loading) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    const content = expandPrettyMentions(
      description.trim(),
      mentionedUserNamesRef.current,
      mentionedPropertyNamesRef.current,
    );
    const postData = {
      type: selectedType,
      title: title.trim(),
      content,
      location: location.trim(),
      latitude,
      longitude,
      visibility,
      media: uploadedFiles,
      mentionedUserIds: Array.from(mentionedUserIdsRef.current),
    };
    onSubmit(postData);
  };

  const resetForm = useCallback(() => {
    setSelectedType('');
    setTitle('');
    setDescription('');
    setLocation('');
    setLatitude(null);
    setLongitude(null);
    setVisibility('public');
    setUploadedFiles([]);
    mentionedUserIdsRef.current = new Set();
    mentionedUserNamesRef.current = new Map();
    mentionedPropertyNamesRef.current = new Map();
    setMentionOpen(false);
    setMentionSearch('');
    setMentionStart(null);
  }, []);

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  // Reset when parent closes the modal after a successful create
  useEffect(() => {
    if (!open && !loading) {
      resetForm();
    }
  }, [open, loading, resetForm]);

  const isFormValid = selectedType && title.trim() && description.trim();

  return (
    <Modal
      open={open}
      onClose={handleClose}
      closeAfterTransition
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Grow in={open} timeout={{ enter: ZPC_MOTION.popupEnter, exit: ZPC_MOTION.popupExit }}>
      <Box
        tabIndex={-1}
        sx={{
          ...MATTE_SURFACE,
          borderRadius: 3,
          width: { xs: '100%', sm: '90%', md: '900px', lg: '900px' },
          maxHeight: '90vh',
          overflow: 'hidden',
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
          ...interFont
        }}
      >
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          p: 3, 
          flexShrink: 0,
          ...MATTE_SURFACE,
          boxShadow: 'none',
          borderRadius: 0,
          borderBottom: '1px solid rgba(22,48,42,0.08)',
        }}>
          <Box>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700, 
                color: '#0A1210',
                mb: 0.5,
                fontSize: '1.5rem'
              }}
            >
              Create New Post
            </Typography>
            <Typography 
              sx={{ 
                color: '#3A4540', 
                fontSize: '0.875rem',
                fontWeight: 400
              }}
            >
              Share with your community - buy, sell, discuss, or flag areas
            </Typography>
          </Box>
          <IconButton 
            onClick={handleClose}
            disabled={loading}
            sx={{ 
              color: '#3A4540',
              '&:hover': { 
                bgcolor: '#E8E2CE',
                color: '#3A4540'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ p: 3, flex: 1, minHeight: 0, overflow: 'auto', ...THIN_CREAM_SCROLLBAR }}>
          {/* Post Type Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              sx={{ 
                fontWeight: 600, 
                color: '#3A4540', 
                mb: 2,
                fontSize: '0.875rem'
              }}
            >
              Post Type
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              {postTypes.map((type) => (
                <Box key={type.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: selectedType === type.id ? '2px solid #16302A' : '1px solid rgba(90, 70, 50, 0.1)',
                      bgcolor: selectedType === type.id ? 'rgba(22,48,42,0.08)' : 'rgba(235,230,212,0.45)',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        borderColor: '#16302A',
                        bgcolor: 'rgba(235,230,212,0.65)',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      },
                      height: '100%'
                    }}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <CardContent sx={{ 
                      textAlign: 'center', 
                      p: 2,
                      '&:last-child': { pb: 2 }
                    }}>
                      <Box sx={{ mb: 1 }}>{type.icon}</Box>
                      <Typography 
                        sx={{ 
                          fontWeight: 600, 
                          color: '#0A1210',
                          fontSize: '0.875rem',
                          mb: 0.5
                        }}
                      >
                        {type.title}
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: '#3A4540', 
                          fontSize: '0.75rem',
                          lineHeight: 1.3
                        }}
                      >
                        {type.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              ))}
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Form Fields */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              sx={{ 
                fontWeight: 600, 
                color: '#3A4540', 
                mb: 1,
                fontSize: '0.875rem'
              }}
            >
              Title
            </Typography>
            <TextField
              fullWidth
              placeholder="Enter a clear, descriptive title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: '#EBE6D4',
                  '& fieldset': {
                    borderColor: '#DDD6C0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#DDD6C0',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#16302A',
                  },
                }
              }}
              InputProps={{
                sx: { fontSize: '0.875rem' }
              }}
            />
            <Typography 
              sx={{ 
                fontSize: '0.75rem', 
                color: '#A89F84', 
                mt: 0.5,
                textAlign: 'right'
              }}
            >
              {title.length}/100 characters
            </Typography>
          </Box>

          <Box sx={{ mb: 3, position: 'relative' }} ref={descriptionWrapRef}>
            <Typography 
              sx={{ 
                fontWeight: 600, 
                color: '#3A4540', 
                mb: 1,
                fontSize: '0.875rem'
              }}
            >
              Description
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Provide details about your post... Type @ to mention a user or property"
              value={description}
              onChange={handleDescriptionChange}
              inputRef={descriptionRef}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: '#EBE6D4',
                  '& fieldset': {
                    borderColor: '#DDD6C0',
                  },
                  '&:hover fieldset': {
                    borderColor: '#DDD6C0',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#16302A',
                  },
                }
              }}
              InputProps={{
                sx: { fontSize: '0.875rem' }
              }}
            />
            {mentionOpen && (
              <Paper
                elevation={6}
                sx={{
                  position: 'absolute',
                  top: mentionAnchor.top,
                  left: mentionAnchor.left,
                  width: 280,
                  maxWidth: 'calc(100% - 16px)',
                  zIndex: 20,
                  maxHeight: 220,
                  overflow: 'auto',
                  borderRadius: 2,
                  border: '1px solid rgba(22,48,42,0.14)',
                  animation: `zpcPopupIn ${ZPC_MOTION.popover}ms ${ZPC_MOTION.ease} both`,
                  ...THIN_CREAM_SCROLLBAR,
                }}
              >
                <List dense disablePadding>
                  <ListSubheader sx={{ lineHeight: '28px', ...MATTE_INSET }}>People</ListSubheader>
                  {mentionSearch.trim().length < 2 && (
                    <ListItemButton disabled><ListItemText primary="Type 2+ letters to search" /></ListItemButton>
                  )}
                  {mentionSearch.trim().length >= 2 && mentionLoading && (
                    <ListItemButton disabled><ListItemText primary="Searching people…" /></ListItemButton>
                  )}
                  {mentionSearch.trim().length >= 2 && !mentionLoading && mentionError && (
                    <ListItemButton disabled><ListItemText primary="Couldn’t load people" /></ListItemButton>
                  )}
                  {mentionSearch.trim().length >= 2 && !mentionLoading && !mentionError && (mentionData?.users?.length ?? 0) === 0 && (
                    <ListItemButton disabled><ListItemText primary="No users found" /></ListItemButton>
                  )}
                  {(mentionData?.users ?? []).map((user: any) => (
                    <ListItemButton key={`u-${user.id}`} onClick={() => handleSelectMention(user)}>
                      <ListItemText
                        primary={`${user.firstName} ${user.lastName || ''}`.trim()}
                        secondary={user.role || user.email}
                        primaryTypographyProps={{ noWrap: true, fontSize: 13.5, fontWeight: 600 }}
                        secondaryTypographyProps={{ noWrap: true, fontSize: 11.5 }}
                      />
                    </ListItemButton>
                  ))}
                  <ListSubheader sx={{ lineHeight: '28px', ...MATTE_INSET }}>Properties</ListSubheader>
                  {mentionSearch.trim().length < 2 && (
                    <ListItemButton disabled><ListItemText primary="Type 2+ letters to search" /></ListItemButton>
                  )}
                  {mentionSearch.trim().length >= 2 && propertyMentionLoading && (
                    <ListItemButton disabled><ListItemText primary="Searching properties…" /></ListItemButton>
                  )}
                  {mentionSearch.trim().length >= 2 && !propertyMentionLoading && propertyMentionError && (
                    <ListItemButton disabled><ListItemText primary="Couldn’t load properties" /></ListItemButton>
                  )}
                  {mentionSearch.trim().length >= 2 && !propertyMentionLoading && !propertyMentionError && (propertyMentionData?.publicProperties?.properties?.length ?? 0) === 0 && (
                    <ListItemButton disabled><ListItemText primary="No properties found" /></ListItemButton>
                  )}
                  {(propertyMentionData?.publicProperties?.properties ?? []).slice(0, 8).map((prop: any) => (
                    <ListItemButton key={`p-${prop.id}`} onClick={() => handleSelectPropertyMention(prop)}>
                      <ListItemText
                        primary={prop.title}
                        secondary={prop.location || prop.city || 'Property'}
                        primaryTypographyProps={{ noWrap: true, fontSize: 13.5, fontWeight: 600 }}
                        secondaryTypographyProps={{ noWrap: true, fontSize: 11.5 }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            )}
            <Typography 
              sx={{ 
                fontSize: '0.75rem', 
                color: '#A89F84', 
                mt: 0.5,
                textAlign: 'right'
              }}
            >
              {description.length}/500 characters
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography 
              sx={{ 
                fontWeight: 600, 
                color: '#3A4540', 
                mb: 1,
                fontSize: '0.875rem'
              }}
            >
              Location <span style={{ color: '#A89F84', fontWeight: 400 }}>(optional)</span>
            </Typography>
            <LocationAutocomplete
              value={location}
              onChange={setLocation}
              onLocationSelect={handleLocationSelect}
            />
            {latitude && longitude && (
              <Typography 
                sx={{ 
                  fontSize: '0.75rem', 
                  color: '#5F8670', 
                  mt: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <LocationIcon sx={{ fontSize: 14 }} />
                Location selected: {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </Typography>
            )}
          </Box>

          {/* Media Upload */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              sx={{ 
                fontWeight: 600, 
                color: '#3A4540', 
                mb: 1,
                fontSize: '0.875rem'
              }}
            >
              Media <span style={{ color: '#A89F84', fontWeight: 400 }}>(optional)</span>
            </Typography>
            
            <Box
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                border: dragOver ? '2px dashed #16302A' : '2px dashed rgba(90, 70, 50, 0.2)',
                borderRadius: 3,
                bgcolor: dragOver ? 'rgba(22,48,42,0.08)' : 'rgba(235,230,212,0.4)',
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: '#16302A',
                  bgcolor: 'rgba(235, 230, 212,0.6)'
                }
              }}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <CloudUploadIcon sx={{ fontSize: 40, color: '#A89F84', mb: 1 }} />
              <Typography sx={{ fontWeight: 600, color: '#3A4540', mb: 0.5 }}>
                Drag and drop files here, or click to select
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#3A4540' }}>
                Supports images and videos up to 10MB
              </Typography>
              <input
                id="file-upload"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </Box>

            {/* Show uploaded files */}
            {uploadedFiles.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#3A4540', mb: 1 }}>
                  Uploaded files ({uploadedFiles.length}/10):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {uploadedFiles.map((file, index) => (
                    <Chip
                      key={index}
                      label={file.name}
                      onDelete={() => removeFile(index)}
                      icon={file.type.startsWith('image/') ? <ImageIcon /> : <VideoIcon />}
                      variant="outlined"
                      size="small"
                      sx={{ maxWidth: 200 }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* Visibility */}
          <Box sx={{ mb: 4 }}>
            <Typography 
              sx={{ 
                fontWeight: 600, 
                color: '#3A4540', 
                mb: 1,
                fontSize: '0.875rem'
              }}
            >
              Visibility
            </Typography>
            <FormControl fullWidth>
              <Select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                sx={{
                  borderRadius: 2,
                  bgcolor: '#EBE6D4',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#DDD6C0',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#DDD6C0',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#16302A',
                  },
                  fontSize: '0.875rem'
                }}
              >
                <MenuItem value="public">Public - Everyone can see</MenuItem>
                <MenuItem value="followers">Followers only</MenuItem>
                <MenuItem value="private">Private - Only me</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
        </Box>

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'flex-end',
              flexShrink: 0,
              px: 3,
              py: 2,
              borderTop: '1px solid rgba(22,48,42,0.08)',
            }}
          >
            <Button
              variant="outlined"
              onClick={handleClose}
              disabled={loading}
              sx={{
                borderColor: '#DDD6C0',
                color: '#3A4540',
                px: 3,
                py: 1,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#DDD6C0',
                  bgcolor: '#EBE6D4'
                }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
              disableElevation
              startIcon={
                loading ? (
                  <CircularProgress size={18} thickness={5} sx={{ color: '#EBE6D4' }} />
                ) : undefined
              }
              sx={{
                bgcolor: '#16302A',
                color: '#EBE6D4',
                px: 4,
                py: 1,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 'none',
                outline: 'none',
                '&:hover': {
                  bgcolor: '#0F221C',
                  boxShadow: 'none',
                },
                '&:focus, &:focus-visible, &.Mui-focusVisible': {
                  outline: 'none',
                  boxShadow: 'none',
                  bgcolor: '#16302A',
                },
                '&.Mui-disabled': {
                  bgcolor: loading ? '#16302A' : '#DDD6C0',
                  color: loading ? '#EBE6D4' : '#A89F84',
                  opacity: loading ? 0.92 : 1,
                },
              }}
            >
              {loading ? 'Creating post…' : 'Create Post'}
            </Button>
          </Box>
      </Box>
      </Grow>
    </Modal>
  );
};

export default CreatePost;
