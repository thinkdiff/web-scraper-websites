import {
  BusinessRecord,
  SocialProfiles,
  ProfileCandidate,
  SocialEnrichmentResult,
  ConfidenceLevel,
} from '../config/types.js';
import { normalizeBusinessName, normalizeCity } from '../normalization/business-normalizer.js';
import { normalizeUrl } from '../normalization/url-normalizer.js';
import { classifyDomain } from '../website/domain-classifier.js';
import { getPhoneDigitsForDedupe } from '../normalization/phone-normalizer.js';

/**
 * Assess confidence of a social profile URL candidate for a given business
 */
export function evaluateSocialProfileConfidence(
  profileUrl: string,
  business: BusinessRecord,
  platform: string
): { confidence: ConfidenceLevel; reason: string; handle?: string } {
  const normUrl = normalizeUrl(profileUrl);
  if (!normUrl) {
    return { confidence: 'none', reason: 'Invalid profile URL' };
  }

  let handle = '';
  try {
    const urlObj = new URL(normUrl);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      handle = pathParts[0].replace(/[@]/g, '').toLowerCase();
    }
  } catch {
    // ignore
  }

  const normName = normalizeBusinessName(business.name);
  const nameTokens = normName.split(/\s+/).filter((t) => t.length >= 3);
  const normCity = normalizeCity(business.city);
  const phoneDigits = getPhoneDigitsForDedupe(business.phone);

  const urlLower = normUrl.toLowerCase();

  // Strong signal 1: Phone digits embedded in URL or handle
  if (phoneDigits && phoneDigits.length >= 8 && urlLower.includes(phoneDigits.slice(-8))) {
    return {
      confidence: 'high',
      reason: `Exact phone number match on ${platform} profile`,
      handle,
    };
  }

  // Strong signal 2: Exact business name match and city in handle/URL
  const matchingTokens = nameTokens.filter((token) => urlLower.includes(token));
  const cityInUrl = normCity && normCity.length >= 3 && urlLower.includes(normCity);

  if (nameTokens.length > 0 && matchingTokens.length >= Math.ceil(nameTokens.length * 0.7) && cityInUrl) {
    return {
      confidence: 'high',
      reason: `Strong ${platform} match: business name tokens [${matchingTokens.join(', ')}] + city "${normCity}"`,
      handle,
    };
  }

  // High/Medium signal: Most business tokens match
  if (nameTokens.length > 0 && matchingTokens.length >= Math.ceil(nameTokens.length * 0.7)) {
    return {
      confidence: 'high',
      reason: `Business name tokens match on ${platform}: [${matchingTokens.join(', ')}]`,
      handle,
    };
  }

  // Medium signal: At least one significant token (>=4 chars) and city, or 2 distinct tokens
  if (matchingTokens.length >= 2 || (matchingTokens.some((t) => t.length >= 4) && cityInUrl)) {
    return {
      confidence: 'medium',
      reason: `Partial business match on ${platform}: [${matchingTokens.join(', ')}]`,
      handle,
    };
  }

  // Low signal: Only 1 token or generic username
  if (matchingTokens.length === 1) {
    return {
      confidence: 'low',
      reason: `Weak single token match on ${platform}: "${matchingTokens[0]}"`,
      handle,
    };
  }

  return {
    confidence: 'low',
    reason: `Low confidence username match on ${platform}`,
    handle,
  };
}

/**
 * Enriches a business with public social profiles from all available sources
 */
export function enrichSocialProfiles(
  business: BusinessRecord,
  additionalCandidates: ProfileCandidate[] = []
): SocialEnrichmentResult {
  const profiles: SocialProfiles = {
    instagram: null,
    facebook: null,
    linkedin: null,
    youtube: null,
    twitter: null,
    pinterest: null,
    other: [],
  };

  const candidates: ProfileCandidate[] = [...additionalCandidates];

  // 1. Check if the listing's website URL was actually a social link
  if (business.website) {
    const classification = classifyDomain(business.website);
    if (classification.isSocial && classification.platformName) {
      const platform = classification.platformName as ProfileCandidate['platform'];
      const evalResult = evaluateSocialProfileConfidence(business.website, business, platform);
      candidates.push({
        platform,
        url: normalizeUrl(business.website) || business.website,
        confidence: evalResult.confidence,
        reason: `Listing website was a ${platform} profile (${evalResult.reason})`,
        handle: evalResult.handle,
      });
    }
  }

  // 2. Process all candidates and assign high/medium confidence profiles
  for (const candidate of candidates) {
    // Only accept medium and high confidence matches
    if (candidate.confidence === 'low' || candidate.confidence === 'none') {
      continue;
    }

    const platform = candidate.platform;
    const cleanUrl = normalizeUrl(candidate.url) || candidate.url;

    if (platform === 'instagram' && !profiles.instagram) {
      profiles.instagram = cleanUrl;
    } else if (platform === 'facebook' && !profiles.facebook) {
      profiles.facebook = cleanUrl;
    } else if (platform === 'linkedin' && !profiles.linkedin) {
      profiles.linkedin = cleanUrl;
    } else if (platform === 'youtube' && !profiles.youtube) {
      profiles.youtube = cleanUrl;
    } else if (platform === 'twitter' && !profiles.twitter) {
      profiles.twitter = cleanUrl;
    } else if (platform === 'pinterest' && !profiles.pinterest) {
      profiles.pinterest = cleanUrl;
    } else if (!profiles.other?.includes(cleanUrl)) {
      profiles.other?.push(cleanUrl);
    }
  }

  const socialProfileCount = [
    profiles.instagram,
    profiles.facebook,
    profiles.linkedin,
    profiles.youtube,
    profiles.twitter,
    profiles.pinterest,
  ].filter(Boolean).length;

  return {
    profiles,
    candidates,
    socialProfileCount,
    hasInstagram: Boolean(profiles.instagram),
    hasFacebook: Boolean(profiles.facebook),
    hasLinkedIn: Boolean(profiles.linkedin),
    hasYouTube: Boolean(profiles.youtube),
  };
}
