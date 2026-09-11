import { BusinessRecord, ConfidenceLevel } from '../config/types.js';
import { normalizeBusinessName, normalizeCity } from '../normalization/business-normalizer.js';
import { extractHostname, extractRootDomain } from '../normalization/url-normalizer.js';

export interface WebsiteMatchAssessment {
  isMatch: boolean;
  confidence: ConfidenceLevel;
  reason: string;
  matchedTokens: string[];
}

/**
 * Assesses whether a candidate URL belongs to the target business based on name, city, and domain tokens.
 */
export function assessWebsiteMatch(url: string, business: BusinessRecord): WebsiteMatchAssessment {
  const hostname = extractHostname(url);
  const rootDomain = extractRootDomain(hostname);

  if (!hostname || !rootDomain) {
    return {
      isMatch: false,
      confidence: 'none',
      reason: 'Invalid URL or missing domain',
      matchedTokens: [],
    };
  }

  const normName = normalizeBusinessName(business.name);
  const nameTokens = normName.split(/\s+/).filter((t) => t.length >= 3);

  const domainWithoutTld = rootDomain.split('.')[0].toLowerCase();
  const matchedTokens: string[] = [];

  for (const token of nameTokens) {
    if (domainWithoutTld.includes(token)) {
      matchedTokens.push(token);
    }
  }

  const normCity = normalizeCity(business.city);
  const cityInDomain = normCity && normCity.length >= 3 && domainWithoutTld.includes(normCity);

  // If most name tokens match domain
  if (nameTokens.length > 0 && matchedTokens.length >= Math.ceil(nameTokens.length * 0.6)) {
    return {
      isMatch: true,
      confidence: 'high',
      reason: `Domain "${rootDomain}" strongly matches business name tokens: [${matchedTokens.join(', ')}]`,
      matchedTokens,
    };
  }

  // If at least one distinct token and city match
  if (matchedTokens.length >= 1 && cityInDomain) {
    return {
      isMatch: true,
      confidence: 'high',
      reason: `Domain "${rootDomain}" matches business token "${matchedTokens[0]}" and city "${normCity}"`,
      matchedTokens,
    };
  }

  // If at least 1 significant token matches (length >= 4)
  const hasStrongToken = matchedTokens.some((t) => t.length >= 4);
  if (hasStrongToken) {
    return {
      isMatch: true,
      confidence: 'medium',
      reason: `Domain "${rootDomain}" partially matches business token: [${matchedTokens.join(', ')}]`,
      matchedTokens,
    };
  }

  return {
    isMatch: false,
    confidence: 'low',
    reason: `Domain "${rootDomain}" does not significantly match business name "${business.name}"`,
    matchedTokens,
  };
}
