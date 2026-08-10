import React, { useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';

type AnimatedListProps = {
  children: React.ReactNode;
  /** Delay between revealing each item (ms). */
  delay?: number;
  maxHeight?: number | string;
};

/**
 * Magic UI–style animated list without framer-motion.
 * Reveals children one-by-one; newest appear at the top of the stack.
 */
export const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  delay = 120,
  maxHeight = 360,
}) => {
  const childrenArray = useMemo(() => React.Children.toArray(children), [children]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [childrenArray.length]);

  useEffect(() => {
    if (index >= childrenArray.length - 1) return undefined;
    const t = window.setTimeout(() => {
      setIndex((prev) => Math.min(prev + 1, childrenArray.length - 1));
    }, delay);
    return () => window.clearTimeout(t);
  }, [index, delay, childrenArray.length]);

  const itemsToShow = useMemo(
    () => childrenArray.slice(0, index + 1).reverse(),
    [index, childrenArray]
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 1.25,
        width: '100%',
        maxHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        px: 0.5,
        py: 0.5,
        scrollbarWidth: 'thin',
      }}
    >
      {itemsToShow.map((item, i) => {
        const key = (item as React.ReactElement)?.key ?? `anim-${i}`;
        return (
          <Box
            key={key}
            sx={{
              width: '100%',
              transformOrigin: 'top center',
              animation: 'zpcNotifPop 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
              '@keyframes zpcNotifPop': {
                from: { opacity: 0, transform: 'scale(0.86) translateY(-10px)' },
                to: { opacity: 1, transform: 'scale(1) translateY(0)' },
              },
            }}
          >
            {item}
          </Box>
        );
      })}
    </Box>
  );
};

export default AnimatedList;
