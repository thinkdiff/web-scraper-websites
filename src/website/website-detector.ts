import { BusinessRecord, WebsiteDetectionResult, ActorInput } from '../config/types.js';
import { normalizeUrl } from '../normalization/url-normalizer.js';
import { classifyDomain } from './domain-classifier.js';
import { assessWebsiteMatch } from './website-matcher.js';
import { withTimeout } from '../utils/retry.js';
import { appLogger } from '../utils/logger.js';
import { SearchEnrichmentProvider } from '../config/types.js';

/**
 * Follow lightweight HTTP redirects to find the canonical destination URL
 */
export async function followUrlRedirects(
  rawUrl: string,
  timeoutMs: number = 5000
): Promise<{ finalUrl: string; redirected: boolean; isAlive: boolean }> {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) {
    return { finalUrl: rawUrl, redirected: false, isAlive: false };
  }

  try {
    const response = await withTimeout(
      fetch(normalized, {
        method: 'HEAD',
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      }),
      timeoutMs,
      `HEAD redirect check for ${normalized}`
    );

    const destinationUrl = normalizeUrl(response.url) || normalized;
    const isRedirected = destinationUrl !== normalized;
    const isAlive = response.status >= 200 && response.status < 400;

    return {
      finalUrl: destinationUrl,
      redirected: isRedirected,
      isAlive,
    };
  } catch {
    // If HEAD fails, fall back to initial normalized URL
    return {
      finalUrl: normalized,
      redirected: false,
      isAlive: true,
    };
  }
}

/**
 * Core website detection and verification engine
 */
export async function detectOfficialWebsite(
  business: BusinessRecord,
  config: ActorInput,
  searchProvider?: SearchEnrichmentProvider
): Promise<WebsiteDetectionResult> {
  // Case 1: Google Maps listing has an explicit website URL
  if (business.website && business.website.trim().length > 0) {
    const normalizedInputUrl = normalizeUrl(business.website);

    if (!normalizedInputUrl) {
      return {
        hasOfficialWebsite: false,
        website: null,
        confidence: 'low',
        reason: `Invalid website URL provided in listing: "${business.website}"`,
        classification: 'unknown',
      };
    }

    // Step 1: Initial domain classification
    const initialClassification = classifyDomain(normalizedInputUrl);

    // If it's explicitly a social profile, directory, marketplace, or booking URL
    if (initialClassification.isSocial) {
      return {
        hasOfficialWebsite: false,
        website: normalizedInputUrl,
        confidence: 'high',
        reason: `Listing website is a social profile (${initialClassification.platformName || 'social'}), not an official website`,
        classification: 'social_profile',
      };
    }

    if (initialClassification.isDirectory) {
      return {
        hasOfficialWebsite: false,
        website: normalizedInputUrl,
        confidence: 'high',
        reason: `Listing website is a public directory link (${initialClassification.platformName || 'directory'}), not an official website`,
        classification: 'directory_profile',
      };
    }

    if (initialClassification.isMarketplace) {
      return {
        hasOfficialWebsite: false,
        website: normalizedInputUrl,
        confidence: 'high',
        reason: `Listing website is a marketplace storefront (${initialClassification.platformName || 'marketplace'}), not an official standalone website`,
        classification: 'marketplace_profile',
      };
    }

    if (initialClassification.isBooking) {
      return {
        hasOfficialWebsite: false,
        website: normalizedInputUrl,
        confidence: 'high',
        reason: `Listing website is a third-party booking portal (${initialClassification.platformName || 'booking'}), not an official website`,
        classification: 'booking_platform',
      };
    }

    // Step 2: Follow redirects for candidate official website
    let finalUrl = normalizedInputUrl;
    let wasRedirected = false;

    try {
      const redirectResult = await followUrlRedirects(normalizedInputUrl, Math.min(config.requestTimeoutMs || 10000, 10000));
      finalUrl = redirectResult.finalUrl;
      wasRedirected = redirectResult.redirected;
    } catch {
      // Keep original normalizedUrl on redirect check failure
    }

    // Re-classify the destination URL after redirects
    const finalClassification = classifyDomain(finalUrl);

    if (finalClassification.isSocial) {
      return {
        hasOfficialWebsite: false,
        website: finalUrl,
        confidence: 'high',
        reason: `Listing URL redirected to a social media profile (${finalUrl})`,
        classification: 'social_profile',
        redirected: wasRedirected,
        finalUrl,
      };
    }

    if (finalClassification.isDirectory || finalClassification.isMarketplace || finalClassification.isBooking) {
      return {
        hasOfficialWebsite: false,
        website: finalUrl,
        confidence: 'high',
        reason: `Listing URL redirected to a ${finalClassification.classification} (${finalUrl})`,
        classification: finalClassification.classification,
        redirected: wasRedirected,
        finalUrl,
      };
    }

    // Official standalone domain detected
    return {
      hasOfficialWebsite: true,
      website: finalUrl,
      confidence: 'high',
      reason: `Official domain detected on Maps listing: ${finalUrl}`,
      classification: 'official_business_website',
      redirected: wasRedirected,
      finalUrl,
    };
  }

  // Case 2: Listing has NO website on Google Maps
  // If search engine enrichment is enabled, verify if an official website exists via targeted search
  if (config.searchEngineEnrichment && searchProvider) {
    try {
      const candidateUrl = await searchProvider.searchOfficialWebsiteCandidate(business);

      if (candidateUrl) {
        const normCandidate = normalizeUrl(candidateUrl);
        if (normCandidate) {
          const classification = classifyDomain(normCandidate);

          if (classification.isOfficialCandidate) {
            const match = assessWebsiteMatch(normCandidate, business);
            if (match.isMatch && match.confidence === 'high') {
              return {
                hasOfficialWebsite: true,
                website: normCandidate,
                confidence: 'high',
                reason: `Official website found via search verification: ${normCandidate} (${match.reason})`,
                classification: 'official_business_website',
              };
            }
          }
        }
      }
    } catch (err) {
      appLogger.debug('WEBSITE', `Search verification error for ${business.name}`, err);
    }
  }

  // Confirmed: No credible official website detected
  return {
    hasOfficialWebsite: false,
    website: null,
    confidence: 'high',
    reason: 'No official website found across Maps listing and public search verification',
    classification: 'unknown',
  };
}
