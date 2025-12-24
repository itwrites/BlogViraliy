# Blog Virality - Multi-Domain Content Platform

## Overview
Blog Virality is a multi-tenant content management system (CMS) that operates on a single Replit instance, serving distinct websites based on the incoming domain name. It features a dual architecture: a centralized admin dashboard and dynamic, customizable public-facing websites. The platform aims to provide complete isolation of content, branding, and navigation for each domain, supporting unlimited independent websites. Key capabilities include domain-based routing, AI-generated and RSS-rewritten content automation, and flexible themes (Blog, News, Magazine, NovaPress, Portfolio, Restaurant, Crypto).

## User Preferences
- Clean, modern UI with consistent spacing
- Professional design following Shadcn conventions
- Responsive layouts for all screen sizes
- Beautiful empty states and loading indicators
- Hover interactions with elevation effects
- macOS-inspired design language (SF Pro fonts, glassmorphism, 280-350ms animations)

## System Architecture
The platform is built with a backend using Express.js with TypeScript and a frontend in React with TypeScript. PostgreSQL (Neon) with Drizzle ORM handles data persistence. Authentication is managed via Express-session and bcrypt. AI content generation leverages Replit AI Integrations (GPT-5), and node-cron handles scheduled automation. RSS feed processing uses rss-parser.

**UI/UX Decisions:**
The system employs a clean, modern UI with consistent spacing and professional design, heavily utilizing Shadcn UI with Tailwind CSS. It features responsive layouts, beautiful empty states, loading indicators, and interactive hover effects with elevation. Admin interfaces adopt a macOS-inspired glassmorphism design with soft shadows and Framer Motion animations for smooth transitions. Public sites offer six distinct layout templates, each with unique typography, color schemes, and structural designs, all designed to be responsive across devices.

