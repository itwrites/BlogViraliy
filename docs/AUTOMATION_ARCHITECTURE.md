# Blog Autopilot - Automation & Scheduling Architecture

This document is the source of truth for how Autopilot content creation works, including triggers, targets, failure handling, scheduling, and limits.

---

## Table of Contents

1. Overview
2. Triggers (When creation runs)
3. Targets (How many articles are created)
4. Autopilot Creation Flow (Monthly Content Engine)
5. Failure Handling and Retry Behavior
6. Limit Enforcement (Plan usage)
7. Publish Date Assignment
8. Catch-Up Generation Failsafe
9. API Endpoints (Status, Targets)
10. Data Fields and Sources
11. Monitoring and Debugging

---

## Overview

Autopilot is the subscription-driven monthly content engine. It creates a batch of draft posts and assigns scheduled publish dates across the month. The system is designed to:

- Respect plan limits (posts per month)
- Avoid double runs (atomic claims and locks)
- Recover from interruptions (catch-up job)
- Continue past transient failures by retrying within a run

Core files:
- `server/monthly-content-engine.ts`
- `server/automation.ts`
- `server/webhookHandlers.ts`
- `server/routes.ts`
- `server/storage.ts`

---

## Triggers (When creation runs)

Autopilot creation can be triggered from multiple entry points. All are guarded by atomic claims to avoid duplicate runs.

1) Checkout success (first payment)
- Stripe webhook `checkout.session.completed`
- Code: `server/webhookHandlers.ts -> handleCheckoutComplete()`
- Calls `triggerMonthlyContentGeneration(userId)` if claim succeeds

2) Monthly billing cycle (invoice paid)
- Stripe webhook `invoice.paid`
- Code: `server/webhookHandlers.ts -> handleInvoicePaid()`
- Resets `postsUsedThisMonth` and triggers `triggerMonthlyContentGeneration(userId)`

3) Client failsafe (manual recovery)
- Endpoint: `POST /api/trigger-first-payment-generation`
- Code: `server/routes.ts`
- Used when webhook was delayed or missed

4) Catch-up scheduler (background failsafe)
- Cron: every 2 minutes
- Code: `server/automation.ts -> processCatchupGeneration()`
- Detects paid users where `firstPaymentGenerationDone = false` and retries generation

5) Monthly backfill scheduler (target recovery)
- Cron: every 6 hours
- Code: `server/automation.ts -> processMonthlyBackfill()`
- Ensures each site reaches its monthly target by filling missing articles

Important gating conditions:
- Site must be onboarded and have business profile (`site.isOnboarded` and `site.businessDescription`)
- User must have `subscriptionStatus = active` and a valid plan
- For multi-site users, article allocation must exist before Autopilot runs

---

## Targets (How many articles are created)

Autopilot is a per-site target computed at runtime.

### Inputs
- Plan limit: `PLAN_LIMITS[plan].postsPerMonth` (in `shared/schema.ts`)
- Number of owned sites
- Optional per-site allocation (`users.articleAllocation`)
- Remaining quota this month (`postsPerMonth - postsUsedThisMonth`)

### Target rules

If allocation exists for the site:
- target = clamp(allocation[siteId], min 4, max 100)

Else (no allocation):
- perSite = floor(plan.postsPerMonth / sitesCount)
- target = clamp(perSite, min 4, max 40)

Finally, Autopilot enforces plan usage:
- effectiveTarget = min(target, remainingPlanQuota)

Notes:
- Remaining plan quota is shared across all sites for the owner
- Autopilot never creates more than the remaining quota

---

## Autopilot Creation Flow (Monthly Content Engine)

File: `server/monthly-content-engine.ts`

High-level flow per site:

1) Validate eligibility
- Subscription active
- Site exists and has business profile

2) Compute target count
- Uses rules above (allocation or plan split)
- Applies remaining plan quota

3) Get or create automation pillars
- `getOrCreateAutomationPillars()`
- Uses 4 automation pillars by default

4) Build article plans
- `generateArticlesForPillars()` generates a plan list using AI
- If AI returns fewer than expected, the list is padded with deterministic defaults

5) Generate articles
- Loop through planned list until `createdCount == effectiveTarget`
- Each article is generated with role-based prompts
- Feature image attempted with fallbacks

6) Create posts with limit enforcement
- Uses `storage.createPostWithLimitCheck()`
- If limit is reached mid-run, creation stops immediately

7) Schedule publishing
- Each created post is `draft` with `scheduledPublishDate`

8) Result
- Returns created count per site, used by webhook/failsafe to mark generation done

---

## Failure Handling and Retry Behavior

Autopilot failures are handled at the per-article level to avoid aborting the entire run.

Per-article failure handling:
- Errors in content generation or image search are caught
- The engine skips the failed plan and tries the next one
- A retry buffer is used so the run can still hit the target count

Limit-related failures:
- `createPostWithLimitCheck()` returns `POST_LIMIT_REACHED`
- When this happens, the monthly run stops immediately

Non-limit failures:
- Logged and skipped, engine continues

Important:
- Autopilot does not persist a "failed" record for monthly articles; it simply continues to the next plan

## Monthly Backfill (Target Recovery)

File: `server/automation.ts -> processMonthlyBackfill()` and `server/monthly-content-engine.ts -> runMonthlyBackfillForUser()`

Purpose:
- Ensures that each site reaches its monthly target even if the original run partially failed

