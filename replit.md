# Blog Virality - Multi-Domain Content Platform

## Overview
Blog Virality is a multi-tenant content management system (CMS) that operates on a single Replit instance, serving distinct websites based on the incoming domain name. It features a dual architecture: a centralized admin dashboard and dynamic, customizable public-facing websites. The platform aims to provide complete isolation of content, branding, and navigation for each domain, supporting unlimited independent websites. Key capabilities include domain-based routing, AI-generated and RSS-rewritten content automation, and flexible layout templates (Blog, News, Magazine, Portfolio, Restaurant, Crypto).

## User Preferences
- Clean, modern UI with consistent spacing
- Professional design following Shadcn conventions
- Responsive layouts for all screen sizes
- Beautiful empty states and loading indicators
- Hover interactions with elevation effects

## System Architecture
The platform is built with a backend using Express.js with TypeScript and a frontend in React with TypeScript. PostgreSQL (Neon) with Drizzle ORM handles data persistence. Authentication is managed via Express-session and bcrypt. AI content generation leverages Replit AI Integrations (GPT-5), and node-cron handles scheduled automation. RSS feed processing uses rss-parser.

**UI/UX Decisions:**
The system employs a clean, modern UI with consistent spacing and professional design, heavily utilizing Shadcn UI with Tailwind CSS. It features responsive layouts, beautiful empty states, loading indicators, and interactive hover effects with elevation. Admin interfaces adopt a macOS-inspired glassmorphism design with soft shadows and Framer Motion animations for smooth transitions. Public sites offer six distinct layout templates, each with unique typography, color schemes, and structural designs, all designed to be responsive across devices.

**Technical Implementations:**
- **Domain-Based Routing**: Automatically routes requests to the admin dashboard or the appropriate public site based on the domain. Supports domain aliases allowing multiple URLs to point to the same site.
- **Admin Dashboard**: Provides secure login, site management (CRUD), and configuration for general settings, AI automation, RSS feeds, and post management.
- **Content Automation**:
    - **AI Generation**: Configurable per-site with custom prompts, keyword cycling, and scheduled content creation.
    - **RSS Rewriting**: Monitors RSS feeds, fetches new articles, and rewrites content using AI to ensure uniqueness, with configurable scheduling.
- **Public Site Templates**: Six distinct layouts (Blog, News, Magazine, Portfolio, Restaurant, Crypto) with customizable themes, fonts, logo sizing, and content width.
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