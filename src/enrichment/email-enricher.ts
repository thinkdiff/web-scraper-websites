import * as cheerio from 'cheerio';
import { EmailEnrichmentResult } from '../config/types.js';
import { withTimeout } from '../utils/retry.js';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const JUNK_EMAIL_DOMAINS = new Set([
  'example.com',
  'domain.com',
  'email.com',
  'test.com',
  'sentry.io',
  'wixpress.com',
  'schema.org',
  'w3.org',
]);

const JUNK_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'css', 'js', 'json']);

/**
 * Clean and filter candidate emails
 */
export function extractValidEmailsFromHtml(html: string): string[] {
  const matches = html.match(EMAIL_REGEX) || [];
  const uniqueEmails = new Set<string>();

  for (const raw of matches) {
    const email = raw.toLowerCase().trim();
    const parts = email.split('@');
    if (parts.length !== 2) continue;

    const [user, domain] = parts;
    if (user.length < 2 || domain.length < 4) continue;

    // Check domain junk
    if (JUNK_EMAIL_DOMAINS.has(domain)) continue;

    // Filter file extensions in emails (e.g. image@2x.png)
    const tld = domain.split('.').pop() || '';
    if (JUNK_EXTENSIONS.has(tld)) continue;

    uniqueEmails.add(email);
  }

  return Array.from(uniqueEmails);
}

/**
 * Fetch and extract emails from a public page
 */
export async function enrichPublicEmailFromUrl(
  url: string,
  timeoutMs: number = 8000
): Promise<EmailEnrichmentResult> {
  try {
    const response = await withTimeout(
      fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      }),
      timeoutMs,
      `Email extraction fetch for ${url}`
    );

    if (!response.ok) {
      return { emails: [], primaryEmail: null };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Look for mailto: links first
    const mailtoEmails: string[] = [];
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const email = href.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
      if (email && email.includes('@')) {
        mailtoEmails.push(email);
      }
    });

    const textEmails = extractValidEmailsFromHtml(html);
    const combined = Array.from(new Set([...mailtoEmails, ...textEmails]));

    return {
      emails: combined,
      primaryEmail: combined.length > 0 ? combined[0] : null,
      emailSource: url,
    };
  } catch {
    return { emails: [], primaryEmail: null };
  }
}
