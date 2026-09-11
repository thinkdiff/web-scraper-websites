import { describe, it, expect } from 'vitest';
import { generateOpportunityReason } from '../src/scoring/opportunity-reason.js';
import { calculateLeadScore } from '../src/scoring/lead-score.js';
import { enrichSocialProfiles } from '../src/enrichment/social-enricher.js';
import { mockNoWebsiteBusiness, mockInstagramOnlyBusiness } from './fixtures/businesses.js';

describe('Opportunity Reason Generator', () => {
  it('should generate factual deterministic evidence statements for website-less leads', () => {
    const websiteResult = {
      hasOfficialWebsite: false,
      website: null,
      confidence: 'high' as const,
      reason: 'No website found',
      classification: 'unknown' as const,
    };

    const enrichment = enrichSocialProfiles(mockNoWebsiteBusiness, [
      {
        platform: 'instagram',
        url: 'https://instagram.com/rajputjewellers',
        confidence: 'high',
        reason: 'Name match',
      },
    ]);

    const scoreResult = calculateLeadScore({
      business: mockNoWebsiteBusiness,
      websiteResult,
      enrichment,
    });

    const reason = generateOpportunityReason(mockNoWebsiteBusiness, websiteResult, enrichment, scoreResult);

    expect(reason).toContain('No official website detected.');
    expect(reason).toContain('128 Google reviews');
    expect(reason).toContain('Public business phone available.');
    expect(reason).toContain('Instagram presence verified.');
    expect(reason).toContain('Rajkot');
    expect(reason).toContain('Tier A');
  });

  it('should indicate social profile usage when primary listing URL was social', () => {
    const websiteResult = {
      hasOfficialWebsite: false,
      website: 'https://instagram.com/shreeboutiquerajkot',
      confidence: 'high' as const,
      reason: 'Listing is Instagram profile',
      classification: 'social_profile' as const,
    };

    const enrichment = enrichSocialProfiles(mockInstagramOnlyBusiness);
    const scoreResult = calculateLeadScore({
      business: mockInstagramOnlyBusiness,
      websiteResult,
      enrichment,
    });

    const reason = generateOpportunityReason(mockInstagramOnlyBusiness, websiteResult, enrichment, scoreResult);

    expect(reason).toContain('uses social profile as primary link');
    expect(reason).toContain('52 Google reviews');
  });
});
