import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AppsIcon from '@mui/icons-material/Apps';
import { ZPC_MOTION } from '../theme/motion';

export type PostMediaItem = {
  id?: number | string;
  mediaType?: string;
  mediaUrl?: string;
  signedUrl?: string;
  caption?: string;
};

type Props = {
  media: PostMediaItem[];
  /** Fixed stage height for the media box (tiles + expanded stay inside). */
  maxHeight?: number | { xs?: number; sm?: number };
  /** Square corners for LinkedIn-style edge-to-edge cards. */
  edgeToEdge?: boolean;
};

type TileRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function mediaSrc(m: PostMediaItem) {
  return m.signedUrl || m.mediaUrl || '';
}

function isVideo(m: PostMediaItem) {
  const t = (m.mediaType || '').toLowerCase();
  if (t === 'video') return true;
  const url = mediaSrc(m).toLowerCase();
  return /\.(mp4|webm|mov|m4v)(\?|$)/.test(url);
}

function resolveHeight(maxHeight: Props['maxHeight']) {
  if (typeof maxHeight === 'number') {
    return { xs: maxHeight, sm: maxHeight };
  }
  return {
    xs: maxHeight?.xs ?? 320,
    sm: maxHeight?.sm ?? 420,
  };
}

function masonryColumnCount(count: number) {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count <= 6) return 3;
  if (count <= 12) return 4;
  return 5;
}

/** Soft-clamp aspect so one extreme portrait/landscape cannot dominate the box. */
function layoutAspect(ar: number) {
  if (!(ar > 0)) return 1;
  // Keep portrait vs landscape, but avoid huge empty gaps
  return Math.min(1.7, Math.max(0.62, ar));
}

/**
 * Pack masonry (portrait/landscape) into full-width columns, then auto-size
 * heights so every column fills the media box — no scroll, no empty pockets.
 */
function packMasonryTiles(
  count: number,
  aspects: number[], // width / height
  boxW: number,
  boxH: number,
  gap: number
): TileRect[] {
  if (count <= 0 || boxW <= 0 || boxH <= 0) return [];

  // Two images: classic side-by-side fill
  if (count === 2) {
    const w = (boxW - gap) / 2;
    return [
      { left: 0, top: 0, width: w, height: boxH },
      { left: w + gap, top: 0, width: w, height: boxH },
    ];
  }

  const cols = masonryColumnCount(count);
  const colW = (boxW - gap * (cols - 1)) / cols;
  const colHeights = Array.from({ length: cols }, () => 0);
  const raw: Array<{ col: number; w: number; h: number; i: number }> = [];

  for (let i = 0; i < count; i += 1) {
    const ar = layoutAspect(aspects[i] > 0.05 ? aspects[i] : 1);
    const h = colW / ar;
    let col = 0;
    for (let c = 1; c < cols; c += 1) {
      if (colHeights[c] < colHeights[col]) col = c;
    }
    raw.push({ col, w: colW, h, i });
    colHeights[col] += h + gap;
  }

  const byCol: typeof raw[] = Array.from({ length: cols }, () => []);
  raw.forEach((r) => byCol[r.col].push(r));

  const result: TileRect[] = Array.from({ length: count });

  byCol.forEach((list, col) => {
    if (list.length === 0) return;
    const sumH = list.reduce((s, r) => s + r.h, 0);
    const gaps = gap * Math.max(0, list.length - 1);
    const target = Math.max(1, boxH - gaps);
    const grow = sumH > 0 ? target / sumH : 1;

    let y = 0;
    list.forEach((r) => {
      const h = Math.max(24, r.h * grow);
      result[r.i] = {
        left: col * (colW + gap),
        top: y,
        width: colW,
        height: h,
      };
      y += h + gap;
    });
  });

  for (let i = 0; i < count; i += 1) {
    if (!result[i]) {
      result[i] = { left: 0, top: 0, width: colW, height: Math.max(24, boxH / count) };
    }
  }

  return result;
}

/**
 * Masonry tiles (portrait + landscape) scaled to fit the media box with no scroll.
 * Click expands in-place; swipe/arrows move between items. Videos autoplay muted in tiles.
 */
