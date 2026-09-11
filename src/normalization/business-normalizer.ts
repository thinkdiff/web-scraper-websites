/**
 * Business name, category, and address normalization
 */

const LEGAL_SUFFIX_REGEX =
  /\b(pvt\.?\s*ltd\.?|private\s+limited|limited|ltd\.?|llc|inc\.?|incorporated|corp\.?|corporation|co\.?|company|llp|gmbh|enterprise[s]?)\b/gi;

const COMMON_NOISE_WORDS =
  /\b(the|and|&|showroom|branch|store|shop|studio|center|centre|group|hub)\b/gi;

/**
 * Clean and canonicalize business name for deduplication and matching
 */
export function normalizeBusinessName(name: string | undefined | null): string {
  if (!name) return '';

  let cleaned = name.trim();

  // Strip legal suffixes
  cleaned = cleaned.replace(LEGAL_SUFFIX_REGEX, ' ');

  // Strip noise words for dedupe comparison
  cleaned = cleaned.replace(COMMON_NOISE_WORDS, ' ');

  // Replace special characters, punctuation with space
  cleaned = cleaned.replace(/[^\w\s]/gi, ' ');

  // Collapse multiple spaces and lowercase
  cleaned = cleaned.replace(/\s+/g, ' ').trim().toLowerCase();

  return cleaned;
}

/**
 * Light cleanup of business name for display (preserving casing and proper words)
 */
export function cleanBusinessNameForDisplay(name: string | undefined | null): string {
  if (!name) return '';
  return name.replace(/\s+/g, ' ').trim();
}

/**
 * Normalize city name
 */
export function normalizeCity(city: string | undefined | null): string {
  if (!city) return '';
  return city
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize address for deduplication
 */
export function normalizeAddress(address: string | undefined | null): string {
  if (!address) return '';
  return address
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\b(road|rd|street|st|lane|marg|nagar|cross|opp|opposite|nr|near|behind|b\/h|flat|shop|floor)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
