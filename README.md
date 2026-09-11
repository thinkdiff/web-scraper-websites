# QEVN Website Opportunity Lead Finder — Apify Custom Actor

A production-grade Apify Actor in TypeScript that discovers and qualifies local businesses as high-converting website-development outreach prospects.

Unlike generic map scrapers, **QEVN Website Opportunity Lead Finder** prioritizes **lead qualification over raw scraping volume**. It identifies businesses with verified public phone numbers, active online presence (social profiles, reviews, photos), but **no credible official website**.

---

## Architecture Pipeline

```text
INPUT (Locations, Niches, Filters, Scoring Thresholds)
  ↓
BUSINESS DISCOVERY (Modular Provider: Apify Actor / Direct Fallback)
  ↓
NORMALIZATION (Business Names, Phone E.164, Addresses, Categories)
  ↓
DEDUPLICATION (Place ID -> Name + Phone -> Name + Address + City)
  ↓
WEBSITE DETECTION (Official vs Social / Directory / Marketplace / Booking)
  ↓
ONLINE PRESENCE ENRICHMENT (Instagram, Facebook, LinkedIn, YouTube, X, Pinterest)
  ↓
CONTACT ENRICHMENT (Public Phone Numbers, Safe Public Business Emails)
  ↓
LEAD SCORING & TIERING (Deterministic 0–100, Tier A / B / C / D)
  ↓
QUALIFICATION & FACTUAL REASON GENERATION
  ↓
APIFY DATASET (Flat CRM-ready JSON/CSV) & KEY-VALUE STORE SUMMARY
```

---

## Project Structure

```text
.
├── .actor/
│   ├── actor.json                  # Apify Actor manifest
│   └── input_schema.json           # Comprehensive Apify input schema
├── src/
│   ├── main.ts                     # Pipeline orchestration & lifecycle
│   ├── config/
│   │   ├── types.ts                # Strict TypeScript interfaces & types
│   │   └── defaults.ts             # Default configs, domain registries, scoring weights
│   ├── discovery/
│   │   ├── business-discovery.ts   # Discovery coordinator
│   │   └── maps-provider.ts        # Apify Maps Actor & Direct Fallback providers
│   ├── website/
│   │   ├── domain-classifier.ts    # Classifies domains (Social, Directory, Booking, etc.)
│   │   ├── website-matcher.ts      # Heuristic token & city matching
│   │   └── website-detector.ts     # Multi-signal verification & redirect handling
│   ├── enrichment/
│   │   ├── social-enricher.ts      # Confidence-based social profile matching
│   │   ├── email-enricher.ts       # Ethical public-only email extraction
│   │   └── search-enricher.ts      # Targeted public search verification
│   ├── scoring/
│   │   ├── lead-score.ts           # Deterministic 0–100 scoring & tiering
│   │   └── opportunity-reason.ts   # Factual opportunity justification
│   ├── normalization/
│   │   ├── business-normalizer.ts  # Suffix stripping and text canonicalization
│   │   ├── phone-normalizer.ts     # Phone cleaning & E.164 normalization
│   │   └── url-normalizer.ts       # URL canonicalization & domain extraction
│   ├── dedupe/
│   │   └── dedupe.ts               # Multi-stage deduplicator
│   ├── storage/
│   │   ├── dataset.ts              # Flat CRM-ready dataset record builder
│   │   └── key-value-store.ts      # Run summary metrics persistence
│   └── utils/
│       ├── logger.ts               # Tagged structured logger
│       ├── retry.ts                # Exponential backoff & timeout utility
│       └── validation.ts           # Zod schema & data quality checks
├── tests/
│   ├── fixtures/
│   │   └── businesses.ts           # Realistic test fixtures
│   ├── business-normalizer.test.ts # Name & address normalization tests
│   ├── domain-classifier.test.ts   # URL & platform classification tests
│   ├── dedupe.test.ts              # Deduplication engine tests
│   ├── lead-score.test.ts          # Scoring & tier assignment tests
│   ├── opportunity-reason.test.ts  # Factual evidence generator tests
│   ├── phone-normalizer.test.ts    # Phone E.164 normalization tests
│   ├── social-enricher.test.ts     # Social matching & confidence tests
│   └── website-detector.test.ts    # Website vs social/directory detection tests
├── Dockerfile                      # Production container build
├── package.json
├── tsconfig.json
└── README.md
```

---

## Setup & Installation

### Requirements
- **Node.js**: >= 20.0.0
- **NPM**: >= 10.0.0

### Install Dependencies
```bash
npm install
```

### Run Tests
```bash
npm test
```

### Build TypeScript
```bash
npm run build
```

---

## Running Locally

To run locally with the Apify SDK:

1. Create or edit `storage/key_value_stores/default/INPUT.json`:

```json
{
  "locations": ["Rajkot, Gujarat, India"],
  "searchQueries": ["real estate", "jewellery", "boutique"],
  "maxResultsPerQuery": 20,
  "websiteFilter": "WITHOUT_WEBSITE",
  "requirePhone": true,
  "enrichSocialProfiles": true,
  "enrichEmails": false,
  "searchEngineEnrichment": true,
  "minimumLeadScore": 60,
  "discoveryProvider": "direct_fallback",
  "countryCode": "IN"
}
```

2. Run the Actor:
```bash
npm start
```

3. View results:
- Results dataset: `storage/datasets/default/`
- Execution summary: `storage/key_value_stores/default/OUTPUT.json`

---

## Deploying to Apify

### Option A: Using Apify CLI
1. Install Apify CLI globally:
   ```bash
   npm install -g apify-cli
   ```
