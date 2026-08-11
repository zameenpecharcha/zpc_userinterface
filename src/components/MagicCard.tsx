import React, { useCallback, useState } from 'react';
import { Box, SxProps, Theme } from '@mui/material';

type MagicCardProps = {
  children: React.ReactNode;
  gradientSize?: number;
  /** Soft fill that follows the cursor */
  gradientColor?: string;
  gradientOpacity?: number;
  /** Border highlight start */
  gradientFrom?: string;
  /** Border highlight end */
  gradientTo?: string;
  /** Card surface colour (defaults to cream glass). */
  bgcolor?: string;
  sx?: SxProps<Theme>;
};

/**
 * Magic UI MagicCard — mouse spotlight + border glow (CRA/MUI, no framer-motion).
 */
export const MagicCard: React.FC<MagicCardProps> = ({
  children,
  gradientSize = 220,
  gradientColor = 'rgba(158, 182, 201, 0.45)',
  gradientOpacity = 0.75,
  gradientFrom = '#5F8670',
  gradientTo = '#EBE6D4',
  bgcolor = 'rgba(235, 230, 212, 0.88)',
  sx,
}) => {
  const [mouse, setMouse] = useState({ x: -gradientSize, y: -gradientSize });
  const [hover, setHover] = useState(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const onLeave = useCallback(() => {
    setHover(false);
    setMouse({ x: -gradientSize, y: -gradientSize });
  }, [gradientSize]);

  return (
    <Box
      onMouseMove={onMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={onLeave}
      sx={{
        position: 'relative',
        borderRadius: '18px',
        overflow: 'hidden',
        isolation: 'isolate',
        bgcolor,
        boxShadow:
          '0 12px 40px rgba(22, 48, 42, 0.14), inset 0 1px 0 rgba(235, 230, 212,0.6)',
        ...((sx as object) || {}),
      }}
    >
      {/* Border gradient ring */}
      <Box
        aria-hidden
        sx={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          padding: '1.5px',
          opacity: hover ? 1 : 0.55,
          transition: 'opacity 0.3s ease',
          background: `radial-gradient(${gradientSize}px circle at ${mouse.x}px ${mouse.y}px, ${gradientFrom}, ${gradientTo}, rgba(90,70,50,0.14) 72%)`,
          WebkitMask:
            'linear-gradient(#EBE6D4 0 0) content-box, linear-gradient(#EBE6D4 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          zIndex: 2,
        }}
      />

      {/* Spotlight fill */}
      <Box
        aria-hidden
        sx={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          opacity: hover ? gradientOpacity : 0,
          transition: 'opacity 0.3s ease',
          background: `radial-gradient(${gradientSize}px circle at ${mouse.x}px ${mouse.y}px, ${gradientColor}, transparent 70%)`,
          zIndex: 1,
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 3 }}>{children}</Box>
    </Box>
  );
};

export default MagicCard;
