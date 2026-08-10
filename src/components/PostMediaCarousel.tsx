import React, { useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export type PostMediaItem = {
  id?: number | string;
  mediaType?: string;
  mediaUrl?: string;
  signedUrl?: string;
  caption?: string;
};

type Props = {
  media: PostMediaItem[];
  /** Max height for the media stage (responsive via sx possible through maxHeight). */
  maxHeight?: number | { xs?: number; sm?: number };
  /** Square corners for LinkedIn-style edge-to-edge cards. */
  edgeToEdge?: boolean;
};

function mediaSrc(m: PostMediaItem) {
  return m.signedUrl || m.mediaUrl || '';
}

function isVideo(m: PostMediaItem) {
  const t = (m.mediaType || '').toLowerCase();
  if (t === 'video') return true;
  const url = mediaSrc(m).toLowerCase();
  return /\.(mp4|webm|mov|m4v)(\?|$)/.test(url);
}

/**
 * Flexible image/video carousel for posts — arrows + dots when multiple media.
 */
const PostMediaCarousel: React.FC<Props> = ({ media, maxHeight = { xs: 320, sm: 420 }, edgeToEdge = false }) => {
  const items = (media || []).filter((m) => mediaSrc(m));
  const [index, setIndex] = useState(0);

  if (items.length === 0) return null;

  const safeIndex = Math.min(index, items.length - 1);
  const current = items[safeIndex];
  const multi = items.length > 1;
  const src = mediaSrc(current);

  const go = (dir: -1 | 1) => {
    setIndex((i) => {
      const next = i + dir;
      if (next < 0) return items.length - 1;
      if (next >= items.length) return 0;
      return next;
    });
  };

  return (
    <Box sx={{ mb: edgeToEdge ? 0 : 2, position: 'relative', width: '100%' }}>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          borderRadius: edgeToEdge ? 0 : 3,
          overflow: 'hidden',
          bgcolor: 'rgba(10,18,16,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: { xs: 180, sm: 220 },
        }}
      >
        {isVideo(current) ? (
          <Box
            component="video"
            key={src}
            src={src}
            controls
            playsInline
            preload="metadata"
            sx={{
              width: '100%',
              maxHeight,
              height: 'auto',
              display: 'block',
              objectFit: 'contain',
              backgroundColor: '#0A1210',
            }}
          />
        ) : (
          <Box
            component="img"
            key={src}
            src={src}
            alt={current.caption || `Post media ${safeIndex + 1}`}
            sx={{
              width: '100%',
              maxHeight,
              height: 'auto',
              display: 'block',
              objectFit: 'contain',
            }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              if (current.signedUrl && e.currentTarget.src === current.signedUrl && current.mediaUrl) {
                e.currentTarget.src = current.mediaUrl;
              }
            }}
          />
        )}

        {current.caption && (
          <Typography
            sx={{
              position: 'absolute',
              bottom: multi ? 36 : 8,
              left: 8,
              right: 8,
              color: '#EBE6D4',
              backgroundColor: 'rgba(0,0,0,0.55)',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: 13,
            }}
          >
            {current.caption}
          </Typography>
        )}

        {multi && (
          <>
            <IconButton
              aria-label="Previous media"
              onClick={() => go(-1)}
              sx={{
                position: 'absolute',
                left: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: 'rgba(10,18,16,0.45)',
                color: '#EBE6D4',
                width: 34,
                height: 34,
                '&:hover': { bgcolor: 'rgba(10,18,16,0.65)' },
              }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <IconButton
              aria-label="Next media"
              onClick={() => go(1)}
              sx={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                bgcolor: 'rgba(10,18,16,0.45)',
                color: '#EBE6D4',
                width: 34,
                height: 34,
                '&:hover': { bgcolor: 'rgba(10,18,16,0.65)' },
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </Box>

      {multi && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 0.75,
            mt: 1,
          }}
        >
          {items.map((_, i) => (
            <Box
              key={i}
              component="button"
              type="button"
              aria-label={`Go to media ${i + 1}`}
              onClick={() => setIndex(i)}
              sx={{
                width: i === safeIndex ? 8 : 6,
                height: i === safeIndex ? 8 : 6,
                borderRadius: '50%',
                border: 'none',
                p: 0,
                cursor: 'pointer',
                bgcolor: i === safeIndex ? '#E11D48' : 'rgba(22,48,42,0.28)',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PostMediaCarousel;
