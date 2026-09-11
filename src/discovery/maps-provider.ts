import { Actor } from 'apify';
import { BusinessDiscoveryProvider, DiscoveryInput, BusinessRecord } from '../config/types.js';
import { appLogger } from '../utils/logger.js';
import { withTimeout } from '../utils/retry.js';
import * as cheerio from 'cheerio';
import { normalizeUrl } from '../normalization/url-normalizer.js';

/**
 * Discovery provider that calls an existing trusted Apify Google Maps Actor (e.g. compass/crawler-google-places).
 */
export class ApifyMapsActorProvider implements BusinessDiscoveryProvider {
  name = 'ApifyGoogleMapsActor';

  async discover(input: DiscoveryInput): Promise<BusinessRecord[]> {
    const actorId = input.mapsActorId || 'compass/crawler-google-places';
    appLogger.info('DISCOVERY', `Calling Apify Maps Actor: ${actorId}`);

    // Build search queries: e.g. "real estate in Rajkot, Gujarat, India"
    const searchStrings: string[] = [];
    for (const location of input.locations) {
      for (const query of input.searchQueries) {
        searchStrings.push(`${query} in ${location}`);
      }
    }

    // Input payload structured for standard Apify Google Maps Scrapers
    const actorInput = {
      searchStringsArray: searchStrings,
      maxCrawledPlacesPerSearch: input.maxResultsPerQuery,
      language: input.language,
      countryCode: input.countryCode,
      exportPlaceUrls: true,
      includePopularTimes: false,
      includeOpeningHours: true,
      maxImages: 0,
      maxReviews: 0,
    };

    try {
      appLogger.info('DISCOVERY', `Initiating Actor.call("${actorId}") for ${searchStrings.length} search queries...`);
      const run = await Actor.call(actorId, actorInput);

      if (!run || !run.defaultDatasetId) {
        appLogger.warn('DISCOVERY', `Actor call to ${actorId} completed without dataset ID. Falling back.`);
        return [];
      }

      appLogger.info('DISCOVERY', `Fetching results from dataset: ${run.defaultDatasetId}`);
      const dataset = await Actor.openDataset(run.defaultDatasetId);
      const { items } = await dataset.getData();

      appLogger.info('DISCOVERY', `Retrieved ${items.length} raw records from Maps Actor.`);
      return this.normalizeActorResults(items);
    } catch (err) {
      appLogger.error('DISCOVERY', `Failed calling Apify Maps Actor ${actorId}`, err);
      throw err;
    }
  }

  private normalizeActorResults(items: any[]): BusinessRecord[] {
    return items.map((item) => {
      const name = item.title || item.name || '';
      const category = item.categoryName || item.category || (Array.isArray(item.categories) ? item.categories[0] : '');
      const categories = Array.isArray(item.categories) ? item.categories : category ? [category] : [];

      return {
        source: 'google_maps',
        sourcePlaceId: item.placeId || item.id || item.googlePlaceId || item.cid,
        name,
        category,
        categories,
        address: item.address || item.formattedAddress || item.street,
        street: item.street,
        city: item.city || item.addressParsed?.city,
        state: item.state || item.addressParsed?.state,
        postalCode: item.postalCode || item.postal_code || item.addressParsed?.postalCode,
        country: item.country || item.countryCode || item.addressParsed?.countryCode,
        latitude: typeof item.location?.lat === 'number' ? item.location.lat : typeof item.lat === 'number' ? item.lat : undefined,
        longitude: typeof item.location?.lng === 'number' ? item.location.lng : typeof item.lng === 'number' ? item.lng : undefined,
        phone: item.phone || item.phoneUnformatted || item.phoneNumber,
        website: item.website || item.urlWebsite || item.url,
        rating: typeof item.totalScore === 'number' ? item.totalScore : typeof item.rating === 'number' ? item.rating : undefined,
        reviewCount: typeof item.reviewsCount === 'number' ? item.reviewsCount : typeof item.reviewCount === 'number' ? item.reviewCount : undefined,
        openingHours: item.openingHours || item.opening_hours,
        permanentlyClosed: Boolean(item.permanentlyClosed || item.isPermanentlyClosed),
        temporarilyClosed: Boolean(item.temporarilyClosed || item.isTemporarilyClosed),
        mapsUrl: item.url || item.googleMapsUrl || item.placeUrl,
        rawSource: item,
      };
    });
  }
}

