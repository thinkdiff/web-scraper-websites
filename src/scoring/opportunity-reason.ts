import { BusinessRecord, WebsiteDetectionResult, SocialEnrichmentResult, LeadScoreResult } from '../config/types.js';

/**
 * Deterministically constructs a factual, transparent explanation of the website opportunity.
 */
export function generateOpportunityReason(
  business: BusinessRecord,
  websiteResult: WebsiteDetectionResult,
  enrichment: SocialEnrichmentResult,
  scoreResult: LeadScoreResult
): string {
  const parts: string[] = [];

  // 1. Website status
  if (!websiteResult.hasOfficialWebsite) {
    if (websiteResult.classification === 'social_profile') {
      parts.push('No official website detected (uses social profile as primary link).');
    } else if (websiteResult.classification === 'directory_profile') {
      parts.push('No official website detected (uses directory listing as primary link).');
    } else {
      parts.push('No official website detected.');
    }
  } else {
    parts.push(`Official website detected (${websiteResult.website}).`);
  }

  // 2. Reviews and rating
  const reviewCount = business.reviewCount ?? 0;
  const rating = business.rating ?? 0;
  if (reviewCount > 0) {
    if (rating > 0) {
      parts.push(`${reviewCount} Google reviews (${rating.toFixed(1)}★ rating).`);
    } else {
      parts.push(`${reviewCount} Google reviews.`);
    }
  }

  // 3. Phone availability
  if (business.phone && business.phone.trim().length > 0) {
    parts.push('Public business phone available.');
  }

  // 4. Social presence
  const activePlatforms: string[] = [];
  if (enrichment.hasInstagram) activePlatforms.push('Instagram');
  if (enrichment.hasFacebook) activePlatforms.push('Facebook');
  if (enrichment.hasLinkedIn) activePlatforms.push('LinkedIn');
  if (enrichment.hasYouTube) activePlatforms.push('YouTube');

  if (activePlatforms.length > 0) {
    parts.push(`${activePlatforms.join(' + ')} presence verified.`);
  }

  // 5. Category & Location context
  if (business.category) {
    if (business.city) {
      parts.push(`Active in ${business.category} niche in ${business.city}.`);
    } else {
      parts.push(`Active in ${business.category} niche.`);
    }
  }

  // 6. Lead tier indication
  parts.push(`Rated Tier ${scoreResult.leadTier} (${scoreResult.leadScore}/100 score).`);

  return parts.join(' ');
}
