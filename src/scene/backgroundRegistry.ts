import { createSmartCity } from './createSmartCity';
import { createEarthPropertyGlobe } from './createEarthPropertyGlobe';
import { createConstructionTimeline } from './createConstructionTimeline';
import { createFloatingDocuments } from './createFloatingDocuments';
import { createPropertyNetwork } from './createPropertyNetwork';
import { SceneFactory } from './types';

export type BackgroundId =
  | 'smart-city'
  | 'earth-globe'
  | 'construction'
  | 'documents'
  | 'network';

export type BackgroundOption = {
  id: BackgroundId;
  label: string;
  short: string;
  description: string;
  create: SceneFactory;
  vignette: string;
  brandColor: string;
  taglineColor: string;
  /** Show solar-system-style sim speed HUD */
  showSimHud: boolean;
  hudTitle: string;
  hudSubtitle: string;
};

export const BACKGROUND_STORAGE_KEY = 'zpc_landing_bg';

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: 'earth-globe',
    label: 'Earth Field',
    short: 'Earth',
    description: 'Cinematic globe + India property pins (solar-system tier)',
    create: createEarthPropertyGlobe,
    vignette:
      'radial-gradient(ellipse at 50% 42%, rgba(8, 20, 32, 0.0) 0%, rgba(8, 20, 32, 0.12) 100%)',
    brandColor: '#eef6ff',
    taglineColor: 'rgba(220,235,255,0.82)',
    showSimHud: true,
    hudTitle: 'Property Field · Earth',
    hudSubtitle: 'Live corridors across India',
  },
  {
    id: 'construction',
    label: 'Build Timeline',
    short: 'Build',
    description: 'Land → structure → community loop',
    create: createConstructionTimeline,
    vignette:
      'radial-gradient(ellipse at 50% 40%, rgba(20, 28, 32, 0.08) 0%, rgba(16, 22, 26, 0.42) 100%)',
    brandColor: '#f4f1ea',
    taglineColor: 'rgba(244,241,234,0.85)',
    showSimHud: true,
    hudTitle: 'Construction Timeline',
    hudSubtitle: 'Empty land → finished homes',
  },
  {
    id: 'network',
    label: 'Property Net',
    short: 'Social',
    description: 'Listings linked by charcha activity',
    create: createPropertyNetwork,
    vignette:
      'radial-gradient(ellipse at 50% 45%, rgba(8, 16, 20, 0.2) 0%, rgba(6, 12, 16, 0.55) 100%)',
    brandColor: '#e8f4ef',
    taglineColor: 'rgba(232,244,239,0.8)',
    showSimHud: true,
    hudTitle: 'Community Network',
    hudSubtitle: 'Listings · chats · visits',
  },
  {
    id: 'documents',
    label: 'Documents',
    short: 'Docs',
    description: 'Floating deeds, blueprints, surveys',
    create: createFloatingDocuments,
    vignette:
      'radial-gradient(ellipse at 50% 45%, rgba(12, 16, 24, 0.15) 0%, rgba(10, 14, 20, 0.5) 100%)',
    brandColor: '#f2ebe3',
    taglineColor: 'rgba(242,235,227,0.82)',
    showSimHud: true,
    hudTitle: 'Property Records',
    hudSubtitle: 'Deeds · plans · surveys',
  },
  {
    id: 'smart-city',
    label: 'Smart City',
    short: 'City',
    description: 'Original cinematic skyline (safe revert)',
    create: createSmartCity,
    vignette:
      'radial-gradient(ellipse at 50% 45%, rgba(12, 24, 32, 0.08) 0%, rgba(12, 24, 32, 0.42) 100%)',
    brandColor: '#f7f3ec',
    taglineColor: 'rgba(247,243,236,0.82)',
    showSimHud: false,
    hudTitle: 'Living City',
    hudSubtitle: 'Skyline simulation',
  },
];

export function getBackgroundOption(id: string | null): BackgroundOption {
  return BACKGROUND_OPTIONS.find((o) => o.id === id) || BACKGROUND_OPTIONS[0];
}

export function readStoredBackgroundId(): BackgroundId {
  try {
    const v = localStorage.getItem(BACKGROUND_STORAGE_KEY);
    if (BACKGROUND_OPTIONS.some((o) => o.id === v)) return v as BackgroundId;
  } catch {
    /* ignore */
  }
  return 'earth-globe';
}
