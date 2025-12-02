# ChameleonWeb - Multi-Domain Content Platform

## Overview
ChameleonWeb is a sophisticated multi-tenant content management system (CMS) that runs on a single Replit instance and serves completely different websites based on the incoming domain name. The platform features dual architecture: a centralized admin dashboard and dynamic public-facing websites with customizable layouts.

## Purpose & Goals
- **Multi-Tenancy**: Serve unlimited independent websites from one deployment
- **Domain-Based Routing**: Automatically detect domain and load appropriate site configuration
- **Content Automation**: AI-generated posts and RSS feed rewriting for automated content creation
- **Layout Flexibility**: Each site can choose between Blog or News layout templates
- **Complete Isolation**: Content, branding, and navigation are unique per domain

## Current State
Production-ready platform with all core features functional:
- ✅ Admin dashboard with login and site management
- ✅ Comprehensive site configuration (General, AI Automation, RSS Automation, Posts)
- ✅ AI content generation using Replit AI Integrations (GPT-5)
- ✅ RSS feed rewriting for unique content
- ✅ Manual post editor with markdown support and live preview
- ✅ **Six unique layout templates** with visual previews (Blog, News, Magazine, Portfolio, Restaurant, Crypto)
- ✅ Automatic navigation menu generation from top tags
- ✅ Tag archive pages and related posts
- ✅ Scheduled automation with node-cron
- ✅ PostgreSQL database with full data persistence
- ✅ 100% data-testid coverage for automated testing
- ✅ **Bulk keyword generation** - Upload a list of keywords to automatically generate posts
- ✅ **Dynamic sitemap.xml** - Each site has its own sitemap for SEO

## Project Architecture

### Backend Structure
- **Server Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: Express-session with bcrypt password hashing
- **AI Integration**: OpenAI via Replit AI Integrations (GPT-5)
- **Automation**: node-cron for scheduled content generation
- **RSS Parsing**: rss-parser for feed processing

### Frontend Structure
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Shadcn UI with Tailwind CSS
- **Forms**: React Hook Form with Zod validation
- **Design System**: Custom tokens configured in index.css and tailwind.config.ts

### Database Schema
- **users**: Admin authentication
- **sites**: Website configurations (domain, title, logo, layout type)
- **posts**: Content with tags, slugs, and source tracking
- **aiAutomationConfigs**: AI generation settings per site
- **rssAutomationConfigs**: RSS feed settings per site
- **keywordBatches**: Bulk generation job tracking (status, progress, counts)
- **keywordJobs**: Individual keyword jobs within a batch

## Key Features

### 1. Domain-Based Routing
The system detects the incoming domain name and:
- Routes to admin dashboard if domain matches ADMIN_DOMAIN
- Loads corresponding site if domain is registered in database
- Shows "Site Not Found" page for unregistered domains
- Ensures complete content isolation between sites

### 2. Admin Dashboard
- Secure login with username/password
- List view of all registered sites
- Add/Edit/Delete site functionality
- Three-tab configuration interface:
  - **General**: Domain, title, logo, layout type
  - **AI Content**: Enable/disable, schedule, master prompt, keyword cycling
  - **RSS Feeds**: Enable/disable, schedule, feed URLs, article fetch count
  - **Posts**: Manual post management with CRUD operations

### 3. Content Automation
**AI Content Generation**:
- Configured per-site with custom master prompts
- Cycles through keyword list for topic variety
- Generates title, content, and tags automatically
- Scheduling: 1/day, 3/day, or 1/week

**RSS Feed Rewriting**:
- Monitors multiple RSS feeds per site
- Fetches newest articles based on configured count
- Rewrites content using AI to ensure uniqueness
- Prevents duplicate content penalties
- Scheduling: Every 1 hour, 6 hours, or daily

### 4. Public Site Templates
**Blog Layout**:
- Hero featured post with gradient overlay
- Two-column recent posts grid
- Serif fonts (Merriweather) for editorial feel
- Spacious, content-focused design

**News Layout**:
- Compact header with category navigation
- Featured section with main + secondary stories
- Three-column latest news grid
- Condensed fonts (Roboto Condensed) for information density

