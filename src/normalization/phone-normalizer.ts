import { parsePhoneNumberWithError, CountryCode } from 'libphonenumber-js';

/**
 * Normalizes phone numbers to standard E.164 where possible, with fallback cleaning.
 */
export function normalizePhoneNumber(
  phone: string | undefined | null,
  defaultCountry: string = 'IN'
): { phone: string; phoneNormalized: string; isValid: boolean } {
  if (!phone || phone.trim().length === 0) {
    return { phone: '', phoneNormalized: '', isValid: false };
  }

  const rawPhone = phone.trim();

  // Try libphonenumber-js parsing first
  try {
    const parsed = parsePhoneNumberWithError(rawPhone, (defaultCountry.toUpperCase() as CountryCode) || 'IN');
    if (parsed && parsed.isValid()) {
      return {
        phone: rawPhone,
        phoneNormalized: parsed.format('E.164'),
        isValid: true,
      };
    }
  } catch {
    // Fall back to custom heuristic cleaning
  }

  // Heuristic cleanup for common local formats (e.g. India +91)
  const digitsOnly = rawPhone.replace(/\D/g, '');

  if (defaultCountry.toUpperCase() === 'IN') {
    // 10-digit Indian number: prefix with +91
    if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
      return {
        phone: rawPhone,
        phoneNormalized: `+91${digitsOnly}`,
        isValid: true,
      };
    }
    // 11-digit starting with 0: replace 0 with +91
    if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      const remaining = digitsOnly.slice(1);
      if (remaining.length === 10) {
        return {
          phone: rawPhone,
          phoneNormalized: `+91${remaining}`,
          isValid: true,
        };
      }
    }
    // 12-digit starting with 91: prefix with +
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      return {
        phone: rawPhone,
        phoneNormalized: `+${digitsOnly}`,
        isValid: true,
      };
    }
  }

  // Generic fallback if digits exist
  if (digitsOnly.length >= 7) {
    const formatted = rawPhone.startsWith('+') ? `+${digitsOnly}` : digitsOnly;
    return {
      phone: rawPhone,
      phoneNormalized: formatted,
      isValid: digitsOnly.length >= 10,
    };
  }

  return {
    phone: rawPhone,
    phoneNormalized: rawPhone,
    isValid: false,
  };
}

/**
 * Returns digits-only string for deduplication comparison
 */
export function getPhoneDigitsForDedupe(phone: string | undefined | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // If Indian format with 91 prefix and 12 digits, return last 10 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  // If starts with 0 and 11 digits, return last 10 digits
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}
