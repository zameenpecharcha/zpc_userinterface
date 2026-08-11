import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { ZPC_MOTION } from '../../theme/motion';

type PageEnterProps = BoxProps & {
  /** Remount key — usually pathname */
  enterKey?: string | number;
};

/**
 * Soft fade + rise when a route/page mounts.
 * Prefer wrapping each page root once (or wrapping Routes with location.key).
 */
const PageEnter: React.FC<PageEnterProps> = ({ enterKey, children, sx, ...rest }) => (
  <Box
    key={enterKey}
    sx={{
      width: '100%',
      minHeight: '100%',
      animation: `zpcPageIn ${ZPC_MOTION.page}ms ${ZPC_MOTION.ease} both`,
      '@media (prefers-reduced-motion: reduce)': {
        animation: 'none',
      },
      ...sx,
    }}
    {...rest}
  >
    {children}
  </Box>
);

export default PageEnter;
