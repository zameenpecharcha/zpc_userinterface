/** Prefer area / locality style results over shop / POI addresses. */
const PREFER_TYPES = new Set([
  'locality',
  'sublocality',
  'sublocality_level_1',
  'sublocality_level_2',
  'sublocality_level_3',
  'neighborhood',
  'political',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'administrative_area_level_3',
  'postal_code',
  'geocode',
  'colloquial_area',
]);

const DROP_TYPES = new Set([
  'restaurant',
  'food',
  'cafe',
  'bar',
  'lodging',
  'store',
  'shopping_mall',
  'supermarket',
  'railway_station',
  'subway_station',
  'train_station',
  'bus_station',
  'transit_station',
  'airport',
  'hospital',
  'school',
  'university',
  'gym',
  'bank',
  'atm',
  'gas_station',
  'parking',
  'point_of_interest',
  'establishment',
  'premise',
  'street_address',
  'route',
  'intersection',
]);

const PIN_RE = /\b(\d{6})\b/;

/**
 * Compress a verbose India address into: "Madhapur, Hyderabad, Telangana-500081"
 */
export function formatLocalityLabel(description: string): string {
  if (!description?.trim()) return '';

  let parts = description
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length && /^(india|भारत)$/i.test(parts[parts.length - 1])) {
    parts = parts.slice(0, -1);
  }

  let pincode: string | null = null;
  const cleaned: string[] = [];
  for (const part of parts) {
    if (/^\d{6}$/.test(part)) {
      pincode = part;
      continue;
    }
    const withPin = part.match(/^(.*?)\s*[-\s]\s*(\d{6})$/);
    if (withPin && withPin[1].trim()) {
      pincode = pincode || withPin[2];
      cleaned.push(withPin[1].trim());
      continue;
    }
    const onlyPin = part.match(PIN_RE);
    if (onlyPin && part.replace(PIN_RE, '').replace(/[-\s]/g, '').length === 0) {
      pincode = onlyPin[1];
      continue;
    }
    cleaned.push(part);
  }

  // Area, city, state — last 3 geographic tokens when the string is a long POI address
  const geo = cleaned.length > 3 ? cleaned.slice(-3) : cleaned;
  if (geo.length === 0) {
    return pincode ? pincode : description.trim();
  }

  if (pincode) {
    const state = geo[geo.length - 1];
    const head = geo.slice(0, -1);
    return [...head, `${state}-${pincode}`].join(', ');
  }
  return geo.join(', ');
}

function isPoiHeavy(types: string[] | undefined | null): boolean {
  if (!types?.length) return false;
  const lower = types.map((t) => String(t || '').toLowerCase());
  const hasPrefer = lower.some((t) => PREFER_TYPES.has(t));
  const hasDrop = lower.some((t) => DROP_TYPES.has(t));
  return hasDrop && !hasPrefer;
}

export type LocalitySuggestion = {
  reference: string;
  placeId: string;
  description: string;
  /** Short label shown in UI / saved as location text */
  label: string;
  lat: number;
  lng: number;
  types: string[];
};

/**
 * Prefer localities, format labels, and drop duplicate short addresses.
 */
export function normalizeLocationSuggestions(
  raw: Array<{
    reference?: string | null;
    placeId?: string | null;
    description?: string | null;
    lat?: number | null;
    lng?: number | null;
    types?: string[] | null;
  }>
): LocalitySuggestion[] {
  const mapped = raw
    .filter((s) => (s.description || '').trim())
    .map((s) => ({
      reference: String(s.reference || ''),
      placeId: String(s.placeId || s.reference || ''),
      description: String(s.description || ''),
      label: formatLocalityLabel(String(s.description || '')),
      lat: Number(s.lat) || 0,
      lng: Number(s.lng) || 0,
      types: (s.types || []).map(String),
    }));

  const geographic = mapped.filter((s) => !isPoiHeavy(s.types));
  const pool = geographic.length > 0 ? geographic : mapped;

  const seen = new Set<string>();
  const unique: LocalitySuggestion[] = [];
  for (const s of pool) {
    const key = s.label.toLowerCase().replace(/\s+/g, ' ');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(s);
  }
  return unique;
}
