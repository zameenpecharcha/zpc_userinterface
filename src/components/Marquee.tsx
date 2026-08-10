import React from 'react';
import { Box } from '@mui/material';

type MarqueeProps = {
  children: React.ReactNode;
  reverse?: boolean;
  pauseOnHover?: boolean;
  durationSec?: number;
  gapPx?: number;
};

/**
 * CSS marquee (Magic UI–style) for CRA — no Tailwind required.
 * Duplicates children for a seamless loop.
 */
export const Marquee: React.FC<MarqueeProps> = ({
  children,
  reverse = false,
  pauseOnHover = false,
  durationSec = 28,
  gapPx = 16,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        overflow: 'hidden',
        userSelect: 'none',
        gap: `${gapPx}px`,
        '&:hover .marquee-track': pauseOnHover
          ? { animationPlayState: 'paused' }
          : undefined,
      }}
    >
      {[0, 1].map((copy) => (
        <Box
          key={copy}
          className="marquee-track"
          aria-hidden={copy === 1}
          sx={{
            display: 'flex',
            flexShrink: 0,
            justifyContent: 'space-around',
            gap: `${gapPx}px`,
            minWidth: '100%',
            animation: `${reverse ? 'zpcMarqueeReverse' : 'zpcMarquee'} ${durationSec}s linear infinite`,
            '@keyframes zpcMarquee': {
              from: { transform: 'translateX(0)' },
              to: { transform: 'translateX(calc(-100% - ' + gapPx + 'px))' },
            },
            '@keyframes zpcMarqueeReverse': {
              from: { transform: 'translateX(calc(-100% - ' + gapPx + 'px))' },
              to: { transform: 'translateX(0)' },
            },
          }}
        >
          {children}
        </Box>
      ))}
    </Box>
  );
};

export default Marquee;