How it works:
1) For each active paid owner, compute the billing cycle start (`postsResetDate` or month start)
2) For each eligible site, compute the target
3) Count already-created Autopilot posts for the cycle (`source = "monthly-automation"`)
4) Generate only the missing count
5) Respect remaining plan quota (limit enforcement still applies)

If the plan limit has already been used by other processes, backfill will stop early.

## Advisory Locking (Cross-Process Safety)

Autopilot uses DB advisory locks to prevent multiple runs for the same owner and billing period across different app instances.

Lock key:
- `pg_try_advisory_lock(hashtext(userId), hashtext(billingPeriodKey))`
- `billingPeriodKey` is derived from `postsResetDate` (or current month if absent)

This ensures only one monthly generation or backfill runs at a time per owner.

---

## Limit Enforcement (Plan usage)

Plan usage is enforced centrally in `storage.createPostWithLimitCheck()`:

- Checks the owner plan limit before creation
- Creates the post
- Atomically increments `users.postsUsedThisMonth`
- If the increment fails (limit crossed by another process), the post is deleted and the call returns `POST_LIMIT_REACHED`

This ensures all creation paths respect the plan, including:
- Autopilot monthly engine
- AI keyword automation
- RSS rewriting
- Keyword batches
- Topical authority generation

---

## Publish Date Assignment

Publish dates are assigned by `calculatePublishSchedule()` in `server/monthly-content-engine.ts`:

```ts
export function calculatePublishSchedule(articleCount: number, startDate = new Date()): Date[] {
  const daysInMonth = 30;
  const interval = Math.max(1, Math.floor(daysInMonth / articleCount));
  const dates: Date[] = [];
  let currentDate = new Date(startDate);

  for (let i = 0; i < articleCount; i++) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + interval);
  }

  return dates;
}
```

- Autopilot posts are created as `draft`
- `scheduledPublishDate` is assigned from the schedule
- The scheduled publisher (`server/scheduled-publisher.ts`) publishes when the date is in the past

---

## Catch-Up Generation Failsafe

File: `server/automation.ts -> processCatchupGeneration()`

Purpose:
- If generation was interrupted (server restart, webhook delay, etc.), the catch-up job completes it

Eligibility:
- User is active and owner
- `firstPaymentGenerationDone` is false
- At least one onboarded site with business profile exists
- If multi-site and allocation is missing, the job skips until allocation is set

Flow:
1) Claim generation atomically (`claimFirstPaymentGeneration`)
2) If user already has any autopilot articles, mark done
3) Otherwise run `triggerMonthlyContentGeneration`
4) Mark done if successful, else clear started flag for retry next run

---

## API Endpoints (Status, Targets)

1) Per-site monthly target
- `GET /bv_api/sites/:siteId/monthly-target`
- Returns target, allocation, remaining quota, and effective target

2) Generation status (progress)
- `GET /bv_api/sites/:siteId/generation-status`
- Returns `articlesCreated`, `expectedCount`, `isGenerating`
- Expected count respects allocation or plan split

3) Subscription usage
- `GET /bv_api/subscription`
- Returns `postsUsedThisMonth`, `postsLimit`, `sitesUsed`, `sitesLimit`

---

## Data Fields and Sources

Relevant columns:
- `users.subscriptionPlan`
- `users.subscriptionStatus`
- `users.postsUsedThisMonth`
- `users.postsResetDate`
- `users.firstPaymentGenerationStarted` (timestamp lock)
- `users.firstPaymentGenerationDone`
- `users.articleAllocation` (JSON map: siteId -> target)

Post sources:
- Autopilot monthly: `source = "monthly-automation"`
- Onboarding: `source = "onboarding"`
- AI keyword: `source = "ai"`
- Keyword batch: `source = "ai-bulk"`
- RSS: `source = "rss"`
- Topical authority: `source = "topical-authority"`

---

## Monitoring and Debugging

Useful log prefixes:
- `[Monthly Content]` (autopilot)
- `[Stripe Webhook]` (billing triggers)
- `[Catchup]` (failsafe)
- `[Backfill]` (monthly target recovery)

Key queries:

```sql
-- Posts created this month for a site
select count(*)
from posts
where site_id = '<SITE_ID>'
  and created_at >= date_trunc('month', now() at time zone 'utc');

-- Monthly usage for owner
select id, subscription_plan, posts_used_this_month, posts_reset_date
from users
where id = '<USER_ID>';
```

---

## Notes on Initial (Onboarding) Articles

Initial onboarding articles are separate from Autopilot:
- Triggered on onboarding completion
- Generates 2 real drafts + 2 locked placeholders
- Source: `onboarding`
- Uses `calculatePublishSchedule()` for draft publish dates

File: `server/initial-article-generator.ts`

---

## Plan Limits (Current)

From `shared/schema.ts`:

| Plan  | Posts per Month | Max Sites |
|-------|------------------|----------|
| Launch | 30 | 1 |
| Growth | 120 | 3 |
| Scale  | 400 | unlimited |

---

## Summary

Autopilot is a monthly, plan-driven batch generator that:
- Is triggered by Stripe events, client failsafe, and catch-up cron
- Computes per-site targets from plan + allocation + remaining quota
- Uses role-based generation, scheduled publishing, and strict limit enforcement
- Retries within a run to hit the target count, without exceeding plan limits
- Uses monthly backfill + DB advisory locks to recover missed articles and prevent concurrent runs

This document should be used as the canonical reference for Autopilot behavior.
