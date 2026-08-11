/** Default for ZPC (India-first). Used when location / browser TZ is unavailable. */
export const DEFAULT_TIME_ZONE = 'Asia/Kolkata';

/**
 * Guess an IANA timezone from coordinates (coarse regions used by ZPC).
 * Falls back to the browser timezone, then Asia/Kolkata.
 */
export function timezoneFromLocation(
  latitude?: number | null,
  longitude?: number | null
): string {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
    // India
    if (lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98) return 'Asia/Kolkata';
    // UAE / Gulf
    if (lat >= 22 && lat <= 27 && lng >= 50 && lng <= 57) return 'Asia/Dubai';
    // Singapore / SE Asia pocket
    if (lat >= -10 && lat <= 20 && lng >= 95 && lng <= 120) return 'Asia/Singapore';
    // UK / Ireland
    if (lat >= 49 && lat <= 61 && lng >= -11 && lng <= 2) return 'Europe/London';
    // US contiguous (rough eastern default; better than UTC)
    if (lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66) {
      if (lng < -115) return 'America/Los_Angeles';
      if (lng < -100) return 'America/Denver';
      if (lng < -85) return 'America/Chicago';
      return 'America/New_York';
    }
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/**
 * Parse server timestamps. Auth/user DB writes UTC (`datetime.utcnow`) and often
 * returns naive strings — treat those as UTC so local/IST conversion is correct.
 */
export function parseServerDate(value?: string | number | Date | null): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    // Seconds vs milliseconds heuristic
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  let s = String(value).trim();
  if (!s) return null;

  // "2026-07-22 16:15:44.123456" → ISO-ish
  s = s.replace(' ', 'T');
  // Trim sub-ms noise Postgres may include
  s = s.replace(/(\.\d{3})\d+/, '$1');

  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  if (!hasZone) {
    // Naive → UTC
    s = `${s}Z`;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Relative label for feeds / notifications (UTC-aware). */
export function formatRelativeTime(value?: string | number | Date | null): string {
  const d = parseServerDate(value);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export type FormatDateOptions = {
  latitude?: number | null;
  longitude?: number | null;
  timeZone?: string | null;
  /** Include seconds (admin detail). Default false. */
  withSeconds?: boolean;
};

/** Format a server date in a location-based (or explicit) timezone. */
export function formatDateTime(
  value?: string | number | Date | null,
  options: FormatDateOptions = {}
): string {
  const d = parseServerDate(value);
  if (!d) return '—';

  const timeZone =
    options.timeZone ||
    timezoneFromLocation(options.latitude, options.longitude);

  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: options.withSeconds ? '2-digit' : undefined,
      hour12: true,
    }).format(d);
  } catch {
    return d.toLocaleString('en-IN');
  }
}

/** True if last activity is within `withinMinutes` (uses UTC-aware parse). */
export function isRecentlyActive(
  value?: string | number | Date | null,
  withinMinutes = 30
): boolean {
  const d = parseServerDate(value);
  if (!d) return false;
  return Date.now() - d.getTime() <= withinMinutes * 60 * 1000;
}
