import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { ZPC_MOTION } from '../../theme/motion';

type TabEnterProps = BoxProps & {
  /** Active tab / panel id — changing this restarts the enter animation */
  tabKey: string | number;
};

/** Fade + slight rise when switching tabs / sections. */
const TabEnter: React.FC<TabEnterProps> = ({ tabKey, children, sx, ...rest }) => (
  <Box
    key={tabKey}
    sx={{
      width: '100%',
      animation: `zpcTabIn ${ZPC_MOTION.tab}ms ${ZPC_MOTION.ease} both`,
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

export default TabEnter;
