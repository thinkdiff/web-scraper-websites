import * as cheerio from 'cheerio';
import {
  BusinessRecord,
  ProfileCandidate,
  SearchEnrichmentProvider,
} from '../config/types.js';
import { normalizeUrl, extractHostname } from '../normalization/url-normalizer.js';
import { classifyDomain } from '../website/domain-classifier.js';
import { evaluateSocialProfileConfidence } from './social-enricher.js';
import { withTimeout } from '../utils/retry.js';
import { appLogger } from '../utils/logger.js';

export class HttpSearchEnricher implements SearchEnrichmentProvider {
  private timeoutMs: number;

  constructor(timeoutMs: number = 10000) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Search for public social profiles belonging to this business using targeted public search
   */
  async findBusinessProfiles(business: BusinessRecord): Promise<ProfileCandidate[]> {
    const candidates: ProfileCandidate[] = [];
    const query = `"${business.name}" "${business.city || ''}" instagram facebook linkedin`;

    try {
      const urls = await this.querySearchEngine(query);

      for (const rawUrl of urls) {
        const normUrl = normalizeUrl(rawUrl);
        if (!normUrl) continue;

        const classification = classifyDomain(normUrl);
        if (classification.isSocial && classification.platformName) {
          const platform = classification.platformName as ProfileCandidate['platform'];
          const evalResult = evaluateSocialProfileConfidence(normUrl, business, platform);

          if (evalResult.confidence !== 'none') {
            candidates.push({
              platform,
              url: normUrl,
              confidence: evalResult.confidence,
              reason: evalResult.reason,
              handle: evalResult.handle,
            });
          }
        }
      }
    } catch (err) {
      appLogger.debug('ENRICH', `Search profile enrichment skipped for ${business.name}`, err);
    }

    return candidates;
  }

  /**
   * Search for an official website candidate for this business
   */
  async searchOfficialWebsiteCandidate(business: BusinessRecord): Promise<string | null> {
    const query = `"${business.name}" "${business.city || ''}" official website`;

    try {
      const urls = await this.querySearchEngine(query);

      for (const rawUrl of urls) {
        const normUrl = normalizeUrl(rawUrl);
        if (!normUrl) continue;

        const classification = classifyDomain(normUrl);
        // Only interested if it's an official standalone website candidate
        if (classification.isOfficialCandidate) {
          return normUrl;
        }
      }
    } catch (err) {
      appLogger.debug('WEBSITE', `Website candidate search skipped for ${business.name}`, err);
    }

    return null;
  }

  /**
   * Execute lightweight public search query using DuckDuckGo HTML Lite (no cookies/JS needed)
   */
  private async querySearchEngine(query: string): Promise<string[]> {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    try {
      const response = await withTimeout(
        fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        }),
        this.timeoutMs,
        `Search query: ${query}`
      );

      if (!response.ok) {
        return [];
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const results: string[] = [];

      // DuckDuckGo HTML results selectors
      $('.result__url, .result__snippet, a.result__url, .results_links a').each((_, el) => {
        let href = $(el).attr('href') || $(el).text() || '';

        // DuckDuckGo redirect link extraction: /l/?uddg=https%3A%2F%2F...
        if (href.includes('uddg=')) {
          try {
            const uddgMatch = href.match(/uddg=([^&]+)/);
            if (uddgMatch && uddgMatch[1]) {
              href = decodeURIComponent(uddgMatch[1]);
            }
          } catch {
            // ignore decode error
          }
        }

        const normalized = normalizeUrl(href);
        if (normalized) {
          const hostname = extractHostname(normalized);
          // Filter out duckduckgo and search engines
          if (hostname && !hostname.includes('duckduckgo.com') && !hostname.includes('google.com')) {
            results.push(normalized);
          }
        }
      });

      return Array.from(new Set(results)).slice(0, 10);
    } catch {
      return [];
    }
  }
}
