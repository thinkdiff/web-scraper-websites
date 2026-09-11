import { z } from 'zod';
import { ActorInput, BusinessRecord, LeadOutputRecord } from '../config/types.js';
import { DEFAULT_INPUT } from '../config/defaults.js';

export const ActorInputSchema = z.object({
  locations: z.array(z.string().min(1)).min(1, 'At least one location is required'),
  searchQueries: z.array(z.string().min(1)).min(1, 'At least one search query is required'),
  maxResultsPerQuery: z.number().int().positive().default(DEFAULT_INPUT.maxResultsPerQuery),
  websiteFilter: z.enum(['WITHOUT_WEBSITE', 'WITH_WEBSITE', 'ALL']).default(DEFAULT_INPUT.websiteFilter),
  requirePhone: z.boolean().default(DEFAULT_INPUT.requirePhone),
  enrichSocialProfiles: z.boolean().default(DEFAULT_INPUT.enrichSocialProfiles),
  enrichEmails: z.boolean().default(DEFAULT_INPUT.enrichEmails),
  searchEngineEnrichment: z.boolean().default(DEFAULT_INPUT.searchEngineEnrichment),
  minimumLeadScore: z.number().int().min(0).max(100).default(DEFAULT_INPUT.minimumLeadScore),
  language: z.string().default(DEFAULT_INPUT.language),
  countryCode: z.string().default(DEFAULT_INPUT.countryCode),
  excludeClosedBusinesses: z.boolean().default(DEFAULT_INPUT.excludeClosedBusinesses),
  maxConcurrency: z.number().int().min(1).max(20).default(DEFAULT_INPUT.maxConcurrency),
  requestTimeoutMs: z.number().int().min(5000).max(120000).default(DEFAULT_INPUT.requestTimeoutMs),
  discoveryProvider: z.enum(['apify_actor', 'direct_fallback']).default(DEFAULT_INPUT.discoveryProvider),
  mapsActorId: z.string().default(DEFAULT_INPUT.mapsActorId),
});

export function parseAndValidateInput(rawInput: unknown): ActorInput {
  const parsed = ActorInputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid Actor input: ${errorDetails}`);
  }
  return parsed.data;
}

export function isValidBusiness(business: BusinessRecord, config: ActorInput): boolean {
  if (!business.name || business.name.trim().length === 0) {
    return false;
  }

  // Location requirement: must have at least city, address, or street
  const hasLocation = Boolean(
    (business.city && business.city.trim().length > 0) ||
    (business.address && business.address.trim().length > 0) ||
    (business.street && business.street.trim().length > 0)
  );

  if (!hasLocation) {
    return false;
  }

  // Closed business check
  if (config.excludeClosedBusinesses) {
    if (business.permanentlyClosed || business.temporarilyClosed) {
      return false;
    }
  }

  // Phone requirement check
  if (config.requirePhone) {
    if (!business.phone || business.phone.trim().length === 0) {
      return false;
    }
  }

  return true;
}

export function isValidLeadOutput(lead: LeadOutputRecord): boolean {
  if (!lead.name || lead.name.trim().length === 0) return false;
  if (!lead.leadId) return false;
  if (lead.leadScore < 0 || lead.leadScore > 100) return false;
  return true;
}