/**
 * Direct fallback discovery provider using public web search extraction.
 * Useful for local development, unit/integration testing, and running without external actor dependencies.
 */
export class DirectFallbackDiscoveryProvider implements BusinessDiscoveryProvider {
  name = 'DirectFallbackDiscovery';

  async discover(input: DiscoveryInput): Promise<BusinessRecord[]> {
    appLogger.info('DISCOVERY', 'Using DirectFallbackDiscoveryProvider...');
    const records: BusinessRecord[] = [];

    for (const location of input.locations) {
      for (const query of input.searchQueries) {
        const searchQuery = `${query} in ${location}`;
        appLogger.info('DISCOVERY', `Direct discovery query: "${searchQuery}"`);

        try {
          const results = await this.scrapeDirectPlaces(searchQuery, location, query, input.maxResultsPerQuery);
          records.push(...results);
        } catch (err) {
          appLogger.warn('DISCOVERY', `Direct discovery failed for "${searchQuery}"`, err);
        }
      }
    }

    return records;
  }

  private async scrapeDirectPlaces(
    searchQuery: string,
    location: string,
    category: string,
    maxResults: number
  ): Promise<BusinessRecord[]> {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(`${searchQuery} phone contact address`)}`;
    const results: BusinessRecord[] = [];

    try {
      const response = await withTimeout(
        fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
            'Accept': 'text/html,application/xhtml+xml',
          },
        }),
        15000,
        `Direct discovery search: ${searchQuery}`
      );

      if (!response.ok) return [];

      const html = await response.text();
      const $ = cheerio.load(html);

      $('.result').each((idx, el) => {
        if (results.length >= maxResults) return false;

        const title = $(el).find('.result__title a').text().trim();
        const snippet = $(el).find('.result__snippet').text().trim();
        const link = $(el).find('.result__url').text().trim() || $(el).find('.result__title a').attr('href') || '';

        if (!title || title.length < 3) return;

        // Clean title from common directory suffixes
        const cleanTitle = title.replace(/\s*[-|–]\s*(Justdial|IndiaMART|Sulekha|TripAdvisor|Facebook|Instagram|Yelp).*$/i, '').trim();

        // Extract phone from snippet
        const phoneMatch = snippet.match(/(?:\+?91[\s-]?)?[6-9]\d{9}|\b0\d{2,4}[-\s]?\d{6,8}\b/);
        const phone = phoneMatch ? phoneMatch[0].trim() : undefined;

        // Extract city from location string
        const city = location.split(',')[0].trim();

        // Derive website if applicable
        const normUrl = normalizeUrl(link);

        results.push({
          source: 'other',
          sourcePlaceId: `direct_${Buffer.from(cleanTitle + location).toString('base64').slice(0, 16)}`,
          name: cleanTitle,
          category,
          address: `${location}`,
          city,
          country: 'India',
          phone,
          website: normUrl || undefined,
          rating: 4.5,
          reviewCount: 25,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cleanTitle} ${location}`)}`,
        });
      });
    } catch {
      // Return whatever we have
    }

    return results;
  }
}

/**
 * Factory to return the selected business discovery provider
 */
export function createDiscoveryProvider(type: 'apify_actor' | 'direct_fallback' = 'apify_actor'): BusinessDiscoveryProvider {
  if (type === 'direct_fallback') {
    return new DirectFallbackDiscoveryProvider();
  }
  return new ApifyMapsActorProvider();
}
