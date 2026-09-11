import { describe, it, expect } from 'vitest';
import { Deduplicator, deduplicateBusinesses } from '../src/dedupe/dedupe.js';
import {
  mockNoWebsiteBusiness,
  mockDuplicateByPlaceId,
  mockDuplicateByNameAndPhone,
  mockOfficialWebsiteBusiness,
} from './fixtures/businesses.js';

describe('Deduplicator', () => {
  it('should deduplicate listings by sourcePlaceId', () => {
    const deduplicator = new Deduplicator();

    const isFirstUnique = deduplicator.process(mockNoWebsiteBusiness);
    const isSecondUnique = deduplicator.process(mockDuplicateByPlaceId);

    expect(isFirstUnique).toBe(true);
    expect(isSecondUnique).toBe(false);
  });

  it('should deduplicate listings by normalized name + normalized phone', () => {
    const deduplicator = new Deduplicator();

    const isFirstUnique = deduplicator.process(mockNoWebsiteBusiness);
    const isSecondUnique = deduplicator.process(mockDuplicateByNameAndPhone);

    expect(isFirstUnique).toBe(true);
    expect(isSecondUnique).toBe(false);
  });

  it('should keep distinctly different businesses', () => {
    const list = [mockNoWebsiteBusiness, mockOfficialWebsiteBusiness];
    const unique = deduplicateBusinesses(list);

    expect(unique.length).toBe(2);
  });

  it('should remove all duplicates from a mixed batch', () => {
    const batch = [
      mockNoWebsiteBusiness,
      mockDuplicateByPlaceId,
      mockDuplicateByNameAndPhone,
      mockOfficialWebsiteBusiness,
    ];

    const unique = deduplicateBusinesses(batch);
    expect(unique.length).toBe(2);
  });
});
