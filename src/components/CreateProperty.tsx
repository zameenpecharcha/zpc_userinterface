import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Fade,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ZpcNavLogo } from './brand/ZpcNavLogo';
import HeaderLogoutButton from './HeaderLogoutButton';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import BadgeIcon from '@mui/icons-material/Badge';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SendIcon from '@mui/icons-material/Send';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApolloClient, useQuery } from '@apollo/client';
import { PropertyService, mapFormDataToPropertyInput } from '../services/propertyService';
import { PropertyType, ListingType, Property } from '../types/property';
import { GET_PROPERTY } from '../graphql/property';
import LocationAutocomplete from './LocationAutocomplete';
import { MATTE_SURFACE, THIN_CREAM_SCROLLBAR } from '../theme/surfaces';
import { ZPC_COLORS, ZPC_FONTS } from '../theme/zpcTheme';
import { ZPC_MOTION } from '../theme/motion';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#fff',
    borderRadius: 2,
  },
};

const CreateProperty: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = (searchParams.get('edit') || '').trim();
  const client = useApolloClient();
  const propertyService = useMemo(() => new PropertyService(client), [client]);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const { data: editData } = useQuery(GET_PROPERTY, {
    variables: { propertyId: editId },
    skip: !editId,
    fetchPolicy: 'network-only',
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: PropertyType.APARTMENT,
    listingType: ListingType.SALE,
    price: '',
    location: '',
    bedrooms: '',
    bathrooms: '',
    city: '',
    state: '',
    country: 'India',
    builderName: '',
    projectName: '',
    reraId: '',
  });
  const [documents, setDocuments] = useState<File[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<Property | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    const prop = editData?.property;
    if (!editId || !prop) return;
    const rawDescription = String(prop.description || '');
    const description = rawDescription
      .split('\n')
      .filter((line: string) => {
        const lower = line.toLowerCase();
        return !lower.startsWith('documents attached:') && !lower.startsWith('photos selected:');
      })
      .join('\n')
      .trim();
    setFormData({
      title: prop.title || '',
      description,
      propertyType: prop.propertyType || PropertyType.APARTMENT,
      listingType: prop.listingType || ListingType.SALE,
      price: prop.price ? String(prop.price) : '',
      location: prop.location || [prop.city, prop.state].filter(Boolean).join(', '),
      bedrooms: '',
      bathrooms: '',
      city: prop.city || '',
      state: prop.state || '',
      country: prop.country || 'India',
      builderName: prop.builderName || '',
      projectName: prop.projectName || '',
      reraId: prop.reraId || '',
    });
  }, [editId, editData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = (locationData: { address: string; latitude: number; longitude: number }) => {
    const parts = locationData.address.split(',').map((p) => p.trim()).filter(Boolean);
    setFormData((prev) => ({
      ...prev,
      location: parts.slice(0, 3).join(', '),
      city: parts[0] || prev.city,
      state: parts[1] || prev.state,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.location.trim()) {
      setSnackbar({ open: true, message: 'Please fill in property name and location', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const descBits = [
        formData.description.trim(),
        documents.length ? `Documents attached: ${documents.map((d) => d.name).join(', ')}` : '',
        photos.length ? `Photos selected: ${photos.length}` : '',
      ].filter(Boolean);

      const payload = mapFormDataToPropertyInput({
        ...formData,
        description: descBits.join('\n\n') || formData.title,
      });

      const savedProp = editId
        ? await propertyService.updateProperty({ propertyId: editId, ...payload })
        : await propertyService.createProperty(payload);

      if (documents.length) {
        try {
          await propertyService.addPropertyFeatures(
            savedProp.id,
            documents.map((doc, i) => ({
              featureName: 'DOCUMENT',
              featureValue: `${doc.name} (${Math.max(1, Math.round(doc.size / 1024))} KB)`,
              displayOrder: i + 1,
            }))
          );
        } catch {
          /* non-blocking */
        }
      }

      setCreated(savedProp);
      if (editId) {
        setSnackbar({ open: true, message: 'Property details updated', severity: 'success' });
        navigate(`/property/${savedProp.id}`);
        return;
      }
      setShowReviewModal(true);
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || (editId ? 'Failed to update property' : 'Failed to create property'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const closeReviewModal = (goToProperty?: boolean) => {
    setShowReviewModal(false);
    if (goToProperty && created?.id) navigate(`/property/${created.id}`);
    else navigate('/my-properties');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'rgba(10,18,16,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 1.5, sm: 3 },
      }}
    >
      <Fade in timeout={ZPC_MOTION.popupEnter}>
        <Box
          component="form"
          onSubmit={handleSubmit}
          className="zpc-overlay-host"
          sx={{
            width: '100%',
            maxWidth: 720,
            maxHeight: '92vh',
            overflow: 'hidden',
            bgcolor: '#fff',
            borderRadius: 3,
            boxShadow: '0 24px 64px rgba(10,18,16,0.28)',
            display: 'flex',
            flexDirection: 'column',
            animation: `zpcPopupIn ${ZPC_MOTION.popupEnter}ms ${ZPC_MOTION.ease} both`,
          }}
        >
          <Box sx={{ px: 3, pt: 3, pb: 1.5, position: 'relative', flexShrink: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1, pr: 5 }}>
              <ZpcNavLogo size={40} animateStroke={false} ink="dark" onLightBg />
              <Box>
                <Typography sx={{ fontFamily: ZPC_FONTS.display, fontWeight: 700, fontSize: 22, color: '#0A1210' }}>
                  {editId ? 'Edit Property' : 'Add New Property'}
                </Typography>
                <Typography sx={{ color: '#6B7280', fontSize: 13.5, mt: 0.25 }}>
                  {editId ? 'Update the listing details on ZPC' : 'Provide details to list your property on ZPC'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ position: 'absolute', top: 12, right: 8, display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <HeaderLogoutButton ink="dark" size="small" />
              <IconButton
                onClick={() => navigate(-1)}
                sx={{ color: '#9CA3AF' }}
                aria-label="Close"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          <Box className="zpc-overlay-scroll" sx={{ px: 3, pb: 2, display: 'grid', gap: 2.25, flex: 1, minHeight: 0, overflow: 'auto', ...THIN_CREAM_SCROLLBAR }}>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 13.5, mb: 0.75, color: '#1F2937' }}>Property Name</Typography>
              <TextField
                fullWidth
                placeholder="Enter a clear, descriptive title (e.g., Oasis Heights Luxury Apartments)"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                required
                sx={fieldSx}
              />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 13.5, mb: 0.75, color: '#1F2937' }}>
                Location (Maps integrated)
              </Typography>
              <LocationAutocomplete
                value={formData.location}
                onChange={(v) => handleInputChange('location', v)}
                onLocationSelect={handleLocationSelect}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: 13.5, mb: 0.75, color: '#1F2937' }}>Builder Name</Typography>
                <TextField
                  fullWidth
                  placeholder="e.g. Prestige Builders"
                  value={formData.builderName}
                  onChange={(e) => handleInputChange('builderName', e.target.value)}
                  sx={fieldSx}
                />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: 13.5, mb: 0.75, color: '#1F2937' }}>RERA ID (Optional)</Typography>
                <TextField
                  fullWidth
                  placeholder="Enter RERA registration number"
                  value={formData.reraId}
                  onChange={(e) => handleInputChange('reraId', e.target.value)}
                  sx={fieldSx}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: 13.5, mb: 0.75, color: '#1F2937' }}>Property Type</Typography>
                <TextField
                  select
                  fullWidth
                  value={formData.propertyType}
                  onChange={(e) => handleInputChange('propertyType', e.target.value)}
                  SelectProps={{ native: true }}
                  sx={fieldSx}
                >
                  {Object.values(PropertyType).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </TextField>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: 13.5, mb: 0.75, color: '#1F2937' }}>Price (INR)</Typography>
                <TextField
                  fullWidth
                  type="number"
                  placeholder="Optional"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  sx={fieldSx}
                />
              </Box>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 13.5, mb: 0.75, color: '#1F2937' }}>Description</Typography>
              <TextField
                fullWidth
                multiline
                minRows={3}
                placeholder="Describe amenities, project highlights, and neighborhood"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                sx={fieldSx}
              />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 13.5, mb: 0.75, color: '#1F2937' }}>Property Documents</Typography>
              <Box
                onClick={() => docInputRef.current?.click()}
                sx={{
                  border: '1.5px dashed #D1D5DB',
                  borderRadius: 2,
                  py: 3,
                  px: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: '#FAFAFA',
                  '&:hover': { borderColor: ZPC_COLORS.primary, bgcolor: 'rgba(22,48,42,0.03)' },
                }}
              >
                <PictureAsPdfIcon sx={{ color: '#9CA3AF', fontSize: 36, mb: 0.5 }} />
                <Typography sx={{ fontSize: 13.5, color: '#4B5563' }}>
                  Drag and drop documents here, or click to select
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#9CA3AF', mt: 0.35 }}>
                  Supports PDF, DOCX up to 15MB
                </Typography>
                <input
                  ref={docInputRef}
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.doc,.docx,application/pdf"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setDocuments((prev) => [...prev, ...files].slice(0, 10));
                    e.target.value = '';
                  }}
                />
              </Box>
              {documents.length > 0 && (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  {documents.map((doc) => (
                    <Chip
                      key={doc.name + doc.size}
                      icon={<InsertDriveFileIcon />}
                      label={doc.name}
                      onDelete={() => setDocuments((prev) => prev.filter((d) => d !== doc))}
                      sx={{ maxWidth: 240 }}
                    />
                  ))}
                </Stack>
              )}
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 13.5, mb: 0.75, color: '#1F2937' }}>Property Photos</Typography>
              <Box
                onClick={() => photoInputRef.current?.click()}
                sx={{
                  border: '1.5px dashed #D1D5DB',
                  borderRadius: 2,
                  py: 2.5,
                  px: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: '#FAFAFA',
                  '&:hover': { borderColor: ZPC_COLORS.primary },
                }}
              >
                <CloudUploadIcon sx={{ color: '#9CA3AF', fontSize: 32 }} />
                <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.5 }}>
                  Click to select cover & gallery photos
                </Typography>
                <input
                  ref={photoInputRef}
                  type="file"
                  hidden
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setPhotos((prev) => [...prev, ...files].slice(0, 12));
                    e.target.value = '';
                  }}
                />
              </Box>
              {photos.length > 0 && (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  {photos.map((photo) => (
                    <Chip
                      key={photo.name + photo.size}
                      label={photo.name}
                      onDelete={() => setPhotos((prev) => prev.filter((p) => p !== photo))}
                      sx={{ maxWidth: 200 }}
                    />
                  ))}
                </Stack>
              )}
            </Box>

            {!editId && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Your listing will be submitted for review. Admins will verify details before it goes live.
            </Alert>
            )}
          </Box>

          <Box
            sx={{
              mt: 'auto',
              px: 3,
              py: 2,
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1.25,
              flexShrink: 0,
            }}
          >
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              disabled={loading}
              sx={{ textTransform: 'none', borderRadius: 2, px: 2.5, color: '#374151', borderColor: '#D1D5DB' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                px: 2.75,
                bgcolor: ZPC_COLORS.primary,
                '&:hover': { bgcolor: ZPC_COLORS.primaryHover },
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : editId ? 'Save changes' : 'Submit Property'}
            </Button>
          </Box>
        </Box>
      </Fade>

      <Dialog
        open={showReviewModal}
        onClose={() => closeReviewModal(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3, p: 0.5 } }}
      >
        <DialogContent sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
          <IconButton
            onClick={() => closeReviewModal(false)}
            sx={{ position: 'absolute', right: 10, top: 10, bgcolor: '#F3F4F6' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: ZPC_COLORS.primary,
              color: '#EBE6D4',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.5,
              boxShadow: '0 10px 28px rgba(22,48,42,0.28)',
            }}
          >
            <SendIcon />
          </Box>
          <Typography sx={{ fontFamily: ZPC_FONTS.display, fontWeight: 700, fontSize: 22, mb: 1 }}>
            Property Submitted
          </Typography>
          <Chip
            icon={<AccessTimeIcon sx={{ fontSize: '16px !important' }} />}
            label="Pending Approval"
            sx={{
              bgcolor: '#FEF3C7',
              color: '#B45309',
              fontWeight: 700,
              mb: 1.5,
              '& .MuiChip-icon': { color: '#B45309' },
            }}
          />
          <Typography sx={{ color: '#4B5563', fontSize: 14, lineHeight: 1.55, mb: 2 }}>
            Your property has been submitted and is currently <strong>waiting for approval</strong>.
            You&apos;ll be notified once your Property ID is created and the listing goes live.
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 1.25,
              alignItems: 'flex-start',
              textAlign: 'left',
              bgcolor: 'rgba(22,48,42,0.06)',
              borderRadius: 2,
              p: 1.5,
              mb: 2.5,
            }}
          >
            <NotificationsActiveIcon sx={{ color: ZPC_COLORS.primary, mt: 0.25 }} />
            <Typography sx={{ fontSize: 13.5, color: ZPC_COLORS.primary }}>
              <strong>You&apos;ll receive a notification</strong> — We&apos;ll send a real-time alert as soon as your
              property is reviewed and your unique Property ID is assigned.
            </Typography>
          </Box>

          <Stack spacing={1.75} sx={{ textAlign: 'left', px: 0.5 }}>
            {[
              { icon: <CheckCircleIcon sx={{ color: '#fff', fontSize: 18 }} />, bg: ZPC_COLORS.primary, label: 'Property Submitted', right: 'Just now', done: true },
              { icon: <HourglassTopIcon sx={{ color: '#fff', fontSize: 18 }} />, bg: '#D97706', label: 'Under Review', right: 'In progress', done: false },
              { icon: <BadgeIcon sx={{ color: '#9CA3AF', fontSize: 18 }} />, bg: '#E5E7EB', label: 'Property ID Created', right: 'Pending', done: false },
            ].map((step, idx) => (
              <Box key={step.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: step.bg,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {step.icon}
                </Box>
                <Typography sx={{ flex: 1, fontWeight: 650, color: idx === 2 ? '#9CA3AF' : '#111827', fontSize: 14 }}>
                  {step.label}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#6B7280' }}>{step.right}</Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, justifyContent: 'stretch' }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => closeReviewModal(true)}
            sx={{ textTransform: 'none', borderRadius: 2, bgcolor: ZPC_COLORS.primary, py: 1.1 }}
          >
            Got it, Thanks!
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => closeReviewModal(false)}
            sx={{ textTransform: 'none', borderRadius: 2, borderColor: '#D1D5DB', color: '#374151', py: 1.1 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateProperty;
