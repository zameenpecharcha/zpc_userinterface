import React, { useEffect, useId, useRef } from 'react';
import { Box, BoxProps } from '@mui/material';

type MarkProps = {
  /** Overall mark width in px (height scales with tagline). */
  size?: number;
  /** Show tagline under the house-bubble. */
  showTagline?: boolean;
  /** Animate a soft pulse on the white stroke (optional). */
  animateStroke?: boolean;
  /** `light` = cream/white ink (dark bg); `dark` = forest ink (cream bg). */
  ink?: 'light' | 'dark';
  className?: string;
};

/**
 * Accurate ZPC mark: house + chat-bubble outline, white stroke + outer rectangle frame.
 */
export const ZpcLogoMark: React.FC<MarkProps> = ({
  size = 168,
  showTagline = true,
  animateStroke = true,
  ink = 'light',
  className,
}) => {
  const uid = useId().replace(/:/g, '');
  const glowId = `zpcGlow-${uid}`;
  /** Frame + house stroke — white as requested. */
  const borderColor = '#FFFFFF';
  const inkFill = ink === 'dark' ? '#16302A' : '#EBE6D4';
  /** Outer frame — padded so peak, ZPC, and chat-tail stroke sit inside. */
  const frame = { x: 18, y: 12, width: 244, height: 270 };
  // Nav / compact: crop empty viewBox margins so hover rings hug the mark
  const viewBox = showTagline
    ? '0 0 280 330'
    : `${frame.x} ${frame.y} ${frame.width} ${frame.height}`;

  return (
    <Box
      component="svg"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      role="img"
      aria-label="ZPC — chat drives every deal"
      sx={{
        width: size,
        height: 'auto',
        display: 'block',
        overflow: showTagline ? 'visible' : 'hidden',
        '@media (prefers-reduced-motion: reduce)': {
          '& .zpc-border-anim': { animation: 'none' },
        },
      }}
    >
      <defs>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="#0A1210" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Outer rectangle border — fits house + ZPC (tail included) */}
      <rect
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        rx={18}
        ry={18}
        fill="none"
        stroke={borderColor}
        strokeWidth={4}
        filter={`url(#${glowId})`}
      >
        {animateStroke && (
          <animate
            className="zpc-border-anim"
            attributeName="stroke-opacity"
            values="1;0.72;1"
            dur="4s"
            repeatCount="indefinite"
          />
        )}
      </rect>

      {/* House + speech-bubble outline — white */}
      <path
        d="M140 36
           L214 96
           C222 102 226 108 226 118
           L226 198
           C226 214 214 226 198 226
           L108 226
           L72 262
           L84 226
           L82 226
           C66 226 54 214 54 198
           L54 118
           C54 108 58 102 66 96
           Z"
        fill="none"
        stroke={borderColor}
        strokeWidth={14}
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={`url(#${glowId})`}
      />

      <text
        x={140}
        y={168}
        textAnchor="middle"
        fontFamily='"Libre Caslon Text", "Libre Baskerville", Georgia, serif'
        fontSize={52}
        fontWeight={700}
        letterSpacing={1.5}
        fill={inkFill}
      >
        ZPC
      </text>

      {showTagline && (
        <text
          x={140}
          y={312}
          textAnchor="middle"
          fontFamily='"Source Serif 4", "Source Serif Pro", Georgia, serif'
          fontSize={14}
          fontWeight={400}
          letterSpacing={0.3}
          fill={inkFill}
        >
          chat drives every deal
        </text>
      )}
    </Box>
  );
};

type StageProps = BoxProps & {
  /** Logo mark size. */
  logoSize?: number;
  /** Full-bleed animated navy stage (login splash / brand page). */
  fullBleed?: boolean;
  showTagline?: boolean;
};

/**
 * ZPC logo on the brand navy plate with animated lime/cyan atmosphere mesh.
 */
export const ZpcLogoStage: React.FC<StageProps> = ({
  logoSize = 220,
  fullBleed = false,
  showTagline = true,
  sx,
  ...rest
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let w = 0;
    let h = 0;
    let t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type Node = { x: number; y: number; vx: number; vy: number; r: number; hue: number };
    let nodes: Node[] = [];

    const resize = () => {
      const parent = canvas.parentElement;
      w = parent?.clientWidth || window.innerWidth;
      h = parent?.clientHeight || window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(22, Math.floor((w * h) / 42000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: 1 + Math.random() * 1.6,
        hue: Math.random(),
      }));
    };

    const draw = () => {
      t += mq.matches ? 0 : 0.006;
      ctx.clearRect(0, 0, w, h);

      // Brand navy plate
      ctx.fillStyle = '#070B12';
      ctx.fillRect(0, 0, w, h);

      // Drifting lime / cyan washes (matches stroke gradient)
      const g1 = ctx.createRadialGradient(
        w * (0.28 + Math.sin(t) * 0.06),
        h * (0.22 + Math.cos(t * 0.8) * 0.05),
        0,
        w * 0.3,
        h * 0.25,
        w * 0.55,
      );
      g1.addColorStop(0, 'rgba(184, 255, 60, 0.16)');
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(
        w * (0.72 + Math.cos(t * 0.9) * 0.05),
        h * (0.7 + Math.sin(t * 0.7) * 0.06),
        0,
        w * 0.75,
        h * 0.72,
        w * 0.5,
      );
      g2.addColorStop(0, 'rgba(0, 232, 255, 0.14)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      if (!mq.matches) {
        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < -20) n.x = w + 20;
          if (n.x > w + 20) n.x = -20;
          if (n.y < -20) n.y = h + 20;
          if (n.y > h + 20) n.y = -20;
        }
      }

      const linkDist = Math.min(130, w * 0.14);
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            const alpha = (1 - d / linkDist) * 0.28;
            const mid = (a.hue + b.hue) / 2;
            ctx.strokeStyle =
              mid < 0.5
                ? `rgba(184, 255, 60, ${alpha})`
                : `rgba(0, 232, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.fillStyle =
          n.hue < 0.5 ? 'rgba(184, 255, 60, 0.55)' : 'rgba(0, 232, 255, 0.5)';
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <Box
      {...rest}
      sx={{
        position: fullBleed ? 'relative' : 'relative',
        ...(fullBleed
          ? { width: '100%', minHeight: '100vh' }
          : {
              width: '100%',
              minHeight: 360,
              borderRadius: 3,
              overflow: 'hidden',
            }),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#070B12',
        ...sx,
      }}
    >
      <Box
        component="canvas"
        ref={canvasRef}
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      <Box sx={{ position: 'relative', zIndex: 1, py: 4 }}>
        <ZpcLogoMark size={logoSize} showTagline={showTagline} animateStroke />
      </Box>
    </Box>
  );
};

export default ZpcLogoStage;
