import React from 'react';
import { Box, Typography } from '@mui/material';
import { BackgroundOption } from '../scene/backgroundRegistry';

const SPEEDS = [0.5, 1, 2, 4];

type Props = {
  option: BackgroundOption;
  simSpeed: number;
  onSimSpeed: (speed: number) => void;
};

/** Solar-system-style HUD — modern, quiet, readable over WebGL. */
const SceneSimHud: React.FC<Props> = ({ option, simSpeed, onSimSpeed }) => {
  if (!option.showSimHud) return null;

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          top: { xs: 14, sm: 22 },
          left: { xs: 14, sm: 24 },
          zIndex: 15,
          pointerEvents: 'none',
          maxWidth: 280,
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
            fontSize: { xs: 14, sm: 15 },
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

      <Box
        sx={{
          position: 'fixed',
          top: { xs: 14, sm: 22 },
          right: { xs: 14, sm: 24 },
          zIndex: 15,
          pointerEvents: 'none',
          textAlign: 'right',
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

      <Box
        sx={{
          position: 'fixed',
          top: { xs: 78, sm: 22 },
          left: { xs: '50%', sm: 'auto' },
          right: { xs: 'auto', sm: 24 },
          transform: { xs: 'translateX(-50%)', sm: 'none' },
          mt: { xs: 0, sm: 7 },
          zIndex: 15,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.6,
          py: 0.5,
          borderRadius: '999px',
          background: 'rgba(12, 18, 24, 0.45)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.14)',
          pointerEvents: 'auto',
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
                borderRadius: '999px',
                px: 1.1,
                py: 0.55,
                minWidth: 40,
                fontFamily: '"DM Sans", sans-serif',
                fontSize: 11,
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
