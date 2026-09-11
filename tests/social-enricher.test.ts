import { describe, it, expect } from 'vitest';
import {
  evaluateSocialProfileConfidence,
  enrichSocialProfiles,
} from '../src/enrichment/social-enricher.js';
import { mockNoWebsiteBusiness, mockInstagramOnlyBusiness } from './fixtures/businesses.js';

describe('Social Enricher', () => {
  it('should evaluate high confidence for exact name tokens + city', () => {
    const evalResult = evaluateSocialProfileConfidence(
      'https://www.instagram.com/rajput_jewellers_rajkot/',
      mockNoWebsiteBusiness,
      'instagram'
    );

    expect(evalResult.confidence).toBe('high');
    expect(evalResult.reason).toContain('match');
  });

  it('should evaluate low confidence for generic or non-matching usernames', () => {
    const evalResult = evaluateSocialProfileConfidence(
      'https://www.instagram.com/random_jewelry_shop_delhi/',
      mockNoWebsiteBusiness,
      'instagram'
    );

    expect(evalResult.confidence).toBe('low');
  });

  it('should extract social profiles when listing website is a social URL', () => {
    const enrichment = enrichSocialProfiles(mockInstagramOnlyBusiness);

    expect(enrichment.socialProfileCount).toBe(1);
    expect(enrichment.hasInstagram).toBe(true);
    expect(enrichment.profiles.instagram).toBe('https://instagram.com/shreeboutiquerajkot');
  });

  it('should merge multiple valid social profile candidates while filtering low confidence', () => {
    const enrichment = enrichSocialProfiles(mockNoWebsiteBusiness, [
      {
        platform: 'instagram',
        url: 'https://instagram.com/rajputjewellers',
        confidence: 'high',
        reason: 'Name match',
      },
      {
        platform: 'facebook',
        url: 'https://facebook.com/rajputjewellersrajkot',
        confidence: 'high',
        reason: 'Name + city match',
      },
      {
        platform: 'twitter',
        url: 'https://x.com/randomuser123',
        confidence: 'low',
        reason: 'No match',
      },
    ]);

    expect(enrichment.socialProfileCount).toBe(2);
    expect(enrichment.hasInstagram).toBe(true);
    expect(enrichment.hasFacebook).toBe(true);
    expect(enrichment.profiles.twitter).toBeNull();
  });
});
