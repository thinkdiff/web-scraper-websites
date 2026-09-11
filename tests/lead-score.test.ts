import { describe, it, expect } from 'vitest';
import { calculateLeadScore, getTierFromScore } from '../src/scoring/lead-score.js';
import {
  mockNoWebsiteBusiness,
  mockOfficialWebsiteBusiness,
  mockClosedBusiness,
} from './fixtures/businesses.js';
import { enrichSocialProfiles } from '../src/enrichment/social-enricher.js';

describe('Lead Scoring Engine', () => {
  it('should score high (Tier A: 80-100) for active local business with no website, phone, social presence, and reviews', () => {
    const websiteResult = {
      hasOfficialWebsite: false,
      website: null,
      confidence: 'high' as const,
      reason: 'No website detected',
      classification: 'unknown' as const,
    };

    const enrichment = enrichSocialProfiles(mockNoWebsiteBusiness, [
      {
        platform: 'instagram',
        url: 'https://instagram.com/rajputjewellersrajkot',
        confidence: 'high',
        reason: 'Exact name and city match',
      },
      {
        platform: 'facebook',
        url: 'https://facebook.com/rajputjewellers',
        confidence: 'high',
        reason: 'Exact name match',
      },
    ]);

    const result = calculateLeadScore({
      business: mockNoWebsiteBusiness,
      websiteResult,
      enrichment,
    });

    expect(result.leadScore).toBeGreaterThanOrEqual(80);
    expect(result.leadTier).toBe('A');
    expect(result.breakdown.noOfficialWebsiteScore).toBe(25);
    expect(result.breakdown.phoneScore).toBe(20);
    expect(result.breakdown.socialPresenceScore).toBe(15);
    expect(result.breakdown.reviewCountScore).toBe(20); // 128 reviews >= 100
  });

  it('should apply penalty for official website detected and result in lower tier', () => {
    const websiteResult = {
      hasOfficialWebsite: true,
      website: 'https://www.kalyanjewellers.net',
      confidence: 'high' as const,
      reason: 'Official domain found',
      classification: 'official_business_website' as const,
    };

    const enrichment = enrichSocialProfiles(mockOfficialWebsiteBusiness);

    const result = calculateLeadScore({
      business: mockOfficialWebsiteBusiness,
      websiteResult,
      enrichment,
    });

    expect(result.breakdown.officialWebsitePenalty).toBe(-30);
    expect(result.breakdown.noOfficialWebsiteScore).toBe(0);
    expect(result.leadScore).toBeLessThan(80);
  });

  it('should penalize closed businesses', () => {
    const websiteResult = {
      hasOfficialWebsite: false,
      website: null,
      confidence: 'high' as const,
      reason: 'No website detected',
      classification: 'unknown' as const,
    };

    const enrichment = enrichSocialProfiles(mockClosedBusiness);

    const result = calculateLeadScore({
      business: mockClosedBusiness,
      websiteResult,
      enrichment,
    });

    expect(result.breakdown.closedPenalty).toBe(-20);
  });

  it('should correctly determine tiers from score boundaries', () => {
    expect(getTierFromScore(95)).toBe('A');
    expect(getTierFromScore(80)).toBe('A');
    expect(getTierFromScore(79)).toBe('B');
    expect(getTierFromScore(65)).toBe('B');
    expect(getTierFromScore(64)).toBe('C');
    expect(getTierFromScore(50)).toBe('C');
    expect(getTierFromScore(49)).toBe('D');
    expect(getTierFromScore(0)).toBe('D');
  });
});
