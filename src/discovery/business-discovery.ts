import { ActorInput, BusinessRecord, DiscoveryInput } from '../config/types.js';
import { createDiscoveryProvider } from './maps-provider.js';
import { appLogger } from '../utils/logger.js';

export async function discoverBusinesses(config: ActorInput): Promise<BusinessRecord[]> {
  const provider = createDiscoveryProvider(config.discoveryProvider);
  appLogger.info('DISCOVERY', `Using discovery provider: ${provider.name}`);

  const discoveryInput: DiscoveryInput = {
    locations: config.locations,
    searchQueries: config.searchQueries,
    maxResultsPerQuery: config.maxResultsPerQuery || 50,
    language: config.language || 'en',
    countryCode: config.countryCode || 'IN',
    mapsActorId: config.mapsActorId,
    maxConcurrency: config.maxConcurrency,
    requestTimeoutMs: config.requestTimeoutMs,
  };

  try {
    const records = await provider.discover(discoveryInput);
    appLogger.info('DISCOVERY', `Discovery completed. Discovered ${records.length} businesses.`);
    return records;
  } catch (err) {
    appLogger.warn('DISCOVERY', 'Primary discovery provider failed. Attempting fallback discovery...', err);
    // If external actor fails (e.g. running locally without Apify token), try fallback provider
    if (provider.name !== 'DirectFallbackDiscovery') {
      const fallback = createDiscoveryProvider('direct_fallback');
      return await fallback.discover(discoveryInput);
    }
    throw err;
  }
}
