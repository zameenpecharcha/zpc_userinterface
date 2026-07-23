/** Shared matte surfaces — warm paper finish (not flat white). */

export const MATTE_SURFACE = {
  bgcolor: '#F3EFE8',
  backgroundColor: '#F3EFE8',
  backgroundImage: 'linear-gradient(165deg, #F6F2EB 0%, #EFEAE2 55%, #EAE4DB 100%)',
  border: '1px solid rgba(90, 70, 50, 0.08)',
  boxShadow:
    '0 1px 2px rgba(60, 45, 30, 0.05), 0 8px 20px rgba(60, 45, 30, 0.06), inset 0 1px 0 rgba(255,255,255,0.55)',
} as const;

/** Frosted matte app header — solid bgcolor so MUI AppBar cannot stay primary/white. */
export const MATTE_HEADER = {
  bgcolor: '#F3EFE8',
  backgroundColor: '#F3EFE8',
  backgroundImage: 'linear-gradient(180deg, #F6F2EB 0%, #EFEAE2 100%)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderBottom: '1px solid rgba(90, 70, 50, 0.12)',
  boxShadow:
    '0 1px 0 rgba(255,255,255,0.55), 0 4px 18px rgba(60, 45, 30, 0.07)',
  color: '#2563EB',
} as const;

/** Page atmosphere — login palette. */
export const PAGE_ATMOSPHERE = {
  bgcolor: '#c5d0c0',
  backgroundColor: '#c5d0c0',
  backgroundImage:
    'radial-gradient(ellipse at 30% 20%, #f3e6d4 0%, transparent 50%), linear-gradient(160deg, #9eb6c9 0%, #c5d0c0 45%, #e8dcc8 100%)',
  backgroundAttachment: 'fixed' as const,
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
} as const;

/** Nested comment / soft inset chips. */
export const MATTE_INSET = {
  bgcolor: 'rgba(255,255,255,0.45)',
  backgroundColor: 'rgba(255,255,255,0.45)',
  border: '1px solid rgba(90, 70, 50, 0.07)',
} as const;

/** Sidebar / translucent matte panel. */
export const MATTE_PANEL = {
  bgcolor: 'rgba(246, 242, 235, 0.92)',
  backgroundColor: 'rgba(246, 242, 235, 0.92)',
  backgroundImage: 'linear-gradient(165deg, rgba(246,242,235,0.95) 0%, rgba(234,228,219,0.9) 100%)',
  border: '1px solid rgba(90, 70, 50, 0.08)',
  boxShadow: '0 8px 20px rgba(60, 45, 30, 0.06), inset 0 1px 0 rgba(255,255,255,0.5)',
} as const;
