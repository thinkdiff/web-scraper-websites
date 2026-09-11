import { describe, it, expect } from 'vitest';
import { classifyDomain } from '../src/website/domain-classifier.js';

describe('Domain Classifier', () => {
  it('should correctly classify social media URLs', () => {
    expect(classifyDomain('https://www.instagram.com/myboutique').classification).toBe('social_profile');
    expect(classifyDomain('https://instagram.com/myboutique').platformName).toBe('instagram');
    expect(classifyDomain('https://facebook.com/pages/realestate').classification).toBe('social_profile');
    expect(classifyDomain('https://fb.com/realestate').platformName).toBe('facebook');
    expect(classifyDomain('https://www.linkedin.com/company/om-infra').classification).toBe('social_profile');
    expect(classifyDomain('https://youtube.com/@jewellerychannel').classification).toBe('social_profile');
    expect(classifyDomain('https://x.com/localjeweller').classification).toBe('social_profile');
    expect(classifyDomain('https://in.pinterest.com/boutique').classification).toBe('social_profile');
  });

  it('should correctly classify directory URLs', () => {
    expect(classifyDomain('https://www.justdial.com/Rajkot/Om-Real-Estate').classification).toBe('directory_profile');
    expect(classifyDomain('https://www.indiamart.com/company').classification).toBe('directory_profile');
    expect(classifyDomain('https://tradeindia.com/seller').classification).toBe('directory_profile');
    expect(classifyDomain('https://sulekha.com/services').classification).toBe('directory_profile');
    expect(classifyDomain('https://www.yelp.com/biz/salon').classification).toBe('directory_profile');
    expect(classifyDomain('https://maps.google.com/maps?cid=123').classification).toBe('directory_profile');
    expect(classifyDomain('https://business.google.com/site/xyz').classification).toBe('directory_profile');
  });

  it('should correctly classify marketplace URLs', () => {
    expect(classifyDomain('https://www.amazon.in/dp/B00123').classification).toBe('marketplace_profile');
    expect(classifyDomain('https://flipkart.com/item').classification).toBe('marketplace_profile');
    expect(classifyDomain('https://magicbricks.com/property').classification).toBe('marketplace_profile');
    expect(classifyDomain('https://99acres.com/project').classification).toBe('marketplace_profile');
  });

  it('should correctly classify booking platforms', () => {
    expect(classifyDomain('https://www.zomato.com/rajkot/grand-thakar').classification).toBe('booking_platform');
    expect(classifyDomain('https://swiggy.com/restaurants/xyz').classification).toBe('booking_platform');
    expect(classifyDomain('https://practo.com/rajkot/doctor').classification).toBe('booking_platform');
    expect(classifyDomain('https://urbancompany.com/salon').classification).toBe('booking_platform');
  });

  it('should correctly classify official business websites', () => {
    const result1 = classifyDomain('https://www.kalyanjewellers.net');
    expect(result1.classification).toBe('official_business_website');
    expect(result1.isOfficialCandidate).toBe(true);

    const result2 = classifyDomain('https://shreehariboutique.in');
    expect(result2.classification).toBe('official_business_website');
    expect(result2.isOfficialCandidate).toBe(true);

    const result3 = classifyDomain('http://omrealestate.co.in');
    expect(result3.classification).toBe('official_business_website');
    expect(result3.isOfficialCandidate).toBe(true);
  });

  it('should handle invalid or empty URLs gracefully', () => {
    expect(classifyDomain(undefined).classification).toBe('unknown');
    expect(classifyDomain('').classification).toBe('unknown');
    expect(classifyDomain('not-a-valid-url').classification).toBe('unknown');
  });
});
