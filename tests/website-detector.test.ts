import { describe, it, expect } from 'vitest';
import { detectOfficialWebsite } from '../src/website/website-detector.js';
import {
  mockNoWebsiteBusiness,
  mockOfficialWebsiteBusiness,
  mockInstagramOnlyBusiness,
  mockDirectoryOnlyBusiness,
} from './fixtures/businesses.js';
import { DEFAULT_INPUT } from '../src/config/defaults.js';

describe('Website Detector', () => {
  it('should detect official website when genuine domain is provided', async () => {
    const result = await detectOfficialWebsite(mockOfficialWebsiteBusiness, DEFAULT_INPUT);

    expect(result.hasOfficialWebsite).toBe(true);
    expect(result.classification).toBe('official_business_website');
    expect(result.confidence).toBe('high');
    expect(result.website).toContain('kalyanjewellers.net');
  });

  it('should declare hasOfficialWebsite=false when business has no website', async () => {
    const result = await detectOfficialWebsite(mockNoWebsiteBusiness, {
      ...DEFAULT_INPUT,
      searchEngineEnrichment: false,
    });

    expect(result.hasOfficialWebsite).toBe(false);
    expect(result.confidence).toBe('high');
    expect(result.reason).toContain('No official website found');
  });

  it('should distinguish Instagram profile as NOT an official website', async () => {
    const result = await detectOfficialWebsite(mockInstagramOnlyBusiness, DEFAULT_INPUT);

    expect(result.hasOfficialWebsite).toBe(false);
    expect(result.classification).toBe('social_profile');
    expect(result.confidence).toBe('high');
    expect(result.reason).toContain('social profile');
  });

  it('should distinguish Justdial directory listing as NOT an official website', async () => {
    const result = await detectOfficialWebsite(mockDirectoryOnlyBusiness, DEFAULT_INPUT);

    expect(result.hasOfficialWebsite).toBe(false);
    expect(result.classification).toBe('directory_profile');
    expect(result.confidence).toBe('high');
    expect(result.reason).toContain('directory link');
  });
});
