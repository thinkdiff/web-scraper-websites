import { Actor } from 'apify';
import { RunSummary, LeadOutputRecord, ActorInput } from './config/types.js';
import { parseAndValidateInput, isValidBusiness } from './utils/validation.js';
import { discoverBusinesses } from './discovery/business-discovery.js';
import { deduplicateBusinesses } from './dedupe/dedupe.js';
import { detectOfficialWebsite } from './website/website-detector.js';
import { enrichSocialProfiles } from './enrichment/social-enricher.js';
import { enrichPublicEmailFromUrl } from './enrichment/email-enricher.js';
import { HttpSearchEnricher } from './enrichment/search-enricher.js';
import { calculateLeadScore } from './scoring/lead-score.js';
import { buildLeadOutput, saveLeadsToDataset } from './storage/dataset.js';
import { saveRunSummary } from './storage/key-value-store.js';
import { appLogger } from './utils/logger.js';

await Actor.init();

const startedAt = new Date().toISOString();
const startTime = Date.now();

const summary: RunSummary = {
  businessesDiscovered: 0,
  uniqueBusinesses: 0,
  businessesWithWebsite: 0,
  businessesWithoutWebsite: 0,
  phoneAvailable: 0,
  socialPresenceFound: 0,
  qualifiedLeads: 0,
  tierA: 0,
  tierB: 0,
  tierC: 0,
  tierD: 0,
  errors: 0,
  startedAt,
  finishedAt: '',
  executionTimeMs: 0,
};

