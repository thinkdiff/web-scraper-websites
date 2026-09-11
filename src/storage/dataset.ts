import { Actor } from 'apify';
import {
  BusinessRecord,
  WebsiteDetectionResult,
  SocialEnrichmentResult,
  LeadScoreResult,
  LeadOutputRecord,
  EmailEnrichmentResult,
} from '../config/types.js';
import { normalizePhoneNumber } from '../normalization/phone-normalizer.js';
import { cleanBusinessNameForDisplay } from '../normalization/business-normalizer.js';
import { generateOpportunityReason } from '../scoring/opportunity-reason.js';
import { isValidLeadOutput } from '../utils/validation.js';
import { appLogger } from '../utils/logger.js';

export interface BuildLeadOptions {
  business: BusinessRecord;
  websiteResult: WebsiteDetectionResult;
  enrichment: SocialEnrichmentResult;
  scoreResult: LeadScoreResult;
  emailResult?: EmailEnrichmentResult;
  defaultCountry?: string;
}

/**
 * Builds a flat, CRM-friendly lead record.
 */
export function buildLeadOutput(options: BuildLeadOptions): LeadOutputRecord {
  const { business, websiteResult, enrichment, scoreResult, emailResult, defaultCountry = 'IN' } = options;

  const { phoneNormalized } = normalizePhoneNumber(business.phone, defaultCountry);

  const cleanName = cleanBusinessNameForDisplay(business.name);
  const leadId = business.sourcePlaceId || `lead_${Buffer.from(cleanName + (business.city || '')).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}`;

  const opportunityReason = generateOpportunityReason(business, websiteResult, enrichment, scoreResult);

  const record: LeadOutputRecord = {
    leadId,
    name: cleanName,
    category: business.category || (business.categories && business.categories[0]) || 'Business',

    address: business.address || business.street || '',
    city: business.city || '',
    state: business.state || '',
    country: business.country || defaultCountry,

    latitude: business.latitude ?? null,
    longitude: business.longitude ?? null,

    phone: business.phone || '',
    phoneNormalized: phoneNormalized || business.phone || '',

    website: websiteResult.hasOfficialWebsite ? websiteResult.website : (business.website || null),
    hasOfficialWebsite: websiteResult.hasOfficialWebsite,
    websiteMatchConfidence: websiteResult.confidence,
    websiteDetectionReason: websiteResult.reason,

    instagram: enrichment.profiles.instagram || null,
    facebook: enrichment.profiles.facebook || null,
    linkedin: enrichment.profiles.linkedin || null,
    youtube: enrichment.profiles.youtube || null,

    googleMapsUrl: business.mapsUrl || null,
    sourcePlaceId: business.sourcePlaceId || null,

    rating: business.rating ?? null,
    reviewCount: business.reviewCount ?? null,

    socialProfileCount: enrichment.socialProfileCount,

    onlinePresenceScore: scoreResult.onlinePresenceScore,
    activityScore: scoreResult.activityScore,
    leadScore: scoreResult.leadScore,
    leadTier: scoreResult.leadTier,

    opportunityReason,

    scrapedAt: new Date().toISOString(),
  };

  if (emailResult && emailResult.emails.length > 0) {
    record.emails = emailResult.emails;
    record.primaryEmail = emailResult.primaryEmail;
  }

  return record;
}

/**
 * Pushes a batch of qualified leads to the default Apify Dataset.
 */
export async function saveLeadsToDataset(leads: LeadOutputRecord[]): Promise<number> {
  const validLeads = leads.filter(isValidLeadOutput);

  if (validLeads.length === 0) {
    appLogger.info('OUTPUT', 'No leads to push to dataset.');
    return 0;
  }

  appLogger.info('OUTPUT', `Pushing ${validLeads.length} leads to Apify Dataset...`);
  await Actor.pushData(validLeads);
  return validLeads.length;
}
