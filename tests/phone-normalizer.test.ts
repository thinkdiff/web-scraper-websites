import { describe, it, expect } from 'vitest';
import { normalizePhoneNumber, getPhoneDigitsForDedupe } from '../src/normalization/phone-normalizer.js';

describe('Phone Normalizer', () => {
  it('should normalize 10-digit Indian mobile numbers to E.164 (+91)', () => {
    const res1 = normalizePhoneNumber('9825012345', 'IN');
    expect(res1.phoneNormalized).toBe('+919825012345');
    expect(res1.isValid).toBe(true);

    const res2 = normalizePhoneNumber('098250 12345', 'IN');
    expect(res2.phoneNormalized).toBe('+919825012345');
    expect(res2.isValid).toBe(true);
  });

  it('should preserve already formatted +91 numbers', () => {
    const res = normalizePhoneNumber('+91 98250 12345', 'IN');
    expect(res.phoneNormalized).toBe('+919825012345');
    expect(res.isValid).toBe(true);
  });

  it('should handle Indian landline numbers with STD code', () => {
    const res = normalizePhoneNumber('0281 2234567', 'IN');
    expect(res.phoneNormalized).toBe('+912812234567');
    expect(res.isValid).toBe(true);
  });

  it('should extract consistent digits for deduplication', () => {
    expect(getPhoneDigitsForDedupe('+91 98250 12345')).toBe('9825012345');
    expect(getPhoneDigitsForDedupe('098250 12345')).toBe('9825012345');
    expect(getPhoneDigitsForDedupe('98250-12345')).toBe('9825012345');
  });

  it('should handle empty or invalid phone values gracefully', () => {
    expect(normalizePhoneNumber(undefined).isValid).toBe(false);
    expect(normalizePhoneNumber('').isValid).toBe(false);
    expect(normalizePhoneNumber('N/A').isValid).toBe(false);
  });
});
