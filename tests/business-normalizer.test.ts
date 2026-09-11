import { describe, it, expect } from 'vitest';
import {
  normalizeBusinessName,
  cleanBusinessNameForDisplay,
  normalizeCity,
  normalizeAddress,
} from '../src/normalization/business-normalizer.js';

describe('Business Normalizer', () => {
  it('should strip legal suffixes cleanly', () => {
    expect(normalizeBusinessName('Shree Krishna Jewellers Pvt. Ltd.')).toBe('shree krishna jewellers');
    expect(normalizeBusinessName('Om Infra Real Estate LLC')).toBe('om infra real estate');
    expect(normalizeBusinessName('Heritage Boutique Inc.')).toBe('heritage boutique');
  });

  it('should remove punctuation and collapse extra spaces', () => {
    expect(normalizeBusinessName('  Star   Jewellers,   (Rajkot)  ')).toBe('star jewellers rajkot');
    expect(normalizeBusinessName('Dr. Batra\'s Positive Health Clinic Pvt Ltd')).toBe('dr batra s positive health clinic');
  });

  it('should clean business name for display without mangling casing', () => {
    expect(cleanBusinessNameForDisplay('  Rajput Jewellers Pvt. Ltd.   ')).toBe('Rajput Jewellers Pvt. Ltd.');
  });

  it('should normalize city names consistently', () => {
    expect(normalizeCity('Rajkot, Gujarat')).toBe('rajkot gujarat');
    expect(normalizeCity(' Ahmedabad ')).toBe('ahmedabad');
  });

  it('should normalize addresses by removing common road/street tokens for deduplication', () => {
    const addr1 = normalizeAddress('Opp. Imperial Palace, Dr. Yagnik Road, Rajkot');
    const addr2 = normalizeAddress('Imperial Palace, Yagnik Rd, Rajkot');
    expect(addr1.includes('imperial palace')).toBe(true);
    expect(addr2.includes('imperial palace')).toBe(true);
  });
});