**Magazine Layout**:
- Multi-column grid layout (TIME/Newsweek style)
- Featured post + secondary posts in asymmetric grid
- Georgia serif fonts for editorial elegance
- Uppercase category navigation
- 4-column latest stories grid

**Portfolio Layout**:
- Minimal, clean design with large imagery
- Light typography for professional presentation
- Showcase-style 2-column grid
- First post spans full width for emphasis
- Perfect for creative work and case studies

**Restaurant Layout**:
- Food & dining themed with theme-based color palette
- Playfair Display serif fonts for elegance
- Gradient backgrounds using primary/secondary theme colors
- Featured story hero with 3-column latest news
- Rounded pill-style category tags

**Crypto Layout**:
- Data-heavy, tech-focused aesthetic
- Monospace fonts throughout
- "LIVE" status badge
- Breaking news section with inline image
- Numbered trending posts (01, 02, 03)
- Compact latest updates with timestamps
- Market data feel with theme-based accent colors

### 5. Automatic Navigation
- Top 10 most-used tags become navigation menu items
- Tag archive pages list all posts with that tag
- Related posts based on shared tags
- No manual menu configuration needed

## User Preferences
- Clean, modern UI with consistent spacing
- Professional design following Shadcn conventions
- Responsive layouts for all screen sizes
- Beautiful empty states and loading indicators
- Hover interactions with elevation effects

## Recent Changes
- 2025-12-02: **Clean post excerpts with markdown stripping**
  - Created stripMarkdown utility function (client/src/lib/strip-markdown.ts)
  - Strips headers, bold, italic, links, images, code blocks, blockquotes, and list markers
  - Updated all 6 layout templates to use stripMarkdown for excerpts
  - Updated tag archive page to use stripMarkdown and display post images
  - Added post excerpt preview to admin dashboard posts list
  - Fixed Restaurant layout to use theme-based colors instead of hardcoded orange/amber
- 2025-12-02: **Mobile-responsive layouts with hamburger navigation**
  - Created reusable MobileNav component with hamburger menu (client/src/components/mobile-nav.tsx)
  - Added MobileNav to all 6 layout templates for mobile-first navigation
  - Updated all layouts with responsive padding (px-4 sm:px-6)
  - Added responsive font sizes throughout (text-xl sm:text-2xl md:text-3xl pattern)
  - Improved hero section heights on mobile (h-[300px] sm:h-[400px] md:h-[500px])
  - Added responsive grid layouts (grid-cols-1 sm:grid-cols-2 md:grid-cols-3)
  - Hidden desktop navigation on mobile (hidden md:flex)
  - Improved card padding and spacing for mobile devices
- 2025-12-02: **Bulk keyword generation and sitemap**
  - Added keywordBatches and keywordJobs tables for bulk generation tracking
  - Created background worker to process keyword batches (runs every minute)
  - Built Bulk Generate tab in site config with keyword upload (textarea/CSV)
  - Progress dashboard showing batch status, job counts, and per-keyword status
  - Implemented sitemap.xml generation with 15-minute caching
  - Dynamic sitemap includes homepage, all posts, and top tag archive pages
  - Added admin sitemap preview and regeneration endpoints
- 2025-12-02: **Multi-user authentication and session fixes**
  - Implemented multi-user role-based access control (RBAC) with admin and editor roles
  - Extended users table with email, role, and status fields
  - Created user_sites junction table for managing user-to-site assignments
  - Fixed session persistence by adding session.regenerate() and session.save() callbacks in login route
  - Fixed crypto template hard-coded colors (now uses theme-based primary/secondary colors)
  - Built AuthProvider and useAuth hook for frontend auth state management
  - Created User Management page (admin-only) for managing users
  - Protected admin routes with requireAuth and requireSiteAccess middleware
- 2025-12-02: **Template customization and SEO implementation**
  - Created PublicThemeProvider component for runtime CSS variable-based theming
  - Created SeoHead component with proper cleanup for meta tags (title, description, OG tags, canonical, favicon, analytics)
  - Updated all 6 layout templates to use theme provider and SEO components
  - Added hasSocials guard to prevent rendering empty social links
  - Template settings apply: colors, fonts, logo size, content width, sticky header, card styles, footer text, social links
