# Blog Autopilot - Multi-Domain Content Platform

## Overview
Blog Autopilot is a multi-tenant content management system (CMS) that operates on a single Replit instance, serving distinct websites based on the incoming domain name. It features a dual architecture: a centralized admin dashboard and dynamic, customizable public-facing websites. The platform aims to provide complete isolation of content, branding, and navigation for each domain, supporting unlimited independent websites. Key capabilities include domain-based routing, AI-generated and RSS-rewritten content automation, and flexible themes. The project's ambition is to become a leading platform for scalable, SEO-optimized content delivery across diverse niches.

## User Preferences
- Clean, modern UI with consistent spacing
- Professional design following Shadcn conventions
- Responsive layouts for all screen sizes
- Beautiful empty states and loading indicators
- Hover interactions with elevation effects
- macOS-inspired design language (SF Pro fonts, glassmorphism, 280-350ms animations)
- **Light Theme with Darkish Gray Accents**: Apple-style light gray background (#f5f5f7), white cards with subtle blur, gray text hierarchy (gray-900/600/500/400)

## System Architecture
The platform is built with a backend using Express.js with TypeScript and a frontend in React with TypeScript. PostgreSQL (Neon) with Drizzle ORM handles data persistence. Authentication is managed via Express-session and bcrypt. AI content generation leverages Replit AI Integrations (GPT-5), and node-cron handles scheduled automation.

**UI/UX Decisions:**
The system employs a clean, modern UI with consistent spacing and professional design, heavily utilizing Shadcn UI with Tailwind CSS. It features responsive layouts, beautiful empty states, loading indicators, and interactive hover effects with elevation. Admin interfaces adopt a macOS-inspired glassmorphism design with soft shadows and Framer Motion animations for smooth transitions. Public sites offer fifteen distinct layout templates, each with customizable typography, color schemes, and structural designs, all designed to be responsive across devices and respecting `prefers-reduced-motion`.

**Technical Implementations:**
- **Domain-Based Routing**: Automatically routes requests to the admin dashboard or the appropriate public site based on the domain, supporting domain aliases and optional base path deployment for reverse proxies.
- **Proxy-Safe API Prefix**: All API calls use `/bv_api/` prefix to avoid conflicts in reverse proxy deployments.
- **Proxy Mode Deployment**: Supports both standalone and reverse proxy modes with secure visitor hostname lookup using `X-BV-Visitor-Host` header and optional `PROXY_SECRET`.
- **Admin Dashboard**: Provides secure login, comprehensive site management (CRUD), and configuration for general settings, AI automation, RSS feeds, and post management.
- **Content Automation**: Configurable AI generation with custom prompts and keyword cycling, and RSS rewriting using AI to ensure content uniqueness, all via scheduled automation.
- **Business Profile System**: Sites can configure business context (description, target audience, brand voice, value propositions, industry, competitors) that is automatically injected into all AI content generation prompts for brand-aligned content.
- **Site Onboarding System**: New sites trigger a full-screen onboarding modal with two paths: "Import from Website" (uses Firecrawl to scrape an existing website and OpenAI to extract business information) or "Enter Manually" (step-by-step form). The onboarding flow populates the Business Profile automatically and marks the site as onboarded when complete.
- **Public Site Themes**: Fifteen distinct themes with customizable templates, fonts, logo sizing, and content width, offering various postcard styles and cross-layout pagination.
- **Theme Registry System**: Centralized theme definitions with token inheritance and runtime validation, supporting various theme categories.
- **SPA Shell Architecture**: Seamless client-side navigation without full page reloads for public sites, utilizing a `PublicShell` component and memoized routes.
- **Custom Cursor System**: Four animated cursor styles (pointer-dot, crosshair, spotlight, trail) with performance optimization.
- **Configurable Navigation System**: Supports automatic navigation from tags or manual, admin-defined menu items with drag-and-drop reordering, including URL links and tag groups.
- **Bulk Keyword Generation & CSV Post Import**: Tools for importing posts and keywords, with features like automatic slug generation and RFC 4180-compliant CSV parsing.
- **Topical Authority System**: Automated SEO content generation using the Pillar-Cluster model, including AI-generated categories, automatic internal linking, and scheduled generation with a clear workflow.
- **AI Topic Suggestions**: The topical authority page includes a "Get AI Suggestions" button that generates personalized topic pack ideas based on the site's business profile. Clicking a suggestion pre-fills the create modal with topic name, description, pack type, and article count. Used suggestions are marked as completed.
- **Business Profile Validation**: All AI generation features (keyword batches, topical authority, RSS rewriting, scheduled automation) require a completed Business Profile. API endpoints return `BUSINESS_PROFILE_REQUIRED` error code when blocked.
- **Internal Linking Graph System**: Pack-based content strategy with 5 predefined and custom pack types, 17 article roles (each with role-specific JSON-LD and AI prompts), and visualization of link structures.
- **Runtime Link Rewriting**: Internal links in post content are automatically rewritten at render time to include the site's basePath, ensuring correct routing in all deployment scenarios.
- **Dynamic Sitemap & Robots.txt**: Auto-generates and caches `sitemap.xml` and `robots.txt` per site, with tenant-specific URLs and access control. Only published posts are included.
- **Post Status System**: Posts support `published`/`draft` status. Draft posts are completely hidden from public-facing endpoints (post lists, tag queries, related posts, sitemaps, top tags). All automation workflows (AI, RSS, Topical Authority) respect the `defaultPostStatus` setting.
- **Freemium Model with Paywall**: Free users (owners without subscription) see locked articles with blur effect. Paywall modal triggers on create, publish, and unlock actions. Server-side subscription enforcement prevents API bypass.
- **Initial Article Generation**: After site onboarding, 4 starter articles are auto-generated using the business profile (2 unlocked, 2 locked for free tier).
- **Monthly Content Engine**: Automatic monthly content generation using Topical Authority logic. Articles are distributed across the month with scheduled publish dates. Triggered on Stripe invoice.paid webhook with idempotency guard.
- **Scheduled Publishing System**: CRON job runs every minute to publish posts with past `scheduledPublishDate`. Calendar view in Articles page shows scheduled content visually.
- **Topic Rotation**: `currentTopicIndex` tracks which topic pillar to use next, preventing repetition across months.
- **Articles UI Terminology**: "Posts" renamed to "Articles" throughout the admin interface for consistency.
- **Multi-User Authentication**: Role-based access control (RBAC) with admin and editor roles and site-specific permissions.
- **Admin Documentation Wiki**: In-app documentation covering system architecture, content strategies, automation, themes, and SEO features.
- **SEO Implementation**: Utilizes a `SeoHead` component for managing meta tags, OG tags, canonical URLs, and favicons per page.
- **Public API**: RESTful API (`/bv_api/v1/`) with API key authentication, granular permissions, rate limiting, and comprehensive documentation.
- **Server-Side Rendering (SSR)**: Public pages are rendered server-side for improved SEO using Vite SSR integration, shared components, and TanStack Query hydration, with domain-aware routing.

## External Dependencies
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **AI Integration**: OpenAI via Replit AI Integrations (GPT-5)
- **Payments**: Stripe (direct API integration, works outside of Replit)
- **Scheduling**: node-cron
- **RSS Parsing**: rss-parser
- **Frontend State Management**: TanStack Query (React Query)
- **UI Components**: Shadcn UI
- **Styling**: Tailwind CSS
- **Form Management**: React Hook Form
- **Validation**: Zod
- **Animation**: Framer Motion
- **Web Scraping**: Firecrawl (@mendable/firecrawl-js) for website content extraction during onboarding

## Stripe Configuration (Self-Hosted Compatible)
The Stripe integration is designed to work both on Replit and on self-hosted environments (AWS, etc.):

**Environment Variables for Production:**
- `STRIPE_SECRET_KEY` - Live secret key from Stripe dashboard
- `STRIPE_PUBLISHABLE_KEY` - Live publishable key from Stripe dashboard
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret for production endpoint

**Environment Variables for Testing:**
- `STRIPE_SECRET_KEY_TEST` - Test secret key from Stripe dashboard
- `STRIPE_PUBLISHABLE_KEY_TEST` - Test publishable key from Stripe dashboard
- `STRIPE_WEBHOOK_SECRET_TEST` - Webhook signing secret for test endpoint
- `STRIPE_TEST_MODE=true` - Enable test mode to use _TEST keys

**Multi-Project Stripe Account:**
The platform includes `project_id` metadata in all Stripe objects (customers, subscriptions). Webhook handlers validate this metadata to only process events from this platform. The project ID is set to `blog-autopilot` in `server/stripeClient.ts`.

**Required Stripe Products:**
Create products in Stripe dashboard with `plan_id` in metadata:
- Product with `metadata.plan_id = "launch"` 
- Product with `metadata.plan_id = "growth"`
- Product with `metadata.plan_id = "scale"`

Each product should have an active monthly recurring price attached.