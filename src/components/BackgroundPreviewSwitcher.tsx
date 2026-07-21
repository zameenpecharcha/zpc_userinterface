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
        bottom: { xs: 12, sm: 20 },
        transform: 'translateX(-50%)',
        zIndex: 20,
        width: 'min(94vw, 720px)',
        px: { xs: 1, sm: 1.25 },
        py: { xs: 1, sm: 1.15 },
        borderRadius: '16px',
        background: 'rgba(18, 24, 28, 0.55)',
        backdropFilter: 'blur(16px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.28)',
        pointerEvents: 'auto',
      }}
    >
      <Typography
        sx={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.55)',
          textAlign: 'center',
          mb: 0.85,
        }}
      >
        Preview — PDF concepts × solar-system polish
      </Typography>
      <Box
        sx={{
          display: 'flex',
          gap: 0.6,
          overflowX: 'auto',
          pb: 0.25,
          justifyContent: { xs: 'flex-start', sm: 'center' },
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
                border: active
                  ? '1px solid rgba(255,255,255,0.55)'
                  : '1px solid rgba(255,255,255,0.12)',
                background: active ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
                color: '#f5f2eb',
                borderRadius: '12px',
                px: { xs: 1.1, sm: 1.35 },
                py: 0.85,
                minWidth: { xs: 72, sm: 96 },
                fontFamily: '"DM Sans", sans-serif',
                transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
                '&:hover': {
                  background: 'rgba(255,255,255,0.14)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
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
