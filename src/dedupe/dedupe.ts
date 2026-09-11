import { BusinessRecord } from '../config/types.js';
import { normalizeBusinessName, normalizeCity, normalizeAddress } from '../normalization/business-normalizer.js';
import { getPhoneDigitsForDedupe } from '../normalization/phone-normalizer.js';
import { appLogger } from '../utils/logger.js';

export class Deduplicator {
  private seenPlaceIds = new Set<string>();
  private seenNamePhone = new Set<string>();
  private seenNameAddress = new Set<string>();

  /**
   * Check if a business record is a duplicate and register it if unique.
   * Returns true if unique (not a duplicate), false if duplicate.
   */
  process(business: BusinessRecord): boolean {
    // 1. Primary identity: sourcePlaceId
    if (business.sourcePlaceId && business.sourcePlaceId.trim().length > 0) {
      const placeKey = business.sourcePlaceId.trim();
      if (this.seenPlaceIds.has(placeKey)) {
        return false;
      }
      this.seenPlaceIds.add(placeKey);
    }

    const normName = normalizeBusinessName(business.name);
    if (!normName) {
      return false;
    }

    // 2. Secondary identity: normalized name + normalized phone
    const phoneDigits = getPhoneDigitsForDedupe(business.phone);
    if (phoneDigits && phoneDigits.length >= 7) {
      const namePhoneKey = `${normName}::${phoneDigits}`;
      if (this.seenNamePhone.has(namePhoneKey)) {
        return false;
      }
      this.seenNamePhone.add(namePhoneKey);
    }

    // 3. Fallback identity: normalized name + normalized address + city
    const normCity = normalizeCity(business.city);
    const normAddr = normalizeAddress(business.address || business.street);
    if (normCity || normAddr) {
      const nameAddrKey = `${normName}::${normAddr}::${normCity}`;
      if (this.seenNameAddress.has(nameAddrKey)) {
        return false;
      }
      this.seenNameAddress.add(nameAddrKey);
    }

    return true;
  }

  /**
   * Reset deduplication state
   */
  clear(): void {
    this.seenPlaceIds.clear();
    this.seenNamePhone.clear();
    this.seenNameAddress.clear();
  }

  get stats(): { placeIdsCount: number; namePhoneCount: number; nameAddressCount: number } {
    return {
      placeIdsCount: this.seenPlaceIds.size,
      namePhoneCount: this.seenNamePhone.size,
      nameAddressCount: this.seenNameAddress.size,
    };
  }
}

/**
 * Filter an array of business records removing duplicates
 */
export function deduplicateBusinesses(businesses: BusinessRecord[]): BusinessRecord[] {
  const deduplicator = new Deduplicator();
  const unique: BusinessRecord[] = [];
  let duplicateCount = 0;

  for (const business of businesses) {
    if (deduplicator.process(business)) {
      unique.push(business);
    } else {
      duplicateCount++;
    }
  }

  appLogger.info('DEDUPE', `Deduplication complete: retained ${unique.length}, removed ${duplicateCount} duplicates`);
  return unique;
}
