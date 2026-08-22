import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { Box, BoxProps } from '@mui/material';
import AdminBackground from '../admin/AdminBackground';
import { PAGE_ATMOSPHERE } from '../../theme/surfaces';

type PageScrollContextValue = {
  scrollToTop: (behavior?: ScrollBehavior) => void;
  getScrollElement: () => HTMLElement | null;
};

const PageScrollContext = createContext<PageScrollContextValue>({
  scrollToTop: (behavior = 'smooth') => window.scrollTo({ top: 0, behavior }),
  getScrollElement: () => null,
});

export function usePageScroll() {
  return useContext(PageScrollContext);
}

type ScrollablePageShellProps = BoxProps & {
  header?: React.ReactNode;
  showBackground?: boolean;
  scrollRef?: React.MutableRefObject<HTMLElement | null>;
};

/** Fixed header + scrollable main — scrollbar does not cover the header. */
export const ScrollablePageShell: React.FC<ScrollablePageShellProps> = ({
  header,
  showBackground = true,
  scrollRef: scrollRefProp,
  children,
  sx,
  ...rest
}) => {
  const scrollRefLocal = useRef<HTMLElement | null>(null);

  const setScrollRef = useCallback(
    (node: HTMLElement | null) => {
      scrollRefLocal.current = node;
      if (scrollRefProp) {
        scrollRefProp.current = node;
      }
    },
    [scrollRefProp],
  );

  const scrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    scrollRefLocal.current?.scrollTo({ top: 0, behavior });
  }, []);

  const value = useMemo<PageScrollContextValue>(
    () => ({
      scrollToTop,
      getScrollElement: () => scrollRefLocal.current,
    }),
    [scrollToTop],
  );

  return (
    <PageScrollContext.Provider value={value}>
      <Box
        sx={{
          position: 'relative',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          ...PAGE_ATMOSPHERE,
          ...sx,
        }}
        {...rest}
      >
        {showBackground && <AdminBackground />}
        {header ? (
          <Box component="header" sx={{ flexShrink: 0, position: 'relative', zIndex: 1201 }}>
            {header}
          </Box>
        ) : null}
        <Box
          ref={setScrollRef}
          className="zpc-page-scroll-region"
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {children}
        </Box>
      </Box>
    </PageScrollContext.Provider>
  );
};

export default ScrollablePageShell;
