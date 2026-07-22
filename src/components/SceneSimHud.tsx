import React from 'react';
import { Box, Typography } from '@mui/material';
import { BackgroundOption } from '../scene/backgroundRegistry';

const SPEEDS = [0.5, 1, 2, 4];

type Props = {
  option: BackgroundOption;
  simSpeed: number;
  onSimSpeed: (speed: number) => void;
};

/** Solar-system-style HUD — compact on mobile so the login card stays usable. */
const SceneSimHud: React.FC<Props> = ({ option, simSpeed, onSimSpeed }) => {
  if (!option.showSimHud) return null;

  return (
    <>
      {/* Desktop / tablet: left title */}
      <Box
        sx={{
          position: 'fixed',
          top: { sm: 22 },
          left: { sm: 24 },
          zIndex: 15,
          pointerEvents: 'none',
          maxWidth: 280,
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.45)',
            mb: 0.4,
          }}
        >
          Simulation
        </Typography>
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 15,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.92)',
            textShadow: '0 1px 12px rgba(0,0,0,0.45)',
          }}
        >
          {option.hudTitle}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 12,
            color: 'rgba(255,255,255,0.55)',
            mt: 0.25,
          }}
        >
          {option.hudSubtitle}
        </Typography>
      </Box>

      {/* Desktop: status */}
      <Box
        sx={{
          position: 'fixed',
          top: 22,
          right: 24,
          zIndex: 15,
          pointerEvents: 'none',
          textAlign: 'right',
          display: { xs: 'none', md: 'block' },
        }}
      >
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          Status
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'flex-end', mt: 0.4 }}>
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: '#5dcea0',
              boxShadow: '0 0 10px #5dcea0',
            }}
          />
          <Typography
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            Live · {simSpeed}×
          </Typography>
        </Box>
      </Box>

      {/* Speed control — compact top-right on mobile, below status on desktop */}
      <Box
        sx={{
          position: 'fixed',
          top: {
            xs: 'max(8px, env(safe-area-inset-top))',
            sm: 22,
          },
          right: { xs: 10, sm: 24 },
          mt: { xs: 0, sm: 7 },
          zIndex: 15,
          display: 'flex',
          alignItems: 'center',
          gap: 0.35,
          px: { xs: 0.4, sm: 0.6 },
          py: { xs: 0.35, sm: 0.5 },
          borderRadius: '999px',
          background: 'rgba(12, 18, 24, 0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.14)',
          pointerEvents: 'auto',
          maxWidth: 'calc(100vw - 20px)',
        }}
      >
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: 'rgba(255,255,255,0.45)',
            px: 0.8,
            display: { xs: 'none', sm: 'block' },
          }}
        >
          TIME
        </Typography>
        {SPEEDS.map((s) => {
          const active = simSpeed === s;
          return (
            <Box
              key={s}
              component="button"
              type="button"
              onClick={() => onSimSpeed(s)}
              sx={{
                border: 'none',
                cursor: 'pointer',
                touchAction: 'manipulation',
                borderRadius: '999px',
                px: { xs: 0.85, sm: 1.1 },
                py: { xs: 0.45, sm: 0.55 },
                minWidth: { xs: 34, sm: 40 },
                minHeight: { xs: 32, sm: 'auto' },
                fontFamily: '"DM Sans", sans-serif',
                fontSize: { xs: 10, sm: 11 },
                fontWeight: 700,
                color: active ? '#0c1218' : 'rgba(255,255,255,0.75)',
                background: active ? 'rgba(255,255,255,0.92)' : 'transparent',
                transition: 'background 0.2s ease, color 0.2s ease',
                '&:hover': {
                  background: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.1)',
                },
              }}
            >
              {s}×
            </Box>
          );
        })}
      </Box>
    </>
  );
};

export default SceneSimHud;
