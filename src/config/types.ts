/**
 * Core type definitions for QEVN Website Opportunity Lead Finder
 */

export type WebsiteFilterMode = 'WITHOUT_WEBSITE' | 'WITH_WEBSITE' | 'ALL';

export type LeadTier = 'A' | 'B' | 'C' | 'D';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

export type DomainClassification =
  | 'official_business_website'
  | 'social_profile'
  | 'directory_profile'
  | 'marketplace_profile'
  | 'booking_platform'
  | 'unknown';

export interface ActorInput {
  locations: string[];
  searchQueries: string[];
  maxResultsPerQuery?: number;
  websiteFilter?: WebsiteFilterMode;
  requirePhone?: boolean;
  enrichSocialProfiles?: boolean;
  enrichEmails?: boolean;
  searchEngineEnrichment?: boolean;
  minimumLeadScore?: number;
  language?: string;
  countryCode?: string;
  excludeClosedBusinesses?: boolean;
  maxConcurrency?: number;
  requestTimeoutMs?: number;
  discoveryProvider?: 'apify_actor' | 'direct_fallback';
  mapsActorId?: string;
}

export interface BusinessRecord {
  source: 'google_maps' | 'other';
  sourcePlaceId?: string;

  name: string;
  category?: string;
  categories?: string[];

  address?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;

  latitude?: number;
  longitude?: number;

  phone?: string;
  website?: string;

  rating?: number;
  reviewCount?: number;

  openingHours?: unknown;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;

  mapsUrl?: string;
  rawSource?: unknown;
}

export interface WebsiteDetectionResult {
  hasOfficialWebsite: boolean;
  website: string | null;
  confidence: ConfidenceLevel;
  reason: string;
  classification: DomainClassification;
  redirected?: boolean;
  finalUrl?: string;
}

export interface SocialProfiles {
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  youtube: string | null;
  twitter: string | null;
  pinterest: string | null;
  other?: string[];
}

export interface ProfileCandidate {
  platform: 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'twitter' | 'pinterest' | 'directory' | 'other';
  url: string;
  confidence: ConfidenceLevel;
  reason: string;
  handle?: string;
}

export interface SocialEnrichmentResult {
  profiles: SocialProfiles;
  candidates: ProfileCandidate[];
  socialProfileCount: number;
  hasInstagram: boolean;
  hasFacebook: boolean;
  hasLinkedIn: boolean;
  hasYouTube: boolean;
}

export interface EmailEnrichmentResult {
  emails: string[];
  primaryEmail: string | null;
  emailSource?: string;
}

export interface OpportunitySignals {
  noOfficialWebsite: boolean;
  hasGooglePresence: boolean;
  hasPhone: boolean;
  hasReviews: boolean;
  hasSocialPresence: boolean;
  hasInstagram: boolean;
  hasFacebook: boolean;
  appearsEstablished: boolean;
  likelyCommercialBusiness: boolean;
}

export interface LeadScoreBreakdown {
  noOfficialWebsiteScore: number;
  phoneScore: number;
  socialPresenceScore: number;
  reviewCountScore: number;
  nicheFitScore: number;
  completeIdentityScore: number;
  multipleProfilesScore: number;
  establishedSignalsScore: number;
  officialWebsitePenalty: number;
  closedPenalty: number;
  lowConfidencePenalty: number;
  duplicatePenalty: number;
  totalScore: number;
  clampedScore: number;
}

export interface LeadScoreResult {
  leadScore: number;
  leadTier: LeadTier;
  onlinePresenceScore: number;
  activityScore: number;
  breakdown: LeadScoreBreakdown;
  signals: OpportunitySignals;
}

export interface LeadOutputRecord {
  leadId: string;

  name: string;
  category: string;

  address: string;
  city: string;
  state: string;
  country: string;

  latitude: number | null;
  longitude: number | null;

  phone: string;
  phoneNormalized: string;

  website: string | null;
  hasOfficialWebsite: boolean;
  websiteMatchConfidence: ConfidenceLevel;
  websiteDetectionReason: string;

  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  youtube: string | null;

  googleMapsUrl: string | null;
  sourcePlaceId: string | null;

  rating: number | null;
  reviewCount: number | null;

  socialProfileCount: number;

  onlinePresenceScore: number;
  activityScore: number;
  leadScore: number;
  leadTier: LeadTier;

  opportunityReason: string;

  emails?: string[];
  primaryEmail?: string | null;

  scrapedAt: string;
}

export interface DiscoveryInput {
  locations: string[];
  searchQueries: string[];
  maxResultsPerQuery: number;
  language: string;
  countryCode: string;
  mapsActorId?: string;
  maxConcurrency?: number;
  requestTimeoutMs?: number;
}

export interface BusinessDiscoveryProvider {
  name: string;
  discover(input: DiscoveryInput): Promise<BusinessRecord[]>;
}

export interface SearchEnrichmentProvider {
  findBusinessProfiles(business: BusinessRecord): Promise<ProfileCandidate[]>;
  searchOfficialWebsiteCandidate(business: BusinessRecord): Promise<string | null>;
}

export interface RunSummary {
  businessesDiscovered: number;
  uniqueBusinesses: number;
  businessesWithWebsite: number;
  businessesWithoutWebsite: number;
  phoneAvailable: number;
  socialPresenceFound: number;
  qualifiedLeads: number;
  tierA: number;
  tierB: number;
  tierC: number;
  tierD: number;
  errors: number;
  startedAt: string;
  finishedAt: string;
  executionTimeMs: number;
}
