import React from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ZpcLogoMark } from './ZpcLogo';
import '../../styles/aura.css';

type Props = {
  size?: number;
  ink?: 'light' | 'dark';
  /** Destination on click — defaults to home feed. */
  to?: string;
  /** Prefer this for in-app views (e.g. profile overlay on /home). */
  onNavigate?: () => void;
  animateStroke?: boolean;
  showTagline?: boolean;
  /** Transparent plate (e.g. already on dark header). */
  lightPlate?: boolean;
  /** Aura tint for light backgrounds (mobile drawer). */
  onLightBg?: boolean;
  className?: string;
  title?: string;
};

/**
 * Header / sidebar ZPC mark: click → home, hover → border-only aura-dual.
 */
export const ZpcNavLogo: React.FC<Props> = ({
  size = 44,
  ink = 'light',
  to = '/home',
  onNavigate,
  animateStroke = true,
  showTagline = false,
  lightPlate = true,
  onLightBg = false,
  className,
  title = 'ZPC — Home',
}) => {
  const navigate = useNavigate();
  const classes = [
    'zpc-nav-logo',
    lightPlate ? 'zpc-nav-logo--light' : '',
    onLightBg ? 'zpc-nav-logo--on-light' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  const goHome = () => {
    if (onNavigate) {
      onNavigate();
      return;
    }
    navigate(to);
  };

  return (
    <Box
      component="button"
      type="button"
      className={classes}
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        goHome();
      }}
      sx={{
        p: 0,
        m: 0,
        border: 0,
        background: 'transparent',
        font: 'inherit',
        cursor: 'pointer',
        position: 'relative',
        zIndex: 2,
        pointerEvents: 'auto',
      }}
    >
      <div className="zpc-logo-aura">
        <ZpcLogoMark
          className="zpc-logo-mark"
          size={size}
          showTagline={showTagline}
          animateStroke={animateStroke}
          ink={ink}
        />
        <span className="zpc-logo-aura-ring" aria-hidden />
      </div>
    </Box>
  );
};

export default ZpcNavLogo;
