import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  IconButton,
  Divider,
  Alert,
  Grow,
  CircularProgress,
  ClickAwayListener,
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
  VideoFile as VideoIcon,
  Savings as SavingsIcon,
  TrendingUp as TrendingUpIcon,
  RateReview as RateReviewIcon,
  BarChart as BarChartIcon,
  Balance as BalanceIcon,
  AccountBalance as AccountBalanceIcon,
  Construction as ConstructionIcon,
  VpnKey as VpnKeyIcon,
  HowToVote as HowToVoteIcon,
} from '@mui/icons-material';
import LocationAutocomplete from './LocationAutocomplete';
import MentionPicker, { mentionKeyHandler } from './mentions/MentionPicker';
import { MATTE_SURFACE, THIN_CREAM_SCROLLBAR } from '../theme/surfaces';
import { expandPrettyMentions, getTextareaCaretOffset, getActiveMentionQuery } from '../utils/mentions';
import { useMentionSearch } from '../hooks/useMentionSearch';
import type { MentionItem } from '../utils/mentionMatch';
import { ZPC_MOTION } from '../theme/motion';
import { POST_CATEGORIES, toBackendPostType, withCategoryPrefix } from '../constants/postCategories';

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
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState({ top: 0, left: 0 });
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionedUserIdsRef = useRef<Set<string>>(new Set());
  const mentionedUserNamesRef = useRef<Map<string, string>>(new Map());
  const mentionedPropertyNamesRef = useRef<Map<string, string>>(new Map());
  const descriptionRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const descriptionWrapRef = useRef<HTMLDivElement | null>(null);

  const { people, properties, items, loadingPeople, loadingProperties } = useMentionSearch({
    query: mentionSearch,
    open: mentionOpen,
  });

  const categoryIcons: Record<string, React.ReactNode> = {
    'buy-sell': <HomeIcon sx={{ fontSize: 'inherit', color: '#16302A' }} />,
    'price-check': <SavingsIcon sx={{ fontSize: 'inherit', color: '#5F8670' }} />,
    investment: <TrendingUpIcon sx={{ fontSize: 'inherit', color: '#A89F84' }} />,
    discussion: <ForumIcon sx={{ fontSize: 'inherit', color: '#16302A' }} />,
    suggestion: <LightbulbIcon sx={{ fontSize: 'inherit', color: '#5F8670' }} />,
    'property-review': <RateReviewIcon sx={{ fontSize: 'inherit', color: '#A89F84' }} />,
    'market-update': <BarChartIcon sx={{ fontSize: 'inherit', color: '#16302A' }} />,
    'flag-area': <FlagIcon sx={{ fontSize: 'inherit', color: '#5F8670' }} />,
    'legal-docs': <BalanceIcon sx={{ fontSize: 'inherit', color: '#A89F84' }} />,
    'loan-finance': <AccountBalanceIcon sx={{ fontSize: 'inherit', color: '#16302A' }} />,
    construction: <ConstructionIcon sx={{ fontSize: 'inherit', color: '#5F8670' }} />,
    'rent-rental': <VpnKeyIcon sx={{ fontSize: 'inherit', color: '#A89F84' }} />,
    'locality-review': <LocationIcon sx={{ fontSize: 'inherit', color: '#16302A' }} />,
    'create-poll': <HowToVoteIcon sx={{ fontSize: 'inherit', color: '#5F8670' }} />,
  };

  const postTypes = POST_CATEGORIES.map((category) => ({
    ...category,
    icon: categoryIcons[category.id],
  }));

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

  // Object URLs so users can preview images/videos before posting
  useEffect(() => {
    const urls = uploadedFiles.map((file) => URL.createObjectURL(file));
    setMediaPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [uploadedFiles]);

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
      top: offsetTop + coords.top,
      left: Math.min(Math.max(8, offsetLeft + coords.left), maxLeft),
    });
  };

  const closeMentions = () => {
    setMentionOpen(false);
    setMentionSearch('');
    setMentionStart(null);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setDescription(value);

    const cursorPos = e.target.selectionStart ?? value.length;
    const active = getActiveMentionQuery(value, cursorPos);

    if (active) {
      const searchTerm = active.query || '';
      setMentionOpen(true);
      setMentionSearch(searchTerm);
      setMentionStart(active.start);
      setMentionIndex(0);
      updateMentionAnchor(e.target, cursorPos);
    } else {
      closeMentions();
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

  const handleSelectMentionItem = (item: MentionItem) => {
    if (item.kind === 'person') {
      handleSelectMention({
        id: item.person.id,
        firstName: item.person.name.split(' ')[0] || item.person.name,
        lastName: item.person.name.split(' ').slice(1).join(' '),
      });
      return;
    }
    handleSelectPropertyMention({ id: item.property.id, title: item.property.title });
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
      type: toBackendPostType(selectedType),
      categoryId: selectedType,
      title: withCategoryPrefix(selectedType, title.trim()),
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
        className="zpc-overlay-host"
        sx={{
          ...MATTE_SURFACE,
          borderRadius: 3,
          width: { xs: '100%', sm: '94%', md: '960px' },
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
              Share with your community — listings, reviews, market updates, and more
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
        <Box className="zpc-overlay-scroll" sx={{ p: 3, flex: 1, minHeight: 0, overflow: 'auto', ...THIN_CREAM_SCROLLBAR }}>
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
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  sm: 'repeat(3, minmax(0, 1fr))',
                  md: 'repeat(4, minmax(0, 1fr))',
                },
                gap: { xs: 1, sm: 1.5 },
              }}
            >
              {postTypes.map((type) => (
                <Box key={type.id} sx={{ minWidth: 0 }}>
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
                      p: { xs: 1.25, sm: 1.75 },
                      '&:last-child': { pb: { xs: 1.25, sm: 1.75 } }
                    }}>
                      <Box sx={{ mb: { xs: 0.5, sm: 1 }, '& .MuiSvgIcon-root': { fontSize: { xs: 26, sm: 32 } } }}>
                        {type.icon}
                      </Box>
                      <Typography 
                        sx={{ 
                          fontWeight: 600, 
                          color: '#0A1210',
                          fontSize: { xs: '0.72rem', sm: '0.875rem' },
                          mb: 0.35,
                          lineHeight: 1.2,
                        }}
                      >
                        {type.title}
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: '#3A4540', 
                          fontSize: { xs: '0.65rem', sm: '0.75rem' },
                          lineHeight: 1.25,
                          display: { xs: 'none', sm: 'block' },
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
              placeholder={
                selectedType === 'create-poll'
                  ? 'Write a clear poll question'
                  : 'Enter a clear, descriptive title'
              }
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
              placeholder={
                selectedType === 'create-poll'
                  ? 'Ask a question the community can vote on… Type @ to mention a user or property'
                  : selectedType === 'property-review'
                    ? 'Share what you liked (and what you did not) about this home… Type @ to mention a user or property'
                    : selectedType === 'locality-review'
                      ? 'What is this neighborhood like to live in? Type @ to mention a user or property'
                      : 'Provide details about your post... Type @ to mention a user or property'
              }
              value={description}
              onChange={handleDescriptionChange}
              onBlur={(e) => {
                const next = e.relatedTarget as Node | null;
                if (descriptionWrapRef.current?.contains(next)) return;
                closeMentions();
              }}
              onKeyDown={(e) => {
                if (!mentionOpen) return;
                mentionKeyHandler(
                  e,
                  items,
                  mentionIndex,
                  setMentionIndex,
                  handleSelectMentionItem,
                  closeMentions,
                );
              }}
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
              <ClickAwayListener onClickAway={closeMentions}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: mentionAnchor.top,
                    left: mentionAnchor.left,
                    zIndex: 20,
                    transform: 'translateY(calc(-100% - 6px))',
                  }}
                >
                  <MentionPicker
                    open={mentionOpen}
                    query={mentionSearch}
                    items={items}
                    people={people}
                    properties={properties}
                    loadingPeople={loadingPeople}
                    loadingProperties={loadingProperties}
                    selectedIndex={mentionIndex}
                    onHoverIndex={setMentionIndex}
                    onSelect={handleSelectMentionItem}
                    onClose={closeMentions}
                  />
                </Box>
              </ClickAwayListener>
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

            {/* Show uploaded media previews */}
            {uploadedFiles.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: '0.75rem', color: '#3A4540', mb: 1 }}>
                  Uploaded ({uploadedFiles.length}/10) — tap × to remove
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                    gap: 1.25,
                  }}
                >
                  {uploadedFiles.map((file, index) => {
                    const preview = mediaPreviews[index];
                    const isVideo = file.type.startsWith('video/');
                    return (
                      <Box
                        key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                        sx={{
                          position: 'relative',
                          borderRadius: 2,
                          overflow: 'hidden',
                          aspectRatio: '1',
                          bgcolor: 'rgba(22,48,42,0.06)',
                          border: '1px solid rgba(90,70,50,0.16)',
                        }}
                      >
                        {preview && !isVideo ? (
                          <Box
                            component="img"
                            src={preview}
                            alt={file.name}
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        ) : preview && isVideo ? (
                          <Box
                            component="video"
                            src={preview}
                            muted
                            playsInline
                            preload="metadata"
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#A89F84',
                            }}
                          >
                            {isVideo ? <VideoIcon /> : <ImageIcon />}
                          </Box>
                        )}
                        {isVideo && (
                          <Box
                            sx={{
                              position: 'absolute',
                              left: 6,
                              bottom: 6,
                              px: 0.75,
                              py: 0.15,
                              borderRadius: 1,
                              bgcolor: 'rgba(10,18,16,0.7)',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.35,
                            }}
                          >
                            <VideoIcon sx={{ fontSize: 12 }} />
                            Video
                          </Box>
                        )}
                        <IconButton
                          size="small"
                          aria-label={`Remove ${file.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            width: 26,
                            height: 26,
                            bgcolor: 'rgba(10,18,16,0.72)',
                            color: '#fff',
                            '&:hover': { bgcolor: 'rgba(10,18,16,0.9)' },
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    );
                  })}
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
