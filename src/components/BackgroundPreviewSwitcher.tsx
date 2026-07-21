import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  BACKGROUND_OPTIONS,
  BackgroundId,
  BackgroundOption,
} from '../scene/backgroundRegistry';

type Props = {
  value: BackgroundId;
  onChange: (id: BackgroundId, option: BackgroundOption) => void;
};

/** Temporary preview bar so you can compare all landing backgrounds. */
const BackgroundPreviewSwitcher: React.FC<Props> = ({ value, onChange }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        left: '50%',
        bottom: {
          xs: 'max(8px, env(safe-area-inset-bottom))',
          sm: 20,
        },
        transform: 'translateX(-50%)',
        zIndex: 20,
        width: { xs: 'calc(100vw - 16px)', sm: 'min(94vw, 720px)' },
        maxWidth: 720,
        px: { xs: 0.85, sm: 1.25 },
        py: { xs: 0.75, sm: 1.15 },
        borderRadius: { xs: '12px', sm: '16px' },
        background: 'rgba(18, 24, 28, 0.72)',
        backdropFilter: 'blur(16px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.28)',
        pointerEvents: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <Typography
        sx={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: { xs: 9, sm: 11 },
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.55)',
          textAlign: 'center',
          mb: { xs: 0.5, sm: 0.85 },
          display: { xs: 'none', sm: 'block' },
        }}
      >
        Preview — PDF concepts × solar-system polish
      </Typography>
      <Typography
        sx={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'center',
          mb: 0.5,
          display: { xs: 'block', sm: 'none' },
        }}
      >
        Background
      </Typography>
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 0.45, sm: 0.6 },
          overflowX: 'auto',
          pb: 0.25,
          justifyContent: { xs: 'flex-start', sm: 'center' },
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {BACKGROUND_OPTIONS.map((opt) => {
          const active = opt.id === value;
          return (
            <Box
              key={opt.id}
              component="button"
              type="button"
              onClick={() => onChange(opt.id, opt)}
              title={opt.description}
              sx={{
                flex: '0 0 auto',
                cursor: 'pointer',
                touchAction: 'manipulation',
                border: active
                  ? '1px solid rgba(255,255,255,0.55)'
                  : '1px solid rgba(255,255,255,0.12)',
                background: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
                color: '#f5f2eb',
                borderRadius: { xs: '10px', sm: '12px' },
                px: { xs: 1, sm: 1.35 },
                py: { xs: 0.7, sm: 0.85 },
                minWidth: { xs: 58, sm: 96 },
                minHeight: { xs: 40, sm: 'auto' },
                fontFamily: '"DM Sans", sans-serif',
                transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
                '&:hover': {
                  background: 'rgba(255,255,255,0.14)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <Typography sx={{ fontSize: { xs: 11, sm: 12 }, fontWeight: 700, lineHeight: 1.2 }}>
                {opt.short}
              </Typography>
              <Typography
                sx={{
                  fontSize: 10,
                  opacity: 0.7,
                  mt: 0.25,
                  display: { xs: 'none', sm: 'block' },
                  whiteSpace: 'nowrap',
                }}
              >
                {opt.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default BackgroundPreviewSwitcher;
