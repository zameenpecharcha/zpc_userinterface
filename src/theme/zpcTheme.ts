/**
 * ZPC finalized visual system
 * - Colors: Forest Noir (higher contrast) — no pure white
 * - Fonts: Newsprint Charcha (Libre Caslon Text + Source Serif 4)
 */

export const ZPC_COLORS = {
  bg: '#EBE6D4',
  surface: '#E8E2CE',
  surface2: '#DDD6C0',
  border: '#A89F84',
  primary: '#16302A',
  primaryHover: '#0A1C18',
  /** Cream ink on dark chrome — never pure white */
  primaryContrast: '#EBE6D4',
  accent: '#5F8670',
  accentContrast: '#0A1410',
  text: '#0A1210',
  textMuted: '#3A4540',
} as const;

export const ZPC_RADIUS = 14;

export const ZPC_FONTS = {
  display: '"Libre Caslon Text", "Libre Baskerville", Georgia, serif',
  body: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
} as const;

/** Cream / forest glass — no white fills. */
export const ZPC_GLASS = {
  panel: 'rgba(232, 226, 206, 0.55)',
  panelStrong: 'rgba(232, 226, 206, 0.72)',
  panelSoft: 'rgba(232, 226, 206, 0.32)',
  green: 'rgba(22, 48, 42, 0.16)',
  greenLogin: 'rgba(22, 48, 42, 0.22)',
  greenBorder: 'rgba(235, 230, 212, 0.35)',
  header: 'rgba(22, 48, 42, 0.32)',
  inset: 'rgba(22, 48, 42, 0.08)',
  tab: 'rgba(232, 226, 206, 0.4)',
  tabActive: 'rgba(22, 48, 42, 0.88)',
  border: 'rgba(22, 48, 42, 0.2)',
  borderStrong: 'rgba(22, 48, 42, 0.32)',
  blur: 'blur(18px) saturate(1.25)',
  blurSoft: 'blur(12px) saturate(1.15)',
} as const;
