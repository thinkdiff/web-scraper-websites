import {
  BusinessRecord,
  WebsiteDetectionResult,
  SocialEnrichmentResult,
  LeadScoreResult,
  LeadScoreBreakdown,
  OpportunitySignals,
  LeadTier,
} from '../config/types.js';
import { SCORING_WEIGHTS, HIGH_VALUE_NICHES, LEAD_TIER_BOUNDARIES } from '../config/defaults.js';

export interface LeadScoreInput {
  business: BusinessRecord;
  websiteResult: WebsiteDetectionResult;
  enrichment: SocialEnrichmentResult;
  isDuplicate?: boolean;
}

/**
 * Deterministically calculates the lead score, tier, and derived activity/presence scores.
 */
export function calculateLeadScore(input: LeadScoreInput): LeadScoreResult {
  const { business, websiteResult, enrichment, isDuplicate = false } = input;

  let totalScore = 0;

  // 1. No official website (+25)
  const noOfficialWebsite = !websiteResult.hasOfficialWebsite;
  const noOfficialWebsiteScore = noOfficialWebsite ? SCORING_WEIGHTS.NO_OFFICIAL_WEBSITE : 0;
  totalScore += noOfficialWebsiteScore;

  // 2. Public Phone (+20)
  const hasPhone = Boolean(business.phone && business.phone.trim().length > 0);
  const phoneScore = hasPhone ? SCORING_WEIGHTS.PUBLIC_PHONE : 0;
  totalScore += phoneScore;

  // 3. Social presence (+15)
  const hasSocialPresence = enrichment.socialProfileCount > 0;
  const socialPresenceScore = hasSocialPresence ? SCORING_WEIGHTS.SOCIAL_PRESENCE : 0;
  totalScore += socialPresenceScore;

  // 4. Reviews (+10 for >= 20, +10 for >= 100)
  const reviewCount = business.reviewCount ?? 0;
  let reviewCountScore = 0;
  if (reviewCount >= 100) {
    reviewCountScore = SCORING_WEIGHTS.REVIEWS_20_PLUS + SCORING_WEIGHTS.REVIEWS_100_PLUS;
  } else if (reviewCount >= 20) {
    reviewCountScore = SCORING_WEIGHTS.REVIEWS_20_PLUS;
  }
  totalScore += reviewCountScore;

  // 5. Strong niche fit (+10)
  const categoryLower = (business.category || business.categories?.join(' ') || '').toLowerCase();
  const nameLower = business.name.toLowerCase();
  const isHighValueNiche = HIGH_VALUE_NICHES.some(
    (niche) => categoryLower.includes(niche) || nameLower.includes(niche)
  );
  const nicheFitScore = isHighValueNiche ? SCORING_WEIGHTS.STRONG_NICHE_FIT : 0;
  totalScore += nicheFitScore;

  // 6. Complete business identity (+10) - name + city/address + phone + category
  const hasAddress = Boolean(business.address || business.street);
  const hasCity = Boolean(business.city);
  const hasCategory = Boolean(business.category);
  const isCompleteIdentity = Boolean(business.name && (hasAddress || hasCity) && hasPhone && hasCategory);
  const completeIdentityScore = isCompleteIdentity ? SCORING_WEIGHTS.COMPLETE_IDENTITY : 0;
  totalScore += completeIdentityScore;

  // 7. Multiple online profiles (+5)
  const multipleProfiles = enrichment.socialProfileCount >= 2;
  const multipleProfilesScore = multipleProfiles ? SCORING_WEIGHTS.MULTIPLE_PROFILES : 0;
  totalScore += multipleProfilesScore;

  // 8. Established signals (+5) - rating >= 4.0 or review count >= 5
  const rating = business.rating ?? 0;
  const appearsEstablished = (rating >= 4.0 && reviewCount >= 5) || reviewCount >= 15;
  const establishedSignalsScore = appearsEstablished ? SCORING_WEIGHTS.ESTABLISHED_SIGNALS : 0;
  totalScore += establishedSignalsScore;

  // --- Penalties ---

  // Penalty: Official website detected (-30)
  const officialWebsitePenalty = websiteResult.hasOfficialWebsite ? SCORING_WEIGHTS.PENALTY_OFFICIAL_WEBSITE : 0;
  totalScore += officialWebsitePenalty;

  // Penalty: Permanently or temporarily closed (-20)
  const isClosed = Boolean(business.permanentlyClosed || business.temporarilyClosed);
  const closedPenalty = isClosed ? SCORING_WEIGHTS.PENALTY_CLOSED_OR_INACTIVE : 0;
  totalScore += closedPenalty;

  // Penalty: Low confidence identity match (-15)
  const lowConfidenceIdentity = websiteResult.confidence === 'low';
  const lowConfidencePenalty = lowConfidenceIdentity ? SCORING_WEIGHTS.PENALTY_LOW_CONFIDENCE_IDENTITY : 0;
  totalScore += lowConfidencePenalty;

  // Penalty: Duplicate (-10)
  const duplicatePenalty = isDuplicate ? SCORING_WEIGHTS.PENALTY_DUPLICATE : 0;
  totalScore += duplicatePenalty;

  // Clamp final score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, Math.round(totalScore)));

  // Determine Lead Tier
  const leadTier = getTierFromScore(clampedScore);

  // Derived Activity Score (0–100)
  let activityScore = 0;
  if (reviewCount >= 100) activityScore += 40;
  else if (reviewCount >= 50) activityScore += 30;
  else if (reviewCount >= 20) activityScore += 20;
  else if (reviewCount >= 5) activityScore += 10;
  if (rating >= 4.5) activityScore += 30;
  else if (rating >= 4.0) activityScore += 20;
  else if (rating > 0) activityScore += 10;
  if (business.openingHours) activityScore += 15;
  if (hasPhone) activityScore += 15;
  activityScore = Math.min(100, activityScore);

  // Derived Online Presence Score (0–100)
  let onlinePresenceScore = 0;
  if (enrichment.hasInstagram) onlinePresenceScore += 30;
  if (enrichment.hasFacebook) onlinePresenceScore += 25;
  if (enrichment.hasLinkedIn) onlinePresenceScore += 20;
  if (enrichment.hasYouTube) onlinePresenceScore += 15;
  if (business.mapsUrl) onlinePresenceScore += 10;
  onlinePresenceScore = Math.min(100, onlinePresenceScore);

  const breakdown: LeadScoreBreakdown = {
    noOfficialWebsiteScore,
    phoneScore,
    socialPresenceScore,
    reviewCountScore,
    nicheFitScore,
    completeIdentityScore,
    multipleProfilesScore,
    establishedSignalsScore,
    officialWebsitePenalty,
    closedPenalty,
    lowConfidencePenalty,
    duplicatePenalty,
    totalScore,
    clampedScore,
  };

  const signals: OpportunitySignals = {
    noOfficialWebsite,
    hasGooglePresence: Boolean(business.mapsUrl || business.sourcePlaceId),
    hasPhone,
    hasReviews: reviewCount > 0,
    hasSocialPresence,
    hasInstagram: enrichment.hasInstagram,
    hasFacebook: enrichment.hasFacebook,
    appearsEstablished,
    likelyCommercialBusiness: isHighValueNiche,
  };

  return {
    leadScore: clampedScore,
    leadTier,
    onlinePresenceScore,
    activityScore,
    breakdown,
    signals,
  };
}

export function getTierFromScore(score: number): LeadTier {
  if (score >= LEAD_TIER_BOUNDARIES.A.min) return 'A';
  if (score >= LEAD_TIER_BOUNDARIES.B.min) return 'B';
  if (score >= LEAD_TIER_BOUNDARIES.C.min) return 'C';
  return 'D';
}