- 2025-12-02: **Editor control panel with permission-based access**
  - Created dedicated editor dashboard (client/src/pages/editor-dashboard.tsx) with iOS/macOS styling
  - Created editor posts management page (client/src/pages/editor-posts.tsx) with Framer Motion animations
  - Added editor API routes (/api/editor/sites, /api/editor/sites/:id/posts, /api/editor/posts/:id)
  - Implemented permission levels: view, posts_only, edit, manage
  - Permission enforcement on editor routes - requires minimum permission level for write operations
  - Updated admin-login to redirect editors to /editor dashboard, admins to /admin/dashboard
  - Enhanced user-management page with permission selection dropdowns when assigning sites
  - Added ability to update user permissions after assignment
  - iOS/macOS-inspired UI with glassmorphism header, soft shadows, and Framer Motion animations
  - Added SEO fields to post editor: metaTitle, metaDescription, ogImage, canonicalUrl, noindex
- 2025-10-25: **Extended layout templates to 6 unique designs**
  - Added Magazine, Portfolio, Restaurant, and Crypto layouts
  - Implemented visual card-based layout selector in admin config
  - Each layout has distinct typography, colors, and structure
  - All layouts include comprehensive data-testid coverage
- 2025-10-25: Initial MVP implementation complete
  - Database schema with full relations
  - All admin and public UI components
  - Domain routing middleware
  - AI and RSS automation services
  - Session-based authentication
  - Fixed state hydration bug in site config

## Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `ADMIN_DOMAIN`: Domain for admin dashboard (defaults to localhost)
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: Replit AI gateway URL
- `AI_INTEGRATIONS_OPENAI_API_KEY`: Replit AI gateway key

## Admin Credentials
- Username: `admin`
- Password: `admin123`

## API Routes

### Admin Routes (require authentication)
- POST `/api/auth/login` - Admin login
- GET `/api/sites` - List all sites
- POST `/api/sites` - Create new site
- PUT `/api/sites/:id` - Update site
- DELETE `/api/sites/:id` - Delete site
- GET/PUT `/api/sites/:id/ai-config` - Manage AI automation
- GET/PUT `/api/sites/:id/rss-config` - Manage RSS automation
- GET `/api/sites/:id/posts` - Get site posts
- POST `/api/posts` - Create post
- PUT `/api/posts/:id` - Update post
- DELETE `/api/posts/:id` - Delete post
- GET/POST `/api/sites/:id/keyword-batches` - List/create bulk generation batches
- GET `/api/keyword-batches/:batchId` - Get batch details with jobs
- POST `/api/keyword-batches/:batchId/cancel` - Cancel a pending batch
- DELETE `/api/keyword-batches/:batchId` - Delete a batch
- GET `/api/sites/:id/sitemap/stats` - Get sitemap statistics
- POST `/api/sites/:id/sitemap/regenerate` - Force regenerate sitemap
- GET `/api/sites/:id/sitemap/preview` - Preview sitemap XML

### Public Routes (no auth required)
- GET `/api/domain-check` - Determine if domain is admin or public site
- GET `/api/public/sites/:id/posts` - Get all posts for site
- GET `/api/public/sites/:id/posts/:slug` - Get single post
- GET `/api/public/sites/:id/posts-by-tag/:tag` - Filter by tag
- GET `/api/public/sites/:id/top-tags` - Get navigation tags
- GET `/api/public/sites/:id/related-posts/:postId` - Get related posts
- GET `/sitemap.xml` - Dynamic sitemap based on domain

## Testing Multi-Domain Setup
On Replit, all domains will route to the admin dashboard by default. To test multi-domain features:
1. Create a site in the admin dashboard with any domain name
2. The domain-check API will recognize registered domains
3. In production, configure DNS to point domains to your deployment

## Next Steps / Future Enhancements
- Implement analytics dashboard with post performance metrics
- Implement content calendar for scheduled posts
- Add bulk site management operations
- Support custom domain verification
- Add image upload and management
- Implement full-text search across posts
- Add E-commerce layout template
