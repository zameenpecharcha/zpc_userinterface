/** Shared translucent glass surfaces — Forest Noir cream glass (no white). */

import { ZPC_COLORS, ZPC_GLASS } from './zpcTheme';

/** Thin cream/forest scrollbar for modal bodies (Create Post / Property). */
export const THIN_CREAM_SCROLLBAR = {
  scrollbarWidth: 'thin' as const,
  scrollbarColor: 'rgba(22,48,42,0.35) rgba(235,230,212,0.55)',
  '&::-webkit-scrollbar': {
    width: 8,
    height: 8,
  },
  '&::-webkit-scrollbar-track': {
    marginTop: 8,
    marginBottom: 8,
    background: 'rgba(235,230,212,0.45)',
    borderRadius: 999,
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(22,48,42,0.32)',
    borderRadius: 999,
    border: '2px solid transparent',
    backgroundClip: 'padding-box',
    '&:hover': {
      background: 'rgba(22,48,42,0.48)',
      backgroundClip: 'padding-box',
    },
  },
  '&::-webkit-scrollbar-corner': {
    background: 'transparent',
  },
} as const;

export const MATTE_SURFACE = {
  bgcolor: ZPC_GLASS.panel,
  backgroundColor: ZPC_GLASS.panel,
  backgroundImage:
    'linear-gradient(165deg, rgba(232,226,206,0.7) 0%, rgba(221,214,192,0.45) 55%, rgba(235,230,212,0.35) 100%)',
  backdropFilter: ZPC_GLASS.blur,
  WebkitBackdropFilter: ZPC_GLASS.blur,
  border: `1px solid ${ZPC_GLASS.border}`,
  boxShadow:
    '0 1px 2px rgba(10, 18, 16, 0.06), 0 10px 28px rgba(10, 18, 16, 0.08), inset 0 1px 0 rgba(235,230,212,0.4)',
} as const;

/** App header — translucent forest green glass (glossy, not solid fill). */
export const MATTE_HEADER = {
  bgcolor: 'rgba(22, 48, 42, 0.32) !important',
  backgroundColor: 'rgba(22, 48, 42, 0.32) !important',
  backgroundImage:
    'linear-gradient(180deg, rgba(22,48,42,0.42) 0%, rgba(22,48,42,0.22) 55%, rgba(22,48,42,0.28) 100%), linear-gradient(180deg, rgba(235,230,212,0.14) 0%, rgba(235,230,212,0) 42%)',
  backdropFilter: 'blur(20px) saturate(1.35)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.35)',
  borderBottom: '1px solid rgba(235,230,212,0.28)',
  boxShadow:
    '0 8px 28px rgba(10, 18, 16, 0.14), inset 0 1px 0 rgba(235,230,212,0.28), inset 0 -1px 0 rgba(10,18,16,0.12)',
  color: ZPC_COLORS.primaryContrast,
} as const;

/** Login hero / green glass panels — high transparency main green. */
export const GLASS_GREEN = {
  bgcolor: ZPC_GLASS.greenLogin,
  backgroundColor: ZPC_GLASS.greenLogin,
  backgroundImage:
    'linear-gradient(165deg, rgba(22,48,42,0.28) 0%, rgba(22,48,42,0.12) 100%)',
  backdropFilter: ZPC_GLASS.blur,
  WebkitBackdropFilter: ZPC_GLASS.blur,
  border: `1px solid ${ZPC_GLASS.greenBorder}`,
  color: ZPC_COLORS.primaryContrast,
  boxShadow: '0 16px 40px rgba(0,0,0,0.22), inset 0 1px 0 rgba(235,230,212,0.2)',
} as const;

/** Page atmosphere — soft mint wash (#B2DFDB) for Home / Profile / Search / Admin. */
export const PAGE_ATMOSPHERE = {
  bgcolor: '#B2DFDB',
  backgroundColor: '#B2DFDB',
  backgroundImage:
    `radial-gradient(ellipse at 18% 12%, rgba(235,230,212,0.55) 0%, transparent 42%),
     radial-gradient(ellipse at 82% 8%, rgba(0,121,107,0.22) 0%, transparent 46%),
     linear-gradient(160deg, #80CBC4 0%, #B2DFDB 48%, #E0F2F1 100%)`,
  backgroundAttachment: 'fixed' as const,
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
} as const;

/** Nested / soft inset chips — translucent wash. */
export const MATTE_INSET = {
  bgcolor: ZPC_GLASS.inset,
  backgroundColor: ZPC_GLASS.inset,
  backdropFilter: ZPC_GLASS.blurSoft,
  WebkitBackdropFilter: ZPC_GLASS.blurSoft,
  border: `1px solid ${ZPC_GLASS.border}`,
} as const;

/** Sidebar / translucent panel. */
export const MATTE_PANEL = {
  bgcolor: ZPC_GLASS.panelSoft,
  backgroundColor: ZPC_GLASS.panelSoft,
  backgroundImage:
    'linear-gradient(165deg, rgba(232,226,206,0.45) 0%, rgba(221,214,192,0.28) 100%)',
  backdropFilter: ZPC_GLASS.blur,
  WebkitBackdropFilter: ZPC_GLASS.blur,
  border: `1px solid ${ZPC_GLASS.border}`,
  boxShadow: '0 8px 24px rgba(10, 18, 16, 0.07), inset 0 1px 0 rgba(235,230,212,0.35)',
} as const;

/** Tab strip / chip row chrome — translucent, not a solid bar. */
export const MATTE_TABS = {
  bgcolor: ZPC_GLASS.tab,
  backgroundColor: ZPC_GLASS.tab,
  backdropFilter: ZPC_GLASS.blurSoft,
  WebkitBackdropFilter: ZPC_GLASS.blurSoft,
  border: `1px solid ${ZPC_GLASS.border}`,
  borderRadius: 999,
  minHeight: 40,
  px: 0.5,
  '& .MuiTabs-indicator': {
    display: 'none',
  },
  '& .MuiTab-root': {
    minHeight: 36,
    borderRadius: 999,
    textTransform: 'none' as const,
    fontWeight: 600,
    color: ZPC_COLORS.textMuted,
    mx: 0.25,
    '&.Mui-selected': {
      color: ZPC_COLORS.primaryContrast,
      bgcolor: ZPC_GLASS.tabActive,
      backgroundColor: ZPC_GLASS.tabActive,
    },
  },
} as const;