const PostMediaCarousel: React.FC<Props> = ({
  media,
  maxHeight = { xs: 320, sm: 420 },
  edgeToEdge = false,
}) => {
  const items = (media || []).filter((m) => mediaSrc(m));
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(items.length === 1);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [aspects, setAspects] = useState<number[]>(() => items.map(() => 1));
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const lockAxis = useRef<'x' | 'y' | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const tileVideoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const idleTimerRef = useRef<number | null>(null);
  const outOfViewTimerRef = useRef<number | null>(null);

  const IDLE_COLLAPSE_MS = 8000;
  const OUT_OF_VIEW_COLLAPSE_MS = 1200;
  const TILE_GAP = 4;
  const PAD = 4;

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current != null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearOutOfViewTimer = useCallback(() => {
    if (outOfViewTimerRef.current != null) {
      window.clearTimeout(outOfViewTimerRef.current);
      outOfViewTimerRef.current = null;
    }
  }, []);

  const collapseToTiles = useCallback(() => {
    if (items.length <= 1) return;
    setExpanded(false);
    setDragX(0);
    clearIdleTimer();
    clearOutOfViewTimer();
  }, [items.length, clearIdleTimer, clearOutOfViewTimer]);

  const bumpActivity = useCallback(() => {
    clearIdleTimer();
    if (items.length <= 1) return;
    idleTimerRef.current = window.setTimeout(() => {
      setExpanded((isOpen) => {
        if (!isOpen) return isOpen;
        setDragX(0);
        return false;
      });
    }, IDLE_COLLAPSE_MS);
  }, [clearIdleTimer, items.length, IDLE_COLLAPSE_MS]);

  useEffect(() => {
    setIndex(0);
    setExpanded(items.length === 1);
    setDragX(0);
    setAspects(items.map(() => 1));
    clearIdleTimer();
    clearOutOfViewTimer();
  }, [items.length, clearIdleTimer, clearOutOfViewTimer]);

  useEffect(() => {
    Object.values(tileVideoRefs.current).forEach((el) => {
      if (!el) return;
      if (!expanded) {
        el.muted = true;
        const p = el.play();
        if (p && typeof p.catch === 'function') p.catch(() => undefined);
      } else {
        el.pause();
      }
    });
  }, [expanded, items.length]);

  useEffect(() => {
    if (expanded && items.length > 1) bumpActivity();
    else clearIdleTimer();
    return clearIdleTimer;
  }, [expanded, index, items.length, bumpActivity, clearIdleTimer]);

  useEffect(() => {
    if (!expanded || items.length <= 1) return undefined;
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearOutOfViewTimer();
          bumpActivity();
          return;
        }
        clearOutOfViewTimer();
        outOfViewTimerRef.current = window.setTimeout(() => {
          collapseToTiles();
        }, OUT_OF_VIEW_COLLAPSE_MS);
      },
      { threshold: 0.28, rootMargin: '0px' }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearOutOfViewTimer();
    };
  }, [
    expanded,
    items.length,
    bumpActivity,
    collapseToTiles,
    clearOutOfViewTimer,
    OUT_OF_VIEW_COLLAPSE_MS,
  ]);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBoxSize({
        w: Math.max(0, r.width - PAD * 2),
        h: Math.max(0, r.height - PAD * 2),
      });
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [items.length, expanded]);

  const setAspectAt = useCallback((i: number, w: number, h: number) => {
    if (!(w > 0 && h > 0)) return;
    const next = w / h;
    setAspects((prev) => {
      if (prev[i] != null && Math.abs(prev[i] - next) < 0.01) return prev;
      const copy = prev.slice();
      while (copy.length < items.length) copy.push(1);
      copy[i] = next;
      return copy;
    });
  }, [items.length]);

  const tiles = useMemo(
    () => packMasonryTiles(items.length, aspects, boxSize.w, boxSize.h, TILE_GAP),
    [items.length, aspects, boxSize.w, boxSize.h]
  );

  const safeIndex = Math.min(Math.max(0, index), Math.max(0, items.length - 1));
  const multi = items.length > 1;
  const height = resolveHeight(maxHeight);
  const ease = ZPC_MOTION.ease;
  const slideMs = 380;

  const goTo = useCallback(
    (next: number) => {
      if (items.length === 0) return;
      const wrapped = ((next % items.length) + items.length) % items.length;
      setIndex(wrapped);
      setDragX(0);
      bumpActivity();
    },
    [items.length, bumpActivity]
  );

  const go = useCallback((dir: -1 | 1) => goTo(safeIndex + dir), [goTo, safeIndex]);

  const openAt = (i: number) => {
    setIndex(i);
    setDragX(0);
    setExpanded(true);
    bumpActivity();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!expanded || !multi) return;
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    lockAxis.current = null;
    setDragging(true);
    bumpActivity();
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!expanded || !multi || touchStartX.current == null) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - (touchStartY.current ?? t.clientY);

    if (!lockAxis.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      lockAxis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (lockAxis.current !== 'x') return;
    setDragX(dx);
  };

  const onTouchEnd = () => {
    if (!expanded || !multi) return;
    const threshold = Math.min(72, (stageRef.current?.clientWidth || 280) * 0.18);
    if (lockAxis.current === 'x') {
      if (dragX <= -threshold) go(1);
      else if (dragX >= threshold) go(-1);
      else {
        setDragX(0);
        bumpActivity();
      }
    } else {
      setDragX(0);
      bumpActivity();
    }
    touchStartX.current = null;
    touchStartY.current = null;
    lockAxis.current = null;
    setDragging(false);
  };

  if (items.length === 0) return null;

  const playMuted = (el: HTMLVideoElement) => {
    el.muted = true;
    const p = el.play();
    if (p && typeof p.catch === 'function') p.catch(() => undefined);
  };

  const renderExpandedMedia = (item: PostMediaItem, i: number) => {
    const src = mediaSrc(item);
    if (isVideo(item)) {
      return (
        <Box
          component="video"
          key={`exp-${src}-${i}-${safeIndex === i}`}
          src={src}
          controls
          playsInline
          autoPlay={safeIndex === i}
          loop
          preload="metadata"
          sx={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'contain',
            backgroundColor: 'rgba(10,18,16,0.06)',
          }}
        />
      );
    }
    return (
      <Box
        component="img"
        src={src}
        alt={item.caption || `Post media ${i + 1}`}
        draggable={false}
        sx={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'contain',
          userSelect: 'none',
        }}
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
          if (item.signedUrl && e.currentTarget.src === item.signedUrl && item.mediaUrl) {
            e.currentTarget.src = item.mediaUrl;
          }
        }}
      />
    );
  };

  const renderTileMedia = (item: PostMediaItem, i: number, fit: 'cover' | 'contain' = 'cover') => {
    const src = mediaSrc(item);
    if (isVideo(item)) {
      return (
        <Box
          component="video"
          ref={(el: HTMLVideoElement | null) => {
            tileVideoRefs.current[i] = el;
          }}
          src={src}
          muted
          playsInline
          autoPlay
          loop
          preload="metadata"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: fit,
            display: 'block',
            backgroundColor: 'rgba(10,18,16,0.06)',
            pointerEvents: 'none',
          }}
          onLoadedMetadata={(e: React.SyntheticEvent<HTMLVideoElement>) => {
            const el = e.currentTarget;
            setAspectAt(i, el.videoWidth, el.videoHeight);
            playMuted(el);
          }}
          onLoadedData={(e: React.SyntheticEvent<HTMLVideoElement>) => playMuted(e.currentTarget)}
        />
      );
    }
    return (
      <Box
        component="img"
        src={src}
        alt={item.caption || `Post media ${i + 1}`}
        draggable={false}
        loading="lazy"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: fit,
          display: 'block',
          userSelect: 'none',
        }}
        onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
          const el = e.currentTarget;
          setAspectAt(i, el.naturalWidth, el.naturalHeight);
        }}
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
          if (item.signedUrl && e.currentTarget.src === item.signedUrl && item.mediaUrl) {
            e.currentTarget.src = item.mediaUrl;
          }
        }}
      />
    );
  };

  return (
    <Box sx={{ mb: edgeToEdge ? 0 : 2, position: 'relative', width: '100%' }}>
      <Box
        ref={stageRef}
        sx={{
          position: 'relative',
          width: '100%',
          height: { xs: height.xs, sm: height.sm },
          borderRadius: edgeToEdge ? 0 : 3,
          overflow: 'hidden',
          bgcolor: 'rgba(10,18,16,0.06)',
          touchAction: expanded && multi ? 'pan-y' : 'auto',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {/* Masonry tiles scaled to fit — no scroll */}
        <Box
          aria-hidden={expanded}
          sx={{
            position: 'absolute',
            inset: 0,
            p: multi ? `${PAD}px` : 0,
            overflow: 'hidden',
            opacity: expanded ? 0 : 1,
            transform: expanded ? 'scale(0.97)' : 'scale(1)',
            transition: `opacity ${slideMs}ms ${ease}, transform ${slideMs}ms ${ease}`,
            pointerEvents: expanded ? 'none' : 'auto',
            zIndex: expanded ? 0 : 2,
          }}
        >
          {multi ? (
            <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
              {items.map((item, i) => {
                const rect = tiles[i];
                if (!rect) return null;
                return (
                  <Box
                    key={item.id ?? `${mediaSrc(item)}-${i}`}
                    component="button"
                    type="button"
                    onClick={() => openAt(i)}
                    aria-label={`Open media ${i + 1}`}
                    sx={{
                      position: 'absolute',
                      left: rect.left,
                      top: rect.top,
                      width: rect.width,
                      height: rect.height,
                      border: 'none',
                      p: 0,
                      m: 0,
                      borderRadius: 0.75,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      bgcolor: 'rgba(235,230,212,0.35)',
                      zIndex: 1,
                      transition: `transform 220ms ${ease}, box-shadow 220ms ${ease}, z-index 0s`,
                      '&:hover': {
                        zIndex: 3,
                        transform: 'translateY(-3px) scale(1.03)',
                        boxShadow: '0 10px 24px rgba(10,18,16,0.22)',
                      },
                      '&:hover img, &:hover video': {
                        transform: 'scale(1.06)',
                      },
                      '& img, & video': {
                        transition: `transform 280ms ${ease}`,
                      },
                      '&:focus-visible': {
                        outline: '2px solid #0F766E',
                        outlineOffset: 1,
                      },
                    }}
                  >
                    {renderTileMedia(item, i, 'cover')}
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box
              component="button"
              type="button"
              onClick={() => openAt(0)}
              aria-label="Open media"
              sx={{
                display: 'block',
                width: '100%',
                height: '100%',
                border: 'none',
                p: 0,
                m: 0,
                cursor: 'pointer',
                bgcolor: 'transparent',
                overflow: 'hidden',
              }}
            >
              {renderTileMedia(items[0], 0, 'contain')}
            </Box>
          )}
        </Box>

        {/* Expanded slide strip */}
        <Box
          aria-hidden={!expanded}
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: expanded ? 1 : 0,
            transform: expanded ? 'scale(1)' : 'scale(1.03)',
            transition: `opacity ${slideMs}ms ${ease}, transform ${slideMs}ms ${ease}`,
            pointerEvents: expanded ? 'auto' : 'none',
            zIndex: expanded ? 2 : 0,
            overflow: 'hidden',
            bgcolor: 'rgba(10,18,16,0.06)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              height: '100%',
              width: '100%',
              transform: `translate3d(calc(${-safeIndex * 100}% + ${dragX}px), 0, 0)`,
              transition: dragging ? 'none' : `transform ${slideMs}ms ${ease}`,
              willChange: 'transform',
            }}
          >
            {items.map((item, i) => (
              <Box
                key={item.id ?? `slide-${mediaSrc(item)}-${i}`}
                sx={{
                  flex: '0 0 100%',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {renderExpandedMedia(item, i)}
                {item.caption ? (
                  <Typography
                    sx={{
                      position: 'absolute',
                      bottom: multi ? 40 : 10,
                      left: 8,
                      right: 8,
                      color: '#EBE6D4',
                      backgroundColor: 'rgba(0,0,0,0.55)',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: 13,
                    }}
                  >
                    {item.caption}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Box>

          {multi ? (
            <>
              <IconButton
                aria-label="Previous media"
                onClick={() => go(-1)}
                sx={{
                  position: 'absolute',
                  left: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(10,18,16,0.5)',
                  color: '#EBE6D4',
                  width: 34,
                  height: 34,
                  zIndex: 3,
                  display: { xs: 'none', sm: 'inline-flex' },
                  '&:hover': { bgcolor: 'rgba(10,18,16,0.7)' },
                }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label="Next media"
                onClick={() => go(1)}
                sx={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(10,18,16,0.5)',
                  color: '#EBE6D4',
                  width: 34,
                  height: 34,
                  zIndex: 3,
                  display: { xs: 'none', sm: 'inline-flex' },
                  '&:hover': { bgcolor: 'rgba(10,18,16,0.7)' },
                }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label="Show all media as tiles"
                onClick={collapseToTiles}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'rgba(10,18,16,0.5)',
                  color: '#EBE6D4',
                  width: 32,
                  height: 32,
                  zIndex: 3,
                  '&:hover': { bgcolor: 'rgba(10,18,16,0.7)' },
                }}
              >
                <AppsIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </>
          ) : null}
        </Box>
      </Box>

      {multi && expanded ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 0.75,
            mt: 1,
          }}
        >
          {items.map((_, i) => (
            <Box
              key={i}
              component="button"
              type="button"
              aria-label={`Go to media ${i + 1}`}
              onClick={() => goTo(i)}
              sx={{
                width: i === safeIndex ? 18 : 6,
                height: 6,
                borderRadius: 99,
                border: 'none',
                p: 0,
                cursor: 'pointer',
                bgcolor: i === safeIndex ? '#E11D48' : 'rgba(22,48,42,0.28)',
                transition: `all 220ms ${ease}`,
              }}
            />
          ))}
        </Box>
      ) : null}

      {multi && !expanded ? (
        <Typography sx={{ mt: 0.75, fontSize: 12, color: '#5C675F', textAlign: 'center' }}>
          Tap to expand · swipe for next
        </Typography>
      ) : null}
    </Box>
  );
};

export default PostMediaCarousel;