2. Log in to your Apify account:
   ```bash
   apify login
   ```
3. Push and deploy the Actor:
   ```bash
   apify push
   ```

### Option B: Deploy from GitHub Repository
1. Link your GitHub repository in the Apify Console under **Actors** > **Create new** > **Link Git repository**.
2. Configure environment variable `APIFY_TOKEN` if required.
3. Build and Run directly from the Apify Web Console.

---

## Input Schema Reference

| Parameter | Type | Default | Description |
|---|---|---|---|
| `locations` | `array` | `["Rajkot, Gujarat, India"]` | Target cities or regions |
| `searchQueries` | `array` | `["real estate", "jewellery", "boutique"]` | Target business categories |
| `maxResultsPerQuery` | `integer` | `50` | Max discovery records per query |
| `websiteFilter` | `enum` | `"WITHOUT_WEBSITE"` | Filter: `WITHOUT_WEBSITE`, `WITH_WEBSITE`, `ALL` |
| `requirePhone` | `boolean` | `true` | Exclude listings missing phone numbers |
| `enrichSocialProfiles` | `boolean` | `true` | Discover public Instagram, Facebook, LinkedIn, YouTube |
| `enrichEmails` | `boolean` | `false` | Extract safe public business emails |
| `searchEngineEnrichment` | `boolean` | `true` | Targeted web verification searches |
| `minimumLeadScore` | `integer` | `60` | Minimum score threshold (0–100) |
| `countryCode` | `string` | `"IN"` | Country code for phone formatting (E.164) |
| `excludeClosedBusinesses` | `boolean` | `true` | Filter out closed businesses |
| `maxConcurrency` | `integer` | `5` | Concurrent enrichment requests |
| `requestTimeoutMs` | `integer` | `30000` | Network request timeout in ms |
| `discoveryProvider` | `enum` | `"apify_actor"` | `"apify_actor"` or `"direct_fallback"` |
| `mapsActorId` | `string` | `"compass/crawler-google-places"` | Apify Google Maps Actor ID to call |

---

## Lead Scoring & Tiering System

Deterministic scoring (0–100):

| Signal | Points | Condition |
|---|---|---|
| No official website | `+25` | Listing has no official standalone domain |
| Public phone available | `+20` | Verified phone number present |
| Social media presence | `+15` | Matched Instagram, Facebook, LinkedIn, etc. |
| 20+ Google reviews | `+10` | Moderate social proof |
| 100+ Google reviews | `+10` | Strong commercial traction |
| High-value niche match | `+10` | Real estate, Jewellery, Boutique, Clinic, etc. |
| Complete identity | `+10` | Name + Address + City + Phone + Category |
| Multiple online profiles | `+5` | 2+ social profiles verified |
| Established signals | `+5` | Rating >= 4.0★ with reviews |
| **Official website detected** | `-30` | Existing website penalty |
| **Permanently/temporarily closed** | `-20` | Closed business penalty |
| **Low confidence match** | `-15` | Ambiguous profile penalty |
| **Duplicate** | `-10` | Duplicate listing penalty |

### Tiers
- **Tier A** (80–100): Highest-priority prospects. Real, active businesses with strong reviews, public phone, verified social presence, but no website.
- **Tier B** (65–79): Strong prospects. Active with phone and reviews.
- **Tier C** (50–64): Viable prospects with moderate signals.
- **Tier D** (<50): Disqualified / low potential.

---

## Output Dataset Schema

Each lead is saved as a flat record:

```json
{
  "leadId": "place_rajput_jewellers_001",
  "name": "Rajput Jewellers",
  "category": "Jewellery Showroom",
  "address": "Dr. Yagnik Road, Jagnath Plot",
  "city": "Rajkot",
  "state": "Gujarat",
  "country": "India",
  "latitude": 22.298,
  "longitude": 70.798,
  "phone": "098250 12345",
  "phoneNormalized": "+919825012345",
  "website": null,
  "hasOfficialWebsite": false,
  "websiteMatchConfidence": "high",
  "websiteDetectionReason": "No official website found across Maps listing and public search verification",
  "instagram": "https://instagram.com/rajputjewellersrajkot",
  "facebook": "https://facebook.com/rajputjewellers",
  "linkedin": null,
  "youtube": null,
  "googleMapsUrl": "https://maps.google.com/?cid=1001",
  "sourcePlaceId": "place_rajput_jewellers_001",
  "rating": 4.8,
  "reviewCount": 128,
  "socialProfileCount": 2,
  "onlinePresenceScore": 55,
  "activityScore": 90,
  "leadScore": 95,
  "leadTier": "A",
  "opportunityReason": "No official website detected. 128 Google reviews (4.8★ rating). Public business phone available. Instagram + Facebook presence verified. Active in Jewellery Showroom niche in Rajkot. Rated Tier A (95/100 score).",
  "scrapedAt": "2026-09-11T09:45:00.000Z"
}
```

---

## Key-Value Store Run Summary

Written to Key-Value Store `OUTPUT` and `RUN_SUMMARY`:

```json
{
  "businessesDiscovered": 310,
  "uniqueBusinesses": 267,
  "businessesWithWebsite": 141,
  "businessesWithoutWebsite": 126,
  "phoneAvailable": 118,
  "socialPresenceFound": 96,
  "qualifiedLeads": 84,
  "tierA": 19,
  "tierB": 37,
  "tierC": 28,
  "tierD": 0,
  "errors": 0,
  "startedAt": "2026-09-11T09:30:00.000Z",
  "finishedAt": "2026-09-11T09:32:15.000Z",
  "executionTimeMs": 135000
}
```

---

## License
Apache-2.0