**Technical Implementations:**
- **Domain-Based Routing**: Automatically routes requests to the admin dashboard or the appropriate public site based on the domain. Supports domain aliases allowing multiple URLs to point to the same site.
- **Optional Base Path Support**: Enables reverse proxy deployments where the blog runs under a subdirectory (e.g., WordPress at ax.com with Blog Virality proxied at ax.com/blog). Configured per-site with automatic normalization (strips trailing slashes, ensures leading slash).
- **Canonical URL Redirects**: Enforces correct URL structure based on domain type:
    - **Alias Domains**: No redirect - content is served at whatever URL nginx proxies (e.g., `vyfy.co.uk/blog` stays at `/blog` and shows content).
    - **Primary Domains with basePath**: Root requests are 301 redirected to the basePath (e.g., `/` → `/blog/`).
    - This allows nginx to proxy paths directly (e.g., `vyfy.co.uk/blog/*` → Replit's `/blog/*`).
- **Proxy-Safe API Prefix (/bv_api/)**: All API calls use `/bv_api/` prefix instead of `/api/` to avoid conflicts when deployed behind a reverse proxy alongside other applications (e.g., WordPress). The backend middleware rewrites `/bv_api/*` to `/api/*` internally. Nginx must be configured to forward `/bv_api/` requests to the Replit app.
- **Admin Dashboard**: Provides secure login, site management (CRUD), and configuration for general settings, AI automation, RSS feeds, and post management.
- **Content Automation**:
    - **AI Generation**: Configurable per-site with custom prompts, keyword cycling, and scheduled content creation.
    - **RSS Rewriting**: Monitors RSS feeds, fetches new articles, and rewrites content using AI to ensure uniqueness, with configurable scheduling.
- **Public Site Themes**: Fifteen distinct themes with customizable templates, fonts, logo sizing, and content width:
    - **Core Themes**: Blog, News, Magazine, NovaPress, Portfolio, Restaurant, Crypto
    - **New Themes**: Aurora (pastel gradients), Carbon (brutalist dark), Soho (premium editorial), Citrine (warm magazine), Verve (vibrant creative), Minimal (clean whitespace), Ocean (calming blues), Forest (natural greens)
    - **Unified PostCard Component**: Configurable post card styles (standard, editorial, minimal, overlay, compact, featured, glass, gradient)
    - **Cross-Layout Pagination**: All layouts support pagination with configurable posts per page
    - **Reduced Motion Support**: All animations respect `prefers-reduced-motion` accessibility preference
    - **Theme-Aware Footer Colors**: `footerColorMode` supports custom, primary, secondary, dark, light modes for cohesive footer styling
- **Theme Registry System** (`client/src/lib/theme-registry.ts`): Centralized theme definitions with:
    - **Theme Definitions**: Each theme has id, name, description, category, default tokens, and feature list
    - **Token Inheritance**: Settings merge order: globalDefaults < themeDefaults < customSettings
    - **Runtime Validation**: Invalid theme IDs fall back to blog defaults with console warning
    - **Theme Categories**: blog, news, business, creative for organizing themes
    - **Utility Functions**: getThemeDefinition, getThemeDefaultTokens, getAllThemes, getThemesByCategory, mergeThemeTokens, isValidTheme
- **SPA Shell Architecture**: Seamless client-side navigation without full page reloads:
    - **PublicShell Component**: Wraps all public routes with shared header, footer, and layout elements that stay mounted during navigation
    - **Content Components**: Each theme exports a `XXXContent` function (e.g., `PublicBlogContent`) without layout wrappers
    - **Memoized Routes**: Route switching is handled by a memoized `PublicRoutes` component for optimal performance
    - **Props-Based Params**: Post slug and tag archive routes receive parameters via props instead of useParams() for cleaner component boundaries
- **Custom Cursor System**: Four animated cursor styles (pointer-dot, crosshair, spotlight, trail) with:
    - RAF-throttled performance optimization
    - Velocity-based smooth motion
    - Automatic native cursor restoration in input fields
    - Hover state detection for interactive elements
- **Configurable Navigation System**: Supports two menu modes per site:
    - **Automatic Mode**: Generates navigation from top 10 most-used tags, creating tag archive pages dynamically
    - **Manual Mode**: Admin-defined menu items with drag-and-drop reordering, supporting:
        - **URL Links**: Internal or external URLs with optional new-tab opening
        - **Tag Groups**: Multi-tag groupings accessed via `/topics/:groupSlug` route, displaying posts matching any of the grouped tags
    - **Logo Target URL**: Custom redirect URL when clicking the site logo (defaults to home)
    - All navigation uses router-relative paths for correct basePath handling in proxy deployments
- **Bulk Keyword Generation**: Supports uploading keyword lists for automated post generation, with a dashboard to track progress.
- **CSV Post Import**: Import posts from CSV files with title, description, and tags columns. Features RFC 4180-compliant parsing (handles quoted fields, commas in values, UTF-8 BOM), automatic slug generation with batch-aware duplicate handling, and supports comma or semicolon-separated tags. Max 1000 rows per import, up to 20MB file size.
- **Topical Authority System**: Automated SEO content generation using the Pillar-Cluster model:
    - **Pillars**: Main topic entities with configurable subtopic counts (50-200 articles)
    - **Clusters**: AI-generated categories (3-8 per pillar) organizing content thematically
    - **Automatic Internal Linking**: Context-aware links between pillar, cluster, and article content
    - **Scheduled Generation**: Articles are generated automatically via cron scheduler
    - **Status Workflow**: draft → mapping → mapped → generating → completed/paused/failed
- **Internal Linking Graph System**: Pack-based content strategy with role-specific linking rules:
    - **Pack Types**: 5 predefined packs (Quick SEO, Traffic Boost, Buyer Intent, Authority, Full Coverage) plus custom
    - **Article Roles**: 17 specialized roles (pillar, support, long_tail, rankings, best_of, comparison, review, conversion, case_study, benchmark, framework, whitepaper, how_to, faq, listicle, news, general)
    - **Linking Rules**: Each pack defines which roles link to which other roles with anchor pattern preferences (exact, partial, semantic, action, list)
    - **Role Distribution**: Automatic role assignment during topical map generation based on pack's percentage distribution
    - **Role-Specific JSON-LD**: Dynamic structured data generation (Review, HowTo, FAQPage, ItemList, Product, NewsArticle, TechArticle, etc.) based on article role
    - **Role-Specific AI Prompts**: `server/role-prompts.ts` generates tailored content structure prompts for each article role
    - **Custom Pack Creator**: UI component (`client/src/components/custom-pack-creator.tsx`) for defining custom linking strategies with roles, rules, and distribution
    - **Link Structure Visualization**: `client/src/components/pillar-link-graph.tsx` shows projected article connections based on pack rules
    - **Pack Definition File**: `shared/pack-definitions.ts` contains all pack configs, linking rules, and JSON-LD schema mappings
    - **JSON-LD Generator**: `server/json-ld-generator.ts` produces role-appropriate structured data for SSR
    - **Bulk Keywords Integration**: Keywords can be assigned to pillars with automatic role detection from keyword patterns
    - **RSS Integration**: RSS rewriting uses role-specific prompts when linked to a pillar
- **Runtime Link Rewriting**: Internal links in post content are automatically rewritten at render time to include the site's basePath. Users can write simple relative links like `/my-post` and the system adds the basePath prefix (e.g., `/blog/my-post`) when the page is rendered. This ensures links work correctly on both primary and proxy/alias domains without storing the basePath in content.
- **Dynamic Sitemap**: Generates and caches `sitemap.xml` for each site, including posts and tag archives.
- **Dynamic Robots.txt**: Auto-generates `robots.txt` per site with tenant-specific sitemap URLs. Admin/unknown domains receive `Disallow: /` to block crawling.
- **Multi-User Authentication**: Role-based access control (RBAC) with admin and editor roles, and site-specific permissions.
- **SEO Implementation**: Includes a `SeoHead` component for managing meta tags, OG tags, canonical URLs, and favicons per page.
- **Server-Side Rendering (SSR)**: Public pages (homepage, post pages, tag archives) are rendered server-side for improved SEO:
    - **Vite SSR Integration**: Uses Vite's built-in SSR capabilities without introducing additional frameworks
    - **Shared PublicApp Component**: Single component (`client/src/public-app.tsx`) shared between SSR and client hydration
    - **Entry Points**: `entry-server.tsx` for SSR rendering, `entry-client.tsx` for client hydration
    - **TanStack Query Hydration**: Server prefetches data (site config, posts, tags) and dehydrates state for client hydration
    - **Domain-Aware Routing**: SSR only triggers for registered domains on public routes; admin routes remain pure SPA
    - **XSS-Safe State Injection**: Dehydrated state is serialized with JSON escaping to prevent script injection

## External Dependencies
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **AI Integration**: OpenAI via Replit AI Integrations (GPT-5)
- **Scheduling**: node-cron
- **RSS Parsing**: rss-parser
- **Frontend State Management**: TanStack Query (React Query)
- **UI Components**: Shadcn UI
- **Styling**: Tailwind CSS
- **Form Management**: React Hook Form
- **Validation**: Zod
- **Animation**: Framer Motion