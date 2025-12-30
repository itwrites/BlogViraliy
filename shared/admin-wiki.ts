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
  lastUpdated: "2024-12-30",
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
  ],
};
