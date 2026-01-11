export interface WikiSection {
  id: string;
  title: string;
  content: string;
  subsections?: WikiSection[];
}

export interface WikiData {
  title: string;
  description: string;
  lastUpdated: string;
  sections: WikiSection[];
}

export const adminWikiData: WikiData = {
  title: "Blog Virality Documentation",
  description: "Complete guide to the Blog Virality multi-tenant content management system",
  lastUpdated: "2024-12-31",
  sections: [
    {
      id: "overview",
      title: "System Overview",
      content: `Blog Virality is a multi-tenant content management system (CMS) that operates on a single instance, serving distinct websites based on the incoming domain name. The platform features a centralized admin dashboard and dynamic, customizable public-facing websites.

**Key Capabilities:**
- Domain-based routing for multi-site management
- AI-powered content generation
- RSS feed automation with AI rewriting
- Topical Authority system for SEO
- 15 distinct themes with customization options
- Server-side rendering (SSR) for SEO optimization`,
    },
    {
      id: "multi-domain",
      title: "Multi-Domain Architecture",
      content: `Each site can be accessed via its own domain or through a reverse proxy setup.

**Deployment Modes:**

1. **Standalone Mode** (default): Direct domain access where the Host header matches the registered site domain.

2. **Reverse Proxy Mode**: For deployments behind nginx/Apache where:
   - Primary domain can be left empty
   - Site is identified via \`X-BV-Visitor-Host\` header
   - Useful for subdirectory deployments (e.g., example.com/blog)

**Domain Aliases:** Multiple URLs can point to the same site content.

**Base Path Support:** Sites can run under a subdirectory (e.g., /blog) with automatic URL normalization.`,
    },
    {
      id: "reverse-proxy",
      title: "Reverse Proxy Configuration",
      content: `When deploying Blog Virality behind a reverse proxy (Cloudflare, Netlify, nginx, etc.), you must configure specific headers and ensure both the blog pages and API endpoints are proxied correctly.`,
      subsections: [
        {
          id: "required-headers",
          title: "Required Headers",
          content: `**Essential Headers:**

| Header | Purpose | Example |
|--------|---------|---------|
| \`X-BV-Visitor-Host\` | Identifies the visitor's domain for site lookup | \`mysite.com\` |
| \`X-BV-Proxy-Secret\` | Security token (must match server config) | Your secret key |
| \`X-Real-IP\` | Original client IP address | \`203.0.113.50\` |
| \`X-Forwarded-For\` | IP chain through proxies | \`203.0.113.50, 10.0.0.1\` |

**Important Notes:**
- \`X-BV-Visitor-Host\` is the domain the visitor sees in their browser (e.g., \`mysite.com\`), NOT the Blog Virality server domain
- The proxy secret must match the \`PROXY_SECRET\` environment variable on the server

**Host Header Handling (varies by platform):**
- **Cloudflare Workers:** Delete the Host header - it's automatically set by fetch() based on the target URL
- **Netlify/nginx:** Set Host to the upstream server (e.g., \`blogvirality.brandvirality.com\`) - this is required for proper routing`,
        },
        {
          id: "proxy-routes",
          title: "Required Routes",
          content: `**Critical:** You must proxy BOTH the blog pages AND the API endpoints.

**Routes to proxy:**
- \`/blog\` and \`/blog/*\` - Blog pages (SSR content)
- \`/bv_api\` and \`/bv_api/*\` - API endpoints (JSON data)

**Why both are required:**
1. Initial page loads use SSR (rendered on Blog Virality server)
2. Client-side navigation (clicking links) makes API calls to \`/bv_api/*\`
3. If only \`/blog/*\` is proxied, clicking links within the blog will fail

**Common Issue:** Homepage loads but clicking posts shows "Post not found"
- This happens when \`/bv_api\` routes aren't proxied
- The SPA makes API calls that return your main site's HTML instead of JSON`,
        },
        {
          id: "cloudflare-worker",
          title: "Cloudflare Worker Example",
          content: `**Complete Cloudflare Worker configuration:**

\`\`\`javascript
const ORIGIN_HOST = "blogvirality.brandvirality.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Check if path should be proxied
    const isBlog =
      url.pathname === "/blog" || url.pathname.startsWith("/blog/");
    const isApi =
      url.pathname === "/bv_api" || url.pathname.startsWith("/bv_api/");

    if (!isBlog && !isApi) {
      return fetch(request);
    }

    // Build target URL
    const target = new URL(request.url);
    target.protocol = "https:";
    target.hostname = ORIGIN_HOST;

    const headers = new Headers(request.headers);
    
    // IMPORTANT: Never set Host manually in Workers - delete it
    headers.delete("host");

    // Required Blog Virality headers
    headers.set("X-BV-Visitor-Host", url.hostname);
    headers.set(
      "X-BV-Proxy-Secret",
      env?.BV_PROXY_SECRET || "your-secret-here"
    );

    // IP forwarding (equivalent to nginx proxy_set_header)
    const clientIp =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();

    if (clientIp) {
      headers.set("X-Real-IP", clientIp);
    }

    // Preserve/extend X-Forwarded-For chain
    const existingXff = request.headers.get("X-Forwarded-For");
    headers.set(
      "X-Forwarded-For",
      existingXff ? \`\${existingXff}, \${clientIp}\` : clientIp
    );

    return fetch(target.toString(), {
      method: request.method,
      headers,
      body:
        request.method !== "GET" && request.method !== "HEAD"
          ? request.body
          : undefined,
      redirect: "manual",
      // Disable Cloudflare caching for dynamic content
      cf: { cacheTtl: 0, cacheEverything: false },
    });
  },
};
\`\`\`

**Critical Cloudflare Setup:**

1. **Worker Routes (Triggers)** - In Cloudflare Dashboard:
   - Go to Workers & Pages > Your Worker > Settings > Triggers
   - Add route: \`yourdomain.com/blog*\`
   - Add route: \`yourdomain.com/bv_api*\`
   
   Without BOTH routes, the worker code won't execute for API calls!

2. **Environment Variables:**
   - Add \`BV_PROXY_SECRET\` in Worker settings for security`,
        },
        {
          id: "netlify-config",
          title: "Netlify Configuration Example",
          content: `**netlify.toml configuration:**

\`\`\`toml
# Blog pages proxy
[[redirects]]
  from = "/blog/*"
  to = "https://blogvirality.brandvirality.com/blog/:splat"
  status = 200
  force = true
  [redirects.headers]
    Host = "blogvirality.brandvirality.com"
    X-Forwarded-Host = "yourdomain.com"
    X-Original-Host = "yourdomain.com"
    X-Forwarded-Proto = "https"
    X-BV-Proxy-Secret = "your-secret-here"
    X-BV-Visitor-Host = "yourdomain.com"

# Blog root (without trailing content)
[[redirects]]
  from = "/blog"
  to = "https://blogvirality.brandvirality.com/blog/"
  status = 200
  force = true
  [redirects.headers]
    Host = "blogvirality.brandvirality.com"
    X-Forwarded-Host = "yourdomain.com"
    X-Original-Host = "yourdomain.com"
    X-Forwarded-Proto = "https"
    X-BV-Proxy-Secret = "your-secret-here"
    X-BV-Visitor-Host = "yourdomain.com"

# API proxy (required for SPA navigation)
[[redirects]]
  from = "/bv_api/*"
  to = "https://blogvirality.brandvirality.com/bv_api/:splat"
  status = 200
  force = true
  [redirects.headers]
    Host = "blogvirality.brandvirality.com"
    X-Forwarded-Host = "yourdomain.com"
    X-Forwarded-Proto = "https"
    X-BV-Proxy-Secret = "your-secret-here"
\`\`\`

**Notes:**
- Replace \`yourdomain.com\` with your actual domain
- Replace \`your-secret-here\` with your proxy secret
- The \`:splat\` captures the path after the prefix`,
        },
        {
          id: "nginx-config",
          title: "Nginx Configuration Example",
          content: `**nginx.conf configuration:**

\`\`\`nginx
# Define upstream server once for consistency
set $backend "blogvirality.brandvirality.com";

# Blog pages (SSR content)
location /blog {
    resolver 8.8.8.8 ipv6=off valid=300s;
    proxy_pass https://$backend;
    proxy_set_header Host $backend;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-BV-Visitor-Host $host;
    proxy_set_header X-BV-Proxy-Secret "your-secret-here";
    proxy_ssl_server_name on;
    proxy_ssl_name $backend;
    proxy_ssl_protocols TLSv1.2 TLSv1.3;
    proxy_ssl_verify off;
}

# API endpoints (required for SPA navigation)
location /bv_api/ {
    resolver 8.8.8.8 ipv6=off valid=300s;
    proxy_pass https://$backend/bv_api/;
    proxy_http_version 1.1;
    proxy_set_header Host $backend;
    proxy_set_header X-BV-Visitor-Host yourdomain.com;
    proxy_set_header X-BV-Proxy-Secret "your-secret-here";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_ssl_server_name on;
    proxy_ssl_name $backend;
    proxy_ssl_protocols TLSv1.2 TLSv1.3;
    proxy_ssl_verify off;
}
\`\`\`

**Important Configuration Notes:**
- Use a \`$backend\` variable to ensure consistency between both location blocks
- \`resolver 8.8.8.8\` is required for nginx to resolve the upstream domain dynamically
- \`proxy_ssl_server_name on\` enables SNI for proper HTTPS routing
- \`proxy_ssl_name $backend\` ensures the SSL certificate matches the upstream
- \`proxy_http_version 1.1\` in the API block helps with connection handling
- Replace \`yourdomain.com\` with your actual visitor domain in the X-BV-Visitor-Host header
- Both \`/blog\` and \`/bv_api/\` locations must use the SAME upstream server`,
        },
        {
          id: "troubleshooting",
          title: "Troubleshooting",
          content: `**Common Issues:**

**1. Homepage loads but clicking posts shows "Post not found"**
- Cause: \`/bv_api\` routes not proxied
- Fix: Add proxy rules for \`/bv_api/*\` path
- Test: Visit \`yourdomain.com/bv_api/public/sites\` - should return JSON, not HTML

**2. API returns your main site's HTML instead of JSON**
- Cause: Requests bypassing proxy, going to origin
- Fix (Cloudflare): Add \`/bv_api*\` route in Worker Triggers
- Fix (Netlify): Add \`/bv_api/*\` redirect rule

**3. "Site not found" errors**
- Cause: \`X-BV-Visitor-Host\` header missing or incorrect
- Fix: Ensure header contains visitor's domain (e.g., \`mysite.com\`)

**4. "Unauthorized" errors**
- Cause: \`X-BV-Proxy-Secret\` doesn't match server config
- Fix: Verify secret matches \`PROXY_SECRET\` environment variable

**5. SSR works but client navigation fails**
- This is the classic symptom of missing \`/bv_api\` proxy
- Initial page load = SSR (data embedded in HTML)
- Link clicks = SPA navigation (API calls to \`/bv_api\`)

**Verification Steps:**
1. Open browser DevTools > Network tab
2. Click a post link
3. Find the \`/bv_api/...\` request
4. Check response - should be JSON, not HTML
5. If HTML, your proxy isn't handling \`/bv_api\` routes`,
        },
      ],
    },
    {
      id: "content-packs",
      title: "Content Pack Strategies",
      content: `Content Packs define internal linking strategies and article role distributions for SEO optimization. Each pack is designed for different content goals.`,
      subsections: [
        {
          id: "quick-seo",
          title: "Quick SEO Pack",
          content: `**Purpose:** Basic topical hub structure

**Strategy:** All articles link to a central "What is X" pillar page.

**Best for:** New sites establishing topic authority quickly.

**Roles Used:** Pillar (5%), Support (50%), How-To (25%), FAQ (15%), General (5%)`,
        },
        {
          id: "traffic-boost",
          title: "Traffic Boost Pack",
          content: `**Purpose:** Maximize organic traffic

**Strategy:** Long-tail articles link to rankings; rankings link to yearly best-of pages.

**Best for:** Sites targeting high-volume search queries.

**Roles Used:** Pillar (5%), Long-tail (50%), Rankings (25%), Best-of (10%), Listicle (10%)`,
        },
        {
          id: "buyer-intent",
          title: "Buyer Intent Pack",
          content: `**Purpose:** Drive conversions and purchases

**Strategy:** Comparisons link to reviews, which link to conversion pages.

**Best for:** Affiliate sites and e-commerce content.

**Roles Used:** Pillar (5%), Comparison (30%), Review (40%), Conversion (10%), How-To (15%)`,
        },
        {
          id: "authority",
          title: "Authority Pack",
          content: `**Purpose:** Establish thought leadership

**Strategy:** Case studies and benchmarks link to frameworks and whitepapers.

**Best for:** B2B sites and professional services.

**Roles Used:** Pillar (5%), Case Study (30%), Benchmark (20%), Framework (25%), Whitepaper (10%), How-To (10%)`,
        },
        {
          id: "full-coverage",
          title: "Full Coverage Pack",
          content: `**Purpose:** Comprehensive topic coverage

**Strategy:** Hub-and-spoke model where all satellite articles interconnect.

**Best for:** Established sites building comprehensive resources.

**Roles Used:** Pillar (5%), Support (35%), How-To (25%), FAQ (15%), Listicle (10%), News (5%), General (5%)`,
        },
        {
          id: "custom-pack",
          title: "Custom Pack",
          content: `**Purpose:** Tailored linking strategy

Define your own:
- Allowed article roles
- Linking rules (which roles link to which)
- Anchor patterns for links
- Role distribution percentages`,
        },
      ],
    },
    {
      id: "article-roles",
      title: "Article Roles",
      content: `Each article is assigned a role that determines its content structure, internal linking behavior, and JSON-LD schema for SEO.`,
      subsections: [
        {
          id: "pillar-role",
          title: "Pillar",
          content: `**Purpose:** Main topic hub article

**Schema:** Article

**Behavior:** Central page that other articles link TO. Provides comprehensive overview of the topic.`,
        },
        {
          id: "support-role",
          title: "Support",
          content: `**Purpose:** Supporting content for pillar

**Schema:** Article

**Behavior:** Expands on subtopics mentioned in the pillar. Links back to pillar with exact-match anchors.`,
        },
        {
          id: "long-tail-role",
          title: "Long-tail",
          content: `**Purpose:** Target specific search queries

**Schema:** Article

**Behavior:** Captures niche search traffic. Links to rankings and pillar pages.`,
        },
        {
          id: "rankings-role",
          title: "Rankings",
          content: `**Purpose:** Top 10 / Top X style lists

**Schema:** ItemList

**Behavior:** Aggregates and ranks items. Links to best-of pages and individual reviews.`,
        },
        {
          id: "best-of-role",
          title: "Best Of",
          content: `**Purpose:** Curated roundups (e.g., "Best Coffee Makers 2024")

**Schema:** ItemList

**Behavior:** Annual or category-based collections. High link equity target.`,
        },
        {
          id: "comparison-role",
          title: "Comparison",
          content: `**Purpose:** A vs B articles

**Schema:** Article

**Behavior:** Compares products/services. Links to individual reviews with partial-match anchors.`,
        },
        {
          id: "review-role",
          title: "Review",
          content: `**Purpose:** In-depth product/service reviews

**Schema:** Review (with star ratings)

**Behavior:** Detailed analysis with pros/cons. Links to conversion pages with action anchors.`,
        },
        {
          id: "conversion-role",
          title: "Conversion",
          content: `**Purpose:** Bottom-of-funnel purchase pages

**Schema:** Product

**Behavior:** Optimized for conversions. Minimal outbound links, receives links from reviews.`,
        },
        {
          id: "case-study-role",
          title: "Case Study",
          content: `**Purpose:** Real-world implementation examples

**Schema:** Article

**Behavior:** Shows practical applications. Links to frameworks and methodology content.`,
        },
        {
          id: "benchmark-role",
          title: "Benchmark",
          content: `**Purpose:** Data-driven comparisons

**Schema:** Article

**Behavior:** Statistical analysis content. Links to frameworks and whitepapers.`,
        },
        {
          id: "framework-role",
          title: "Framework",
          content: `**Purpose:** Methodology and process content

**Schema:** Article

**Behavior:** Teaches systems/approaches. Links to whitepapers and pillar pages.`,
        },
        {
          id: "whitepaper-role",
          title: "Whitepaper",
          content: `**Purpose:** Comprehensive guides and research

**Schema:** TechArticle

**Behavior:** Long-form authoritative content. High-value link target.`,
        },
        {
          id: "how-to-role",
          title: "How-To",
          content: `**Purpose:** Step-by-step tutorials

**Schema:** HowTo (with steps)

**Behavior:** Instructional content with structured steps. Featured snippet optimization.`,
        },
        {
          id: "faq-role",
          title: "FAQ",
          content: `**Purpose:** Question and answer format

**Schema:** FAQPage

**Behavior:** Targets question-based searches. Optimized for featured snippets.`,
        },
        {
          id: "listicle-role",
          title: "Listicle",
          content: `**Purpose:** List-based articles

**Schema:** ItemList

**Behavior:** Numbered list content. Easy to scan and share.`,
        },
        {
          id: "news-role",
          title: "News",
          content: `**Purpose:** Timely updates and announcements

**Schema:** NewsArticle

**Behavior:** Fresh content for Google News. Links to evergreen pillar content.`,
        },
        {
          id: "general-role",
          title: "General",
          content: `**Purpose:** Miscellaneous content

**Schema:** Article

**Behavior:** Default role for uncategorized content.`,
        },
      ],
    },
    {
      id: "topical-authority",
      title: "Topical Authority System",
      content: `The Topical Authority system automates SEO content generation using the Pillar-Cluster model for building topic authority.`,
      subsections: [
        {
          id: "pillars",
          title: "Pillars",
          content: `**What are Pillars?**
Main topic entities that serve as content hubs. Each pillar represents a broad topic you want to rank for.

**Configuration:**
- Topic name and seed keywords
- Target article count (50-200 articles)
- Content pack selection
- Custom pack configuration (optional)

**Workflow:**
1. Create pillar with topic and keywords
2. System generates clusters (subtopics)
3. AI creates topical map with article ideas
4. Articles are generated on schedule`,
        },
        {
          id: "clusters",
          title: "Clusters",
          content: `**What are Clusters?**
AI-generated categories (3-8 per pillar) that organize content thematically under each pillar.

**Example:**
For a "Coffee" pillar:
- Brewing Methods (cluster)
- Coffee Beans (cluster)
- Equipment Reviews (cluster)
- Health Benefits (cluster)

**Behavior:**
- Auto-generated during pillar mapping
- Each cluster contains multiple article ideas
- Articles in same cluster interlink naturally`,
        },
        {
          id: "article-generation",
          title: "Article Generation",
          content: `**Generation Process:**
1. AI analyzes pillar topic and cluster context
2. Role-specific prompts generate structured content
3. Internal links are automatically inserted
4. Content is published as draft or live

**Scheduling:**
- Cron-based automatic generation
- Configurable frequency per site
- Status tracking (draft, mapping, generating, completed)`,
        },
        {
          id: "internal-linking",
          title: "Automatic Internal Linking",
          content: `**How It Works:**
Links are inserted based on the selected content pack's linking rules.

**Anchor Patterns:**
- **Exact:** Uses exact keyword match (e.g., "best coffee makers")
- **Partial:** Variation of keyword (e.g., "top-rated coffee makers")
- **Semantic:** Related phrase (e.g., "brewing equipment guide")
- **Action:** Call-to-action (e.g., "buy now", "compare prices")
- **List:** List reference (e.g., "see our top picks")

**Link Direction:**
Each pack defines which roles link to which other roles with priority levels.`,
        },
      ],
    },
    {
      id: "rss-automation",
      title: "RSS Automation",
      content: `Automatically monitor RSS feeds and create unique content from external sources.`,
      subsections: [
        {
          id: "rss-feeds",
          title: "Feed Configuration",
          content: `**Setup:**
1. Add RSS feed URLs to monitor
2. Configure check frequency
3. Set rewriting preferences
4. Link to pillar (optional) for role-based rewriting

**Supported Formats:**
- RSS 2.0
- Atom
- Most standard feed formats`,
        },
        {
          id: "ai-rewriting",
          title: "AI Rewriting",
          content: `**Process:**
1. System fetches new articles from feeds
2. AI rewrites content to be unique
3. If linked to pillar, uses role-specific prompts
4. Internal links are inserted automatically
5. Content is published or saved as draft

**Benefits:**
- 100% unique content
- Maintains original meaning
- Optimized for SEO
- Automatic internal linking`,
        },
      ],
    },
    {
      id: "ai-generation",
      title: "AI Content Generation",
      content: `Direct AI content generation without RSS sources.`,
      subsections: [
        {
          id: "keyword-generation",
          title: "Keyword-Based Generation",
          content: `**Single Keywords:**
Generate articles from individual keywords with custom prompts.

**Bulk Keywords:**
Upload keyword lists for batch article generation.

**CSV Import:**
Import posts from CSV files with title, description, and tags.`,
        },
        {
          id: "generation-settings",
          title: "Generation Settings",
          content: `**Configurable Options:**
- Custom system prompts
- Keyword cycling
- Scheduled generation frequency
- Draft vs. auto-publish
- Featured image generation`,
        },
      ],
    },
    {
      id: "themes",
      title: "Theme System",
      content: `15 distinct themes with customization options.`,
      subsections: [
        {
          id: "core-themes",
          title: "Core Themes",
          content: `- **Blog:** Classic blog layout
- **News:** News publication style
- **Magazine:** Editorial magazine design
- **NovaPress:** Modern press theme
- **Portfolio:** Creative portfolio
- **Restaurant:** Food/hospitality focus
- **Crypto:** Cryptocurrency/fintech style`,
        },
        {
          id: "new-themes",
          title: "Additional Themes",
          content: `- **Aurora:** Pastel gradients
- **Carbon:** Brutalist dark design
- **Soho:** Premium editorial
- **Citrine:** Warm magazine style
- **Verve:** Vibrant creative
- **Minimal:** Clean whitespace
- **Ocean:** Calming blues
- **Forest:** Natural greens`,
        },
        {
          id: "customization",
          title: "Theme Customization",
          content: `**Design Tokens:**
- Typography (fonts, sizes)
- Color schemes
- Content width
- Logo sizing
- Post card styles

**Post Card Styles:**
standard, editorial, minimal, overlay, compact, featured, glass, gradient`,
        },
      ],
    },
    {
      id: "seo-features",
      title: "SEO Features",
      content: `Built-in SEO optimization for all sites.`,
      subsections: [
        {
          id: "meta-tags",
          title: "Meta Tags & OG",
          content: `**Automatic Generation:**
- Title tags with site branding
- Meta descriptions
- Open Graph tags for social sharing
- Twitter Card metadata
- Canonical URLs`,
        },
        {
          id: "structured-data",
          title: "Structured Data (JSON-LD)",
          content: `**Role-Specific Schemas:**
Each article role generates appropriate JSON-LD:
- Article, NewsArticle, TechArticle
- Review (with ratings)
- HowTo (with steps)
- FAQPage (with Q&A)
- ItemList (for rankings/listicles)
- Product (for conversion pages)`,
        },
        {
          id: "sitemaps",
          title: "Sitemaps & Robots",
          content: `**Dynamic Generation:**
- Per-site sitemap.xml with all posts and tags
- Automatic robots.txt with sitemap reference
- CDN caching for performance`,
        },
        {
          id: "ssr",
          title: "Server-Side Rendering",
          content: `**SSR Benefits:**
- Full HTML for search engine crawlers
- Faster perceived load times
- Proper meta tag delivery
- Hydration for interactivity`,
        },
      ],
    },
    {
      id: "public-api",
      title: "Public API",
      content: `Blog Virality provides a RESTful public API for external access to your site's content. The API allows third-party applications, mobile apps, and external services to read posts, access topical authority data, and retrieve analytics.

**Base URL:**
\`https://your-domain.com/bv_api/v1\`

**Authentication:**
All API requests require a Bearer token in the Authorization header:
\`Authorization: Bearer bv_your_api_key_here\`

**Response Format:**
All responses are JSON with consistent structure for errors and pagination.`,
      subsections: [
        {
          id: "api-authentication",
          title: "Authentication & API Keys",
          content: `**Creating API Keys:**
1. Go to Site Settings > API Keys
2. Click "Create Key"
3. Configure name, permissions, and rate limit
4. Copy the key immediately - it's only shown once!

**Key Format:**
Keys start with \`bv_\` prefix (e.g., \`bv_abc123def456...\`)

**Security:**
- Keys are stored as SHA-256 hashes - the actual key is never stored
- Set expiration dates for temporary access
- Disable keys instantly without deleting them
- Monitor usage with request counts and last-used timestamps

**Rate Limiting:**
- Default: 1000 requests per hour
- Configurable per key (100-10,000)
- Returns 429 status when exceeded
- Rate limit resets hourly`,
        },
        {
          id: "api-permissions",
          title: "Permission System",
          content: `**Available Permissions:**

| Permission | Description |
|------------|-------------|
| \`posts_read\` | List and read published posts |
| \`posts_write\` | Create, update, delete posts |
| \`pillars_read\` | View topical authority pillars and articles |
| \`pillars_manage\` | Create and manage pillars |
| \`stats_read\` | Access site statistics and analytics |

**Best Practices:**
- Grant only necessary permissions
- Use separate keys for different applications
- Rotate keys periodically for security`,
        },
        {
          id: "api-posts",
          title: "Posts Endpoints",
          content: `**List Posts**
\`GET /bv_api/v1/posts\`

Query Parameters:
- \`page\` (default: 1) - Page number
- \`limit\` (default: 20, max: 100) - Posts per page
- \`tag\` - Filter by tag
- \`published\` (default: true) - Show only published posts

Response:
\`\`\`json
{
  "posts": [
    {
      "id": "uuid",
      "title": "Post Title",
      "slug": "post-slug",
      "description": "Summary text",
      "content": "Full HTML content",
      "tags": ["tag1", "tag2"],
      "imageUrl": "https://...",
      "publishedAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
\`\`\`

**Get Single Post**
\`GET /bv_api/v1/posts/:slug\`

Returns the full post object for the given slug.

**Post Statistics**
\`GET /bv_api/v1/posts/stats\`
Requires: \`stats_read\` permission

Returns aggregate statistics about the site's posts.`,
        },
        {
          id: "api-pillars",
          title: "Topical Authority Endpoints",
          content: `**List Pillars**
\`GET /bv_api/v1/pillars\`
Requires: \`pillars_read\` permission

Query Parameters:
- \`page\` (default: 1) - Page number
- \`limit\` (default: 20, max: 50) - Pillars per page

Response:
\`\`\`json
{
  "pillars": [
    {
      "id": "uuid",
      "name": "Topic Name",
      "status": "completed",
      "packType": "full_coverage",
      "articleCount": 150,
      "completedArticles": 148,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {...}
}
\`\`\`

**Get Pillar Details**
\`GET /bv_api/v1/pillars/:id\`

Returns full pillar information including clusters.

**List Pillar Articles**
\`GET /bv_api/v1/pillars/:id/articles\`

Query Parameters:
- \`page\`, \`limit\` - Pagination
- \`status\` - Filter by status (pending, generating, completed, failed)
- \`cluster\` - Filter by cluster ID

Returns articles associated with the pillar.`,
        },
        {
          id: "api-errors",
          title: "Error Handling",
          content: `**Error Response Format:**
\`\`\`json
{
  "error": "Error message description",
  "code": "ERROR_CODE"
}
\`\`\`

**Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (missing or invalid API key) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

**Rate Limit Headers:**
- \`X-RateLimit-Limit\`: Your rate limit
- \`X-RateLimit-Remaining\`: Requests remaining
- \`X-RateLimit-Reset\`: Unix timestamp when limit resets`,
        },
        {
          id: "api-examples",
          title: "Code Examples",
          content: `**cURL Example:**
\`\`\`bash
curl -X GET "https://your-domain.com/bv_api/v1/posts?limit=10" \\
  -H "Authorization: Bearer bv_your_api_key" \\
  -H "Content-Type: application/json"
\`\`\`

**JavaScript (fetch):**
\`\`\`javascript
const response = await fetch('https://your-domain.com/bv_api/v1/posts', {
  headers: {
    'Authorization': 'Bearer bv_your_api_key',
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
\`\`\`

**Python (requests):**
\`\`\`python
import requests

response = requests.get(
    'https://your-domain.com/bv_api/v1/posts',
    headers={'Authorization': 'Bearer bv_your_api_key'}
)
data = response.json()
\`\`\``,
        },
      ],
    },
  ],
};
