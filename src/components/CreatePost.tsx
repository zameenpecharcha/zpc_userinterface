import React, { useState, useCallback } from 'react';
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
  Divider
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

const interFont = {
  fontFamily: 'Inter, Roboto, Arial, sans-serif',
};

interface CreatePostProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (postData: any) => void;
  loading?: boolean;
}

const CreatePost: React.FC<CreatePostProps> = ({ open, onClose, onSubmit, loading = false }) => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [visibility, setVisibility] = useState('public');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const postTypes = [
    {
      id: 'buy-sell',
      title: 'Buy/Sell',
      icon: <HomeIcon sx={{ fontSize: 32, color: '#2563EB' }} />,
      description: 'Buy or sell properties'
    },
    {
      id: 'suggestion',
      title: 'Suggestion',
      icon: <LightbulbIcon sx={{ fontSize: 32, color: '#10B981' }} />,
      description: 'Share your ideas'
    },
    {
      id: 'discussion',
      title: 'Discussion',
      icon: <ForumIcon sx={{ fontSize: 32, color: '#F59E0B' }} />,
      description: 'Start a conversation'
    },
    {
      id: 'flag-area',
      title: 'Flag an Area',
      icon: <FlagIcon sx={{ fontSize: 32, color: '#EF4444' }} />,
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
    setLocation(locationData.address);
    setLatitude(locationData.latitude);
    setLongitude(locationData.longitude);
  };

  const handleSubmit = () => {
    if (!selectedType || !title.trim() || !description.trim()) return;

    const postData = {
      type: selectedType,
      title: title.trim(),
      content: description.trim(),
      location: location.trim(),
      latitude,
      longitude,
      visibility,
      media: uploadedFiles
    };

    onSubmit(postData);
  };

  const handleClose = () => {
    if (!loading) {
      // Reset form
      setSelectedType('');
      setTitle('');
      setDescription('');
      setLocation('');
      setLatitude(null);
      setLongitude(null);
      setVisibility('public');
      setUploadedFiles([]);
      onClose();
    }
  };

  const isFormValid = selectedType && title.trim() && description.trim();

  return (
    <Modal
      open={open}
      onClose={handleClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 3,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: { xs: '100%', sm: '90%', md: '600px' },
          maxHeight: '90vh',
          overflow: 'auto',
          ...interFont
        }}
      >
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          p: 3, 
          borderBottom: '1px solid #E5E7EB' 
        }}>
          <Box>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700, 
                color: '#111827',
                mb: 0.5,
                fontSize: '1.5rem'
              }}
            >
              Create New Post
            </Typography>
            <Typography 
              sx={{ 
                color: '#6B7280', 
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
              color: '#6B7280',
              '&:hover': { 
                bgcolor: '#F3F4F6',
                color: '#374151'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ p: 3 }}>
          {/* Post Type Selection */}
          <Box sx={{ mb: 3 }}>
            <Typography 
              sx={{ 
                fontWeight: 600, 
                color: '#374151', 
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
                      border: selectedType === type.id ? '2px solid #2563EB' : '1px solid #E5E7EB',
                      bgcolor: selectedType === type.id ? '#EFF6FF' : 'white',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        borderColor: '#2563EB',
                        bgcolor: '#F8FAFC',
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
                          color: '#111827',
                          fontSize: '0.875rem',
                          mb: 0.5
                        }}
                      >
                        {type.title}
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: '#6B7280', 
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
                color: '#374151', 
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
                  bgcolor: '#F9FAFB',
                  '& fieldset': {
                    borderColor: '#E5E7EB',
                  },
                  '&:hover fieldset': {
                    borderColor: '#D1D5DB',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2563EB',
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
                color: '#9CA3AF', 
                mt: 0.5,
                textAlign: 'right'
              }}
            >
              {title.length}/100 characters
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography 
              sx={{ 
                fontWeight: 600, 
                color: '#374151', 
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
              placeholder="Provide details about your post..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: '#F9FAFB',
                  '& fieldset': {
                    borderColor: '#E5E7EB',
                  },
                  '&:hover fieldset': {
                    borderColor: '#D1D5DB',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#2563EB',
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
                color: '#9CA3AF', 
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
                color: '#374151', 
                mb: 1,
                fontSize: '0.875rem'
              }}
            >
              Location <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span>
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
                  color: '#10B981', 
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
                color: '#374151', 
                mb: 1,
                fontSize: '0.875rem'
              }}
            >
              Media <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(optional)</span>
            </Typography>
            
            <Box
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              sx={{
                border: dragOver ? '2px dashed #2563EB' : '2px dashed #D1D5DB',
                borderRadius: 3,
                bgcolor: dragOver ? '#EFF6FF' : '#F9FAFB',
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: '#2563EB',
                  bgcolor: '#F8FAFC'
                }
              }}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <CloudUploadIcon sx={{ fontSize: 40, color: '#9CA3AF', mb: 1 }} />
              <Typography sx={{ fontWeight: 600, color: '#374151', mb: 0.5 }}>
                Drag and drop files here, or click to select
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#6B7280' }}>
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
                <Typography sx={{ fontSize: '0.75rem', color: '#6B7280', mb: 1 }}>
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
                color: '#374151', 
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
                  bgcolor: '#F9FAFB',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#E5E7EB',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#D1D5DB',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#2563EB',
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

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={handleClose}
              disabled={loading}
              sx={{
                borderColor: '#E5E7EB',
                color: '#6B7280',
                px: 3,
                py: 1,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#D1D5DB',
                  bgcolor: '#F9FAFB'
                }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
              sx={{
                bgcolor: '#2563EB',
                px: 4,
                py: 1,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                '&:hover': {
                  bgcolor: '#1D4ED8',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                },
                '&:disabled': {
                  bgcolor: '#E5E7EB',
                  color: '#9CA3AF'
                }
              }}
            >
              {loading ? 'Creating Post...' : 'Create Post'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default CreatePost;