try {
  const rawInput = await Actor.getInput();
  const config = parseAndValidateInput(rawInput);

  appLogger.info('DISCOVERY', 'Starting QEVN Website Opportunity Lead Finder with configuration:', {
    locations: config.locations,
    searchQueries: config.searchQueries,
    maxResultsPerQuery: config.maxResultsPerQuery,
    websiteFilter: config.websiteFilter,
    requirePhone: config.requirePhone,
    minimumLeadScore: config.minimumLeadScore,
  });

  // Stage 1: Discovery
  const rawBusinesses = await discoverBusinesses(config);
  summary.businessesDiscovered = rawBusinesses.length;

  if (rawBusinesses.length === 0) {
    appLogger.warn('DISCOVERY', 'No businesses discovered matching queries and locations.');
  }

  // Stage 2: Deduplication
  const uniqueBusinesses = deduplicateBusinesses(rawBusinesses);
  summary.uniqueBusinesses = uniqueBusinesses.length;

  // Initialize search provider if enabled
  const searchProvider = config.searchEngineEnrichment
    ? new HttpSearchEnricher(Math.min(config.requestTimeoutMs || 10000, 10000))
    : undefined;

  const qualifiedLeads: LeadOutputRecord[] = [];

  // Stage 3: Processing & Qualification Loop
  const concurrency = config.maxConcurrency || 5;

  for (let i = 0; i < uniqueBusinesses.length; i += concurrency) {
    const chunk = uniqueBusinesses.slice(i, i + concurrency);

    await Promise.all(
      chunk.map(async (business) => {
        try {
          // Pre-filter validation
          if (!isValidBusiness(business, config)) {
            return;
          }

          if (business.phone && business.phone.trim().length > 0) {
            summary.phoneAvailable++;
          }

          // Step 1: Website Detection
          const websiteResult = await detectOfficialWebsite(business, config, searchProvider);

          if (websiteResult.hasOfficialWebsite) {
            summary.businessesWithWebsite++;
          } else {
            summary.businessesWithoutWebsite++;
          }

          // Apply Website Filter
          if (config.websiteFilter === 'WITHOUT_WEBSITE' && websiteResult.hasOfficialWebsite) {
            appLogger.debug('WEBSITE', `Skipping "${business.name}" because official website was detected: ${websiteResult.website}`);
            return;
          }

          if (config.websiteFilter === 'WITH_WEBSITE' && !websiteResult.hasOfficialWebsite) {
            appLogger.debug('WEBSITE', `Skipping "${business.name}" because no official website was detected`);
            return;
          }

          // Step 2: Social Presence Enrichment
          let additionalSocialCandidates: any[] = [];
          if (config.enrichSocialProfiles && config.searchEngineEnrichment && searchProvider) {
            try {
              additionalSocialCandidates = await searchProvider.findBusinessProfiles(business);
            } catch (err) {
              appLogger.debug('ENRICH', `Social search failed for ${business.name}`, err);
            }
          }

          const socialEnrichment = enrichSocialProfiles(business, additionalSocialCandidates);
          if (socialEnrichment.socialProfileCount > 0) {
            summary.socialPresenceFound++;
          }

          // Step 3: Optional Email Enrichment
          let emailResult;
          if (config.enrichEmails && websiteResult.website) {
            try {
              emailResult = await enrichPublicEmailFromUrl(websiteResult.website);
            } catch {
              // Ignore email fetch failures
            }
          }

          // Step 4: Lead Scoring & Qualification
          const scoreResult = calculateLeadScore({
            business,
            websiteResult,
            enrichment: socialEnrichment,
          });

          // Check Minimum Lead Score Threshold
          if (scoreResult.leadScore < (config.minimumLeadScore ?? 60)) {
            appLogger.debug('SCORE', `Lead "${business.name}" score ${scoreResult.leadScore} below minimum threshold ${config.minimumLeadScore}`);
            return;
          }

          // Step 5: Format Lead Record
          const lead = buildLeadOutput({
            business,
            websiteResult,
            enrichment: socialEnrichment,
            scoreResult,
            emailResult,
            defaultCountry: config.countryCode,
          });

          qualifiedLeads.push(lead);

          // Update Tier Metrics
          if (lead.leadTier === 'A') summary.tierA++;
          else if (lead.leadTier === 'B') summary.tierB++;
          else if (lead.leadTier === 'C') summary.tierC++;
          else summary.tierD++;

          appLogger.info('SCORE', `Qualified Lead: "${lead.name}" (${lead.category}) | Score: ${lead.leadScore} | Tier: ${lead.leadTier} | Phone: ${lead.phoneNormalized}`);
        } catch (itemError) {
          summary.errors++;
          appLogger.error('ERROR', `Error processing business "${business.name}"`, itemError);
        }
      })
    );
  }

  // Stage 4: Output Dataset
  summary.qualifiedLeads = qualifiedLeads.length;
  await saveLeadsToDataset(qualifiedLeads);

  // Finalize Summary Metrics
  summary.finishedAt = new Date().toISOString();
  summary.executionTimeMs = Date.now() - startTime;

  appLogger.info('SUMMARY', '==================================================');
  appLogger.info('SUMMARY', '           RUN EXECUTION SUMMARY                 ');
  appLogger.info('SUMMARY', '==================================================');
  appLogger.info('SUMMARY', `Businesses discovered:    ${summary.businessesDiscovered}`);
  appLogger.info('SUMMARY', `Unique businesses:        ${summary.uniqueBusinesses}`);
  appLogger.info('SUMMARY', `With official website:    ${summary.businessesWithWebsite}`);
  appLogger.info('SUMMARY', `Without official website: ${summary.businessesWithoutWebsite}`);
  appLogger.info('SUMMARY', `Phone available:          ${summary.phoneAvailable}`);
  appLogger.info('SUMMARY', `Social presence found:    ${summary.socialPresenceFound}`);
  appLogger.info('SUMMARY', `Qualified leads saved:    ${summary.qualifiedLeads}`);
  appLogger.info('SUMMARY', `  - Tier A (80-100):      ${summary.tierA}`);
  appLogger.info('SUMMARY', `  - Tier B (65-79):       ${summary.tierB}`);
  appLogger.info('SUMMARY', `  - Tier C (50-64):       ${summary.tierC}`);
  appLogger.info('SUMMARY', `  - Tier D (<50):         ${summary.tierD}`);
  appLogger.info('SUMMARY', `Processing errors:        ${summary.errors}`);
  appLogger.info('SUMMARY', `Execution time:           ${(summary.executionTimeMs / 1000).toFixed(2)}s`);
  appLogger.info('SUMMARY', '==================================================');

  await saveRunSummary(summary);
} catch (error) {
  appLogger.error('ERROR', 'Fatal Actor execution failure', error);
  throw error;
} finally {
  await Actor.exit();
}
