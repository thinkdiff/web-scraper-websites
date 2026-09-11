import { DomainClassification } from '../config/types.js';
import {
  SOCIAL_DOMAINS,
  DIRECTORY_DOMAINS,
  MARKETPLACE_DOMAINS,
  BOOKING_DOMAINS,
} from '../config/defaults.js';
import { extractHostname, extractRootDomain } from '../normalization/url-normalizer.js';

export interface DomainClassificationResult {
  classification: DomainClassification;
  platformName?: string;
  isSocial: boolean;
  isDirectory: boolean;
  isMarketplace: boolean;
  isBooking: boolean;
  isOfficialCandidate: boolean;
}

/**
 * Classifies a URL domain into social, directory, marketplace, booking, or official website candidate.
 */
export function classifyDomain(url: string | undefined | null): DomainClassificationResult {
  if (!url || url.trim().length === 0) {
    return {
      classification: 'unknown',
      isSocial: false,
      isDirectory: false,
      isMarketplace: false,
      isBooking: false,
      isOfficialCandidate: false,
    };
  }

  const hostname = extractHostname(url);
  const rootDomain = extractRootDomain(hostname);

  if (!hostname || !rootDomain) {
    return {
      classification: 'unknown',
      isSocial: false,
      isDirectory: false,
      isMarketplace: false,
      isBooking: false,
      isOfficialCandidate: false,
    };
  }

  // 1. Social Profile Check
  for (const [domain, platform] of Object.entries(SOCIAL_DOMAINS)) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) {
      return {
        classification: 'social_profile',
        platformName: platform,
        isSocial: true,
        isDirectory: false,
        isMarketplace: false,
        isBooking: false,
        isOfficialCandidate: false,
      };
    }
  }

  // Check additional social domains
  if (
    hostname.includes('instagram.com') ||
    hostname.includes('facebook.com') ||
    hostname.includes('linkedin.com') ||
    hostname.includes('youtube.com') ||
    hostname.includes('twitter.com') ||
    hostname.includes('x.com') ||
    hostname.includes('pinterest.com') ||
    hostname.includes('tiktok.com') ||
    hostname.includes('threads.net')
  ) {
    return {
      classification: 'social_profile',
      isSocial: true,
      isDirectory: false,
      isMarketplace: false,
      isBooking: false,
      isOfficialCandidate: false,
    };
  }

  // 2. Directory Profile Check
  for (const directoryDomain of DIRECTORY_DOMAINS) {
    if (hostname === directoryDomain || hostname.endsWith(`.${directoryDomain}`)) {
      return {
        classification: 'directory_profile',
        platformName: directoryDomain.split('.')[0],
        isSocial: false,
        isDirectory: true,
        isMarketplace: false,
        isBooking: false,
        isOfficialCandidate: false,
      };
    }
  }

  // Check URL path for Google business site or Google maps links
  if (
    hostname === 'google.com' ||
    hostname.endsWith('.google.com') ||
    hostname.endsWith('.google.co.in')
  ) {
    if (url.includes('/maps') || url.includes('/place') || url.includes('business.site') || url.includes('business.google.com')) {
      return {
        classification: 'directory_profile',
        platformName: 'google_business',
        isSocial: false,
        isDirectory: true,
        isMarketplace: false,
        isBooking: false,
        isOfficialCandidate: false,
      };
    }
  }

  // 3. Marketplace Profile Check
  for (const marketplaceDomain of MARKETPLACE_DOMAINS) {
    if (hostname === marketplaceDomain || hostname.endsWith(`.${marketplaceDomain}`)) {
      return {
        classification: 'marketplace_profile',
        platformName: marketplaceDomain.split('.')[0],
        isSocial: false,
        isDirectory: false,
        isMarketplace: true,
        isBooking: false,
        isOfficialCandidate: false,
      };
    }
  }

  // 4. Booking Platform Check
  for (const bookingDomain of BOOKING_DOMAINS) {
    if (hostname === bookingDomain || hostname.endsWith(`.${bookingDomain}`)) {
      return {
        classification: 'booking_platform',
        platformName: bookingDomain.split('.')[0],
        isSocial: false,
        isDirectory: false,
        isMarketplace: false,
        isBooking: true,
        isOfficialCandidate: false,
      };
    }
  }

  // 5. Default: It's an official standalone business website candidate
  return {
    classification: 'official_business_website',
    isSocial: false,
    isDirectory: false,
    isMarketplace: false,
    isBooking: false,
    isOfficialCandidate: true,
  };
}
