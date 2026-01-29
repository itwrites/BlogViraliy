# Blog Autopilot - Automation & Scheduling Architecture

This document details the automated content generation system, scheduled publishing, and all background job infrastructure.

---

## Table of Contents

1. [Overview](#overview)
2. [Cron Job Schedulers](#cron-job-schedulers)
3. [Content Generation Flows](#content-generation-flows)
4. [Scheduled Publishing System](#scheduled-publishing-system)
5. [Catch-Up Generation Failsafe](#catch-up-generation-failsafe)
6. [Photo Retry & Image Handling](#photo-retry--image-handling)
7. [Idempotency & Atomic Operations](#idempotency--atomic-operations)
8. [Error Handling & Recovery](#error-handling--recovery)

---

## Overview

Blog Autopilot uses `node-cron` to run background automation tasks. All schedulers are initialized in `server/automation.ts` via `startAutomationSchedulers()` which is called on server startup.

**Key Design Principles:**
- **Atomic Operations**: All generation processes use locking mechanisms to prevent duplicate execution
- **Failsafe Recovery**: Catch-up jobs detect and complete interrupted operations
- **Idempotency Guards**: Database flags prevent double-processing of payments/subscriptions
- **Graceful Degradation**: Errors in one site don't block processing of others

---

## Cron Job Schedulers

All schedulers are registered in `server/automation.ts`:

| Job Name | Schedule | Cron Expression | Description |
|----------|----------|-----------------|-------------|
| **AI Content Generation** | Every 8 hours | `0 */8 * * *` | Generates articles from configured keywords |
| **RSS Feed Processing** | Every 6 hours | `0 */6 * * *` | Rewrites RSS feed content as unique articles |
| **Keyword Batch Processing** | Every minute | `* * * * *` | Processes queued keyword generation jobs |
| **Pillar Content Generation** | Every minute | `* * * * *` | Generates topical authority pillar articles |
| **Scheduled Publishing** | Every minute | `* * * * *` | Publishes draft posts with past scheduled dates |
| **Catch-Up Generation** | Every 2 minutes | `*/2 * * * *` | Recovers interrupted paid-user article generation |

### Scheduler Implementation

```typescript
export function startAutomationSchedulers() {
  cron.schedule("0 */8 * * *", processAIAutomation);     // AI generation
  cron.schedule("0 */6 * * *", processRSSAutomation);    // RSS rewriting
  cron.schedule("* * * * *", processKeywordBatches);     // Keyword batches
  cron.schedule("* * * * *", processPillarGeneration);   // Pillar articles
  cron.schedule("* * * * *", publishScheduledPosts);     // Scheduled publishing
  cron.schedule("*/2 * * * *", processCatchupGeneration);// Catch-up failsafe
  console.log("[Automation] Schedulers started");
}
```

---

## Content Generation Flows

### 1. Initial Article Generation (Post-Onboarding)

**Trigger**: Site completes onboarding with a Business Profile  
**File**: `server/initial-article-generator.ts`

**Flow:**
1. Onboarding completes → triggers `generateInitialArticlesForSite(siteId)`
2. Generates 4 starter articles (mini-pillar cluster):
   - 1 comprehensive pillar article
   - 3 supporting cluster articles
3. For free users: 2 articles unlocked, 2 locked as paywall preview
4. For paid users: All 4 articles unlocked

**Lock Mechanism:**
```typescript
const generationLocks = new Set<string>();

export function isGenerating(siteId: string): boolean {
  return generationLocks.has(siteId);
}
```

### 2. Monthly Content Engine (Subscription-Based)

**Trigger**: Stripe `invoice.paid` webhook OR first subscription payment  
**File**: `server/monthly-content-engine.ts`

**Plan Quotas:**
| Plan | Monthly Articles | Sites Allowed |
|------|-----------------|---------------|
| Launch | 30 | 1 |
| Growth | 120 | 3 |
| Scale | 500 | 10 |

**Flow:**
1. Payment webhook → `triggerMonthlyContentGeneration(ownerId)`
2. For multi-site plans: User allocates quota across sites via UI modal
3. For each site's allocation:
   - Creates content pillars (1 per ~25 articles)
   - Generates cluster articles with role distribution
   - Schedules publish dates across the month
4. Articles created with `scheduledPublishDate` for drip release

**Topic Rotation:**
- `currentTopicIndex` tracks which pillar topic to use next
- Prevents repetition across consecutive months
- Rotates through business-relevant topics

### 3. AI Keyword Automation

**Trigger**: Every 8 hours (configurable per site)  
**File**: `server/automation.ts` → `processAIAutomation()`

**Requirements:**
- Site must have valid Business Profile
- AI Config must be enabled with keywords
- At least one keyword in the rotation list

**Flow:**
1. Iterates through all sites with enabled AI config
2. Selects next keyword from rotation (via `lastKeywordIndex`)
3. Generates article with business context injection
4. Rotates to next keyword for future runs

### 4. Keyword Batch Generation

**Trigger**: Every minute (processes pending queue)  
**File**: `server/automation.ts` → `processKeywordBatches()`

**Flow:**
1. User submits batch of keywords via UI
2. Keywords stored as "pending" in database
3. Every minute, cron picks next pending batch
4. Generates 1-3 articles per batch run (rate limited)
5. Updates batch status: `pending` → `processing` → `completed`

### 5. RSS Feed Rewriting

**Trigger**: Every 6 hours  
**File**: `server/automation.ts` → `processRSSAutomation()`

**Requirements:**
- Site must have valid Business Profile
- RSS Config must be enabled with feed URLs
- Feed must return valid RSS/Atom entries

**Flow:**
1. Fetches latest RSS entries from configured feeds
2. Checks for already-processed URLs (deduplication)
3. Rewrites each article using AI for uniqueness
4. Injects business context for brand alignment
5. Creates posts with `source: "rss"`

### 6. Topical Authority / Pillar Generation

**Trigger**: Every minute  
**File**: `server/topical-authority.ts` → `processNextPillarArticle()`

**Flow:**
1. User creates topic pack via Topical Authority UI
2. System generates topical map with pillar + clusters
3. Cron processes one article at a time per pillar
4. Articles interlink automatically based on role structure
5. Pillar marked complete when all articles generated

**Pack Types:**
- `starter` (10 articles): 1 pillar, 3 category, 6 cluster
- `foundation` (25 articles): 1 pillar, 5 category, 19 cluster
- `authority` (50 articles): 1 pillar, 7 category, 42 cluster
- `domination` (100 articles): 1 pillar, 10 category, 89 cluster
- `custom`: User-defined distribution

---

## Scheduled Publishing System

**File**: `server/scheduled-publisher.ts`

### How It Works

1. Articles can be created with `status: "draft"` and `scheduledPublishDate`
2. Every minute, cron checks all sites for due posts
3. Posts where `scheduledPublishDate <= now` get `status` updated to `"published"`
4. Published posts immediately appear on public site

### Code Flow

```typescript
export async function publishScheduledPosts(): Promise<{
  publishedCount: number;
  errors: string[];
}> {
  const now = new Date();
  const allSites = await storage.getSites();
  
  for (const site of allSites) {
    const posts = await storage.getPostsBySiteId(site.id);
    const scheduledPosts = posts.filter(
      (post) =>
        post.status === "draft" &&
        post.scheduledPublishDate &&
        new Date(post.scheduledPublishDate) <= now
    );

    for (const post of scheduledPosts) {
      await storage.updatePost(post.id, { status: "published" });
    }
  }
}
```

### Monthly Content Scheduling

When monthly content is generated, articles are distributed across the month:

```typescript
export function calculatePublishSchedule(
  articleCount: number,
  daysInMonth: number
): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  const articlesPerDay = Math.max(1, Math.ceil(articleCount / daysInMonth));
  
  for (let i = 0; i < articleCount; i++) {
    const dayOffset = Math.floor(i / articlesPerDay);
    const publishDate = new Date(today);
    publishDate.setDate(today.getDate() + dayOffset);
    dates.push(publishDate);
  }
  return dates;
}
```

---

## Catch-Up Generation Failsafe

**File**: `server/automation.ts` → `processCatchupGeneration()`

### Purpose

Detects and recovers from interrupted article generation. If a user pays but the server restarts or generation fails mid-process, this job ensures articles are eventually created.

### Detection Logic

Users are eligible for catch-up when:
1. `subscriptionStatus === "active"` (paid)
2. `firstPaymentGenerationDone === false` (not completed)
3. `firstPaymentGenerationStarted === false` (not currently running)
4. User has at least one onboarded site

### Recovery Flow

```typescript
async function processCatchupGeneration() {
  const users = await storage.getActiveSubscriptionUsersNeedingGeneration();
  
  for (const user of users) {
    // Mark as started (prevents other instances picking it up)
    await storage.markFirstPaymentGenerationStarted(user.id);
    
    // Check if articles already exist
    const existingCount = await countExistingArticles(user.id);
    const targetCount = PLAN_LIMITS[user.plan].articles;
    
    if (existingCount >= targetCount) {
      // Already complete, just mark done
      await storage.completeFirstPaymentGeneration(user.id);
      continue;
    }
    
    // Generate remaining articles
    const result = await triggerMonthlyContentGeneration(user.id);
    
    if (result.success) {
      await storage.completeFirstPaymentGeneration(user.id);
    } else {
      // Clear started flag to allow retry on next run
      await storage.clearFirstPaymentGenerationStarted(user.id);
    }
  }
}
```

### Database Flags

| Column | Type | Purpose |
|--------|------|---------|
| `firstPaymentGenerationStarted` | boolean | Locks user during generation |
| `firstPaymentGenerationDone` | boolean | Prevents re-generation |
| `subscriptionStatus` | string | Tracks active/cancelled/past_due |

---

## Photo Retry & Image Handling

**File**: `server/pexels.ts`

### Retry Strategy

The image search implements multiple fallback layers:

```typescript
export async function searchPexelsImage(
  query: string,
  fallbackQueries?: string[],
  excludeUrls?: Set<string>
): Promise<string | null> {
  // Layer 1: Random page offset for variety
  const randomPage = Math.floor(Math.random() * 3) + 1;
  let photos = await fetchPexelsImages(apiKey, query, 15, randomPage);

  // Layer 2: Fall back to page 1 if few results
  if (photos.length < 5 && randomPage > 1) {
    photos = await fetchPexelsImages(apiKey, query, 15, 1);
  }

  // Layer 3: Try fallback queries (tags, title words, industry)
  if (photos.length < 3 && fallbackQueries?.length > 0) {
    for (const fallback of fallbackQueries) {
      const fallbackPhotos = await fetchPexelsImages(apiKey, fallback, 15, 1);
      if (fallbackPhotos.length >= 3) {
        photos = fallbackPhotos;
        break;
      }
    }
  }

  // Layer 4: Extract generic keywords (first 2 words)
  if (photos.length < 2) {
    const genericQuery = query.split(/\s+/).slice(0, 2).join(" ");
    const genericPhotos = await fetchPexelsImages(apiKey, genericQuery, 15, 1);
    if (genericPhotos.length > photos.length) {
      photos = genericPhotos;
    }
  }

  // Layer 5: Filter out already-used URLs
  if (excludeUrls?.size > 0) {
    photos = photos.filter(p => !excludeUrls.has(p.src.large2x));
  }

  // Random selection from available pool
  return photos[Math.floor(Math.random() * photos.length)]?.src.large2x || null;
}
```

### Fallback Query Examples

When generating an article about "Best React Testing Libraries 2024":

1. Primary: `"best react testing libraries 2024"`
2. Fallback 1: Tags - `["react", "javascript", "programming"]`
3. Fallback 2: Title words - `["testing", "libraries"]`
4. Fallback 3: Industry - `"software development"`
5. Fallback 4: Generic - `"computer code"`

### Missing Image Recovery

Endpoint: `POST /api/sites/:siteId/fix-missing-images`

Retroactively adds images to articles that failed initial photo lookup:

```typescript
app.post("/api/sites/:siteId/fix-missing-images", async (req, res) => {
  const posts = await storage.getPostsBySiteId(siteId);
  const postsWithoutImages = posts.filter(p => !p.imageUrl && !p.isLocked);
  
  for (const post of postsWithoutImages) {
    const fallbackQueries = [
      ...(post.tags || []),
      post.title.split(" ").slice(0, 3).join(" "),
      site.industry || "business"
    ];
    
    const imageUrl = await searchPexelsImage(post.title, fallbackQueries);
    if (imageUrl) {
      await storage.updatePost(post.id, { imageUrl });
    }
  }
});
```

---

## Idempotency & Atomic Operations

### Webhook Idempotency

All Stripe webhooks use database-level idempotency:

```typescript
// Check if already processed
const existingEvent = await storage.getStripeEvent(event.id);
if (existingEvent) {
  return res.json({ received: true, already_processed: true });
}

// Process webhook...

// Mark as processed
await storage.recordStripeEvent(event.id, event.type);
```

### Generation Locks

Prevents concurrent generation for the same site:

```typescript
const generationLocks = new Set<string>();

async function generateArticles(siteId: string) {
  if (generationLocks.has(siteId)) {
    console.log(`[Generation] Already running for ${siteId}, skipping`);
    return;
  }
  
  generationLocks.add(siteId);
  try {
    // ... generation logic
  } finally {
    generationLocks.delete(siteId);
  }
}
```

### Database Transaction Guards

Critical operations use transactional consistency:

```typescript
// Atomic: Check limit and create in one operation
const result = await storage.createPostWithLimitCheck({
  siteId,
  title,
  content,
  ...
});

if (result.error === "LIMIT_REACHED") {
  // Don't process more for this site
  return;
}
```

---

## Error Handling & Recovery

### Per-Site Error Isolation

Errors in one site don't block others:

```typescript
for (const site of sites) {
  try {
    await processAIForSite(site);
  } catch (error) {
    console.error(`[AI] Error for ${site.domain}:`, error);
    // Continue to next site
  }
}
```

### Logging Convention

All automation uses prefixed logging:

| Prefix | Component |
|--------|-----------|
| `[Automation]` | Main scheduler |
| `[AI]` | AI content generation |
| `[RSS]` | RSS feed processing |
| `[Keyword]` | Keyword batch processing |
| `[Pillar]` | Topical authority |
| `[Scheduled Publisher]` | Scheduled publishing |
| `[Catchup]` | Catch-up generation |
| `[Pexels]` | Image search |

### Retry Behavior

| Job Type | Retry Strategy |
|----------|----------------|
| AI Generation | Fails silently, retries next scheduled run |
| RSS Rewriting | Fails silently, retries next scheduled run |
| Keyword Batches | Marked as failed, can be manually retried |
| Pillar Generation | Pillar status updated, article retried next run |
| Scheduled Publishing | Retried every minute until successful |
| Catch-Up | Clears lock, retried every 2 minutes |

---

## Monitoring & Debugging

### Log Analysis

Check automation activity via server logs:

```bash
# Filter for specific component
grep "\[AI\]" logs/server.log
grep "\[Catchup\]" logs/server.log

# Check generation activity for a site
grep "site_id_here" logs/server.log
```

### Database Queries

```sql
-- Check user generation status
SELECT id, email, subscription_status, 
       first_payment_generation_started,
       first_payment_generation_done
FROM owners
WHERE subscription_status = 'active';

-- Check pending keyword batches
SELECT * FROM keyword_batches WHERE status = 'pending';

-- Check pillars in progress
SELECT * FROM pillars WHERE status = 'generating';

-- Check scheduled posts
SELECT id, title, scheduled_publish_date, status
FROM posts
WHERE scheduled_publish_date IS NOT NULL
ORDER BY scheduled_publish_date;
```

---

## Summary

The Blog Autopilot automation system provides:

1. **Reliable Content Generation**: Multiple cron jobs ensure continuous content creation
2. **Failsafe Recovery**: Catch-up job detects and completes interrupted operations
3. **Idempotent Processing**: Webhook and lock mechanisms prevent duplicate work
4. **Graceful Image Handling**: Multi-layer retry ensures articles have images
5. **Scheduled Publishing**: Drip-feed content release for consistent engagement
6. **Error Isolation**: Individual failures don't cascade to other sites

All components work together to provide a hands-off content automation experience for subscribers.
