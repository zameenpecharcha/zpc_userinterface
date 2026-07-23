import React from 'react';
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';

/**
 * Share symbol: rounded square with arrow exiting the top-right gap.
 */
const ShareSymbol: React.FC<SvgIconProps> = ({ sx, ...props }) => (
  <SvgIcon
    viewBox="0 0 24 24"
    {...props}
    sx={{ fill: 'none', stroke: 'currentColor', ...sx }}
  >
    <path
      d="M15 3h6v6"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M10 14L21 3"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </SvgIcon>
);

export default ShareSymbol;
