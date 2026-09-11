/**
 * URL normalization and domain extraction utilities
 */

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'igshid',
  'gclid',
  'ref',
  'source',
  'mc_eid',
  'mc_cid',
]);

/**
 * Clean URL by trimming, ensuring protocol, stripping tracking parameters and trailing slashes
 */
export function normalizeUrl(rawUrl: string | undefined | null): string | null {
  if (!rawUrl || rawUrl.trim().length === 0) {
    return null;
  }

  let cleaned = rawUrl.trim();

  // If protocol missing, assume https://
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  try {
    const parsed = new URL(cleaned);

    // Remove tracking query params
    const keysToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      parsed.searchParams.delete(key);
    }

    // Strip hash/fragment
    parsed.hash = '';

    let result = parsed.toString();

    // Strip trailing slash unless it's just root domain
    if (result.endsWith('/') && parsed.pathname === '/') {
      result = result.slice(0, -1);
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Extract clean hostname from a URL
 */
export function extractHostname(rawUrl: string | undefined | null): string | null {
  if (!rawUrl || rawUrl.trim().length === 0) return null;
  try {
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    // A valid internet hostname must contain at least one dot (e.g. example.com)
    if (!host.includes('.') || host.startsWith('.') || host.endsWith('.')) {
      return null;
    }
    return host;
  } catch {
    return null;
  }
}

/**
 * Extract root domain (e.g. example.com from sub.example.com or sub.example.co.in)
 */
export function extractRootDomain(hostname: string | null): string | null {
  if (!hostname || !hostname.includes('.')) return null;
  const parts = hostname.toLowerCase().split('.');
  if (parts.length < 2) return null;

  // Handle multi-part ccTLDs like .co.in, .com.au, .co.uk, .org.in
  const secondLast = parts[parts.length - 2];
  if (['co', 'com', 'org', 'net', 'gov', 'edu', 'ac'].includes(secondLast) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}
