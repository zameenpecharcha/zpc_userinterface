import React, { useMemo, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import IosShareIcon from '@mui/icons-material/IosShare';
import TelegramMuiIcon from '@mui/icons-material/Telegram';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  ShareablePost,
  buildPostShareText,
  buildPostShareUrl,
  copyTextToClipboard,
  gmailShareUrl,
  telegramShareUrl,
  whatsappShareUrl,
} from '../utils/sharePost';
import { ZPC_COLORS, ZPC_FONTS } from '../theme/zpcTheme';

export type SharePostSheetProps = {
  open: boolean;
  post: ShareablePost | null;
  onClose: () => void;
};

const WhatsAppIcon: React.FC = () => (
  <Box
    component="svg"
    viewBox="0 0 24 24"
    sx={{ width: 26, height: 26, display: 'block' }}
    aria-hidden
  >
    <path
      fill="#fff"
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.85 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
    />
  </Box>
);

const TelegramIcon: React.FC = () => (
  <TelegramMuiIcon sx={{ fontSize: 28, color: '#fff', display: 'block' }} />
);

const GmailIcon: React.FC = () => (
  <Box
    component="svg"
    viewBox="0 0 24 24"
    sx={{ width: 26, height: 26, display: 'block' }}
    aria-hidden
  >
    <path
      fill="#EA4335"
      d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
    />
  </Box>
);

type ShareActionProps = {
  label: string;
  bg: string;
  onClick: () => void;
  children: React.ReactNode;
};

const ShareAction: React.FC<ShareActionProps> = ({ label, bg, onClick, children }) => (
  <Tooltip title={label}>
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-label={label}
      sx={{
        appearance: 'none',
        border: 'none',
        p: 0,
        m: 0,
        width: 52,
        height: 52,
        borderRadius: '50%',
        bgcolor: bg,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 10px rgba(10,18,16,0.12)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 16px rgba(10,18,16,0.16)',
        },
        '&:focus-visible': {
          outline: `2px solid ${ZPC_COLORS.accent}`,
          outlineOffset: 2,
        },
      }}
    >
      {children}
    </Box>
  </Tooltip>
);

const SharePostSheet: React.FC<SharePostSheetProps> = ({ open, post, onClose }) => {
  const [toast, setToast] = useState<string | null>(null);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const { url, text, subject } = useMemo(() => {
    if (!post) return { url: '', text: '', subject: 'ZPC post' };
    const shareUrl = buildPostShareUrl(post.id);
    const shareText = buildPostShareText(post, shareUrl);
    const shareSubject = (post.title || '').trim() || 'Post on ZPC';
    return { url: shareUrl, text: shareText, subject: shareSubject };
  }, [post]);

  const openExternal = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(url || text);
    setToast(ok ? 'Link copied' : 'Could not copy link');
    if (ok) onClose();
  };

  const handleNativeShare = async () => {
    if (!canNativeShare || !post) return;
    try {
      await navigator.share({
        title: subject,
        text: text.replace(url, '').trim(),
        url,
      });
      onClose();
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setToast('Could not open share menu');
      }
    }
  };

  return (
    <>
      <Dialog
        open={open && !!post}
        onClose={onClose}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: ZPC_COLORS.surface,
            border: `1px solid ${ZPC_COLORS.border}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: ZPC_FONTS.display,
            fontWeight: 600,
            color: ZPC_COLORS.text,
            pr: 6,
            pb: 0.5,
          }}
        >
          Share post
          <IconButton
            aria-label="Close"
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8, color: ZPC_COLORS.textMuted }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5, pb: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 1.75,
              px: 0.5,
            }}
          >
            <ShareAction
              label="WhatsApp"
              bg="#25D366"
              onClick={() => openExternal(whatsappShareUrl(text))}
            >
              <WhatsAppIcon />
            </ShareAction>
            <ShareAction
              label="Telegram"
              bg="#229ED9"
              onClick={() => openExternal(telegramShareUrl(url, subject))}
            >
              <TelegramIcon />
            </ShareAction>
            <Tooltip title="Gmail">
              <Box
                component="button"
                type="button"
                aria-label="Gmail"
                onClick={() => openExternal(gmailShareUrl(subject, text))}
                sx={{
                  appearance: 'none',
                  border: '1px solid rgba(0,0,0,0.12)',
                  p: 0,
                  m: 0,
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  bgcolor: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(10,18,16,0.12)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(10,18,16,0.16)',
                  },
                }}
              >
                <GmailIcon />
              </Box>
            </Tooltip>
            <ShareAction label="Copy link" bg={ZPC_COLORS.primary} onClick={handleCopy}>
              <ContentCopyIcon sx={{ fontSize: 22, color: ZPC_COLORS.primaryContrast }} />
            </ShareAction>
            {canNativeShare && (
              <ShareAction label="More…" bg={ZPC_COLORS.accent} onClick={handleNativeShare}>
                <IosShareIcon sx={{ fontSize: 22, color: ZPC_COLORS.accentContrast }} />
              </ShareAction>
            )}
          </Box>
        </DialogContent>
      </Dialog>
      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SharePostSheet;
