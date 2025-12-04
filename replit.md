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
- **Proxy-Safe API Prefix (/bv_api/)**: All API calls use `/bv_api/` prefix instead of `/api/` to avoid conflicts when deployed behind a reverse proxy alongside other applications (e.g., WordPress). The backend middleware rewrites `/bv_api/*` to `/api/*` internally. Nginx must be configured to forward `/bv_api/` requests to the Replit app.
- **Admin Dashboard**: Provides secure login, site management (CRUD), and configuration for general settings, AI automation, RSS feeds, and post management.
- **Content Automation**:
    - **AI Generation**: Configurable per-site with custom prompts, keyword cycling, and scheduled content creation.
    - **RSS Rewriting**: Monitors RSS feeds, fetches new articles, and rewrites content using AI to ensure uniqueness, with configurable scheduling.
- **Public Site Themes**: Seven distinct themes (Blog, News, Magazine, NovaPress, Portfolio, Restaurant, Crypto) with customizable templates, fonts, logo sizing, and content width. All themes now support:
    - **Unified PostCard Component**: Configurable post card styles (standard, editorial, minimal, overlay)
    - **Cross-Layout Pagination**: All layouts support pagination with configurable posts per page
    - **Reduced Motion Support**: All animations respect `prefers-reduced-motion` accessibility preference
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
- **Automatic Navigation**: Generates navigation menus from the top 10 most-used tags, creating tag archive pages and related post sections dynamically.
- **Bulk Keyword Generation**: Supports uploading keyword lists for automated post generation, with a dashboard to track progress.
- **Topical Authority System**: Automated SEO content generation using the Pillar-Cluster model:
    - **Pillars**: Main topic entities with configurable subtopic counts (50-200 articles)
    - **Clusters**: AI-generated categories (3-8 per pillar) organizing content thematically
    - **Automatic Internal Linking**: Context-aware links between pillar, cluster, and article content
    - **Scheduled Generation**: Articles are generated automatically via cron scheduler
    - **Status Workflow**: draft → mapping → mapped → generating → completed/paused/failed
- **Dynamic Sitemap**: Generates and caches `sitemap.xml` for each site, including posts and tag archives.
- **Multi-User Authentication**: Role-based access control (RBAC) with admin and editor roles, and site-specific permissions.
- **SEO Implementation**: Includes a `SeoHead` component for managing meta tags, OG tags, canonical URLs, and favicons per page.

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