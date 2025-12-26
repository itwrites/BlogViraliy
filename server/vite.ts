import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createServer as createViteServer, createLogger, type ViteDevServer } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import type { Site, Post } from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDistDir(): string {
  if (process.env.NODE_ENV === "production") {
    return path.dirname(process.argv[1]);
  }
  return __dirname;
}

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function normalizeBasePath(basePath: string | null | undefined): string {
  if (!basePath) return "";
  let normalized = basePath.trim();
  if (!normalized.startsWith("/")) normalized = "/" + normalized;
  if (normalized.endsWith("/")) normalized = normalized.slice(0, -1);
  return normalized;
}

function isPublicRoute(path: string): boolean {
  const adminPaths = ["/admin", "/editor", "/bv_api", "/api"];
  return !adminPaths.some(p => path.startsWith(p));
}

function isReplitDefaultHost(domain: string): boolean {
  return domain.includes("replit.dev") || 
         domain.includes("replit.app") || 
         domain === "blogvirality.brandvirality.com";
}

// Trusted proxy hosts that can use X-BV-Visitor-Host for site lookup
// Format: comma-separated list of domains (supports wildcards with *)
const TRUSTED_PROXY_HOSTS = (process.env.TRUSTED_PROXY_HOSTS || "").split(",").map(h => h.trim()).filter(Boolean);

// Shared secret for authenticating reverse proxy requests
const PROXY_SECRET = process.env.PROXY_SECRET || "";

function isTrustedHost(host: string): boolean {
  if (!host) return false;
  
  for (const trusted of TRUSTED_PROXY_HOSTS) {
    if (trusted.startsWith("*")) {
      // Wildcard match: *.example.com matches sub.example.com
      const suffix = trusted.slice(1);
      if (host.endsWith(suffix)) return true;
    } else {
      // Exact match
      if (host === trusted) return true;
    }
  }
  
  return false;
}

function isAuthenticatedProxyRequest(proxySecretHeader: string | undefined): boolean {
  // If no proxy secret is configured, don't require authentication
  if (!PROXY_SECRET) return true;
  return proxySecretHeader === PROXY_SECRET;
}

async function resolveSite(siteDomain: string, visitorHostname: string, proxySecretHeader?: string): Promise<Site | undefined> {
  // First try to find site by the domain from Host header
  let site = await storage.getSiteByDomain(siteDomain);
  
  // PROXY MODE: If no site found by domain, try looking up by visitor hostname
  // This supports reverse_proxy deployment mode where primary domain can be empty
  // and the site is identified by X-BV-Visitor-Host header (proxyVisitorHostname field)
  // SECURITY: Only honor this fallback when:
  // 1. Host header is from a trusted source
  // 2. Request is authenticated with PROXY_SECRET (if configured)
  const isTrustedProxyHost = isReplitDefaultHost(siteDomain) || isTrustedHost(siteDomain);
  const isAuthenticated = isAuthenticatedProxyRequest(proxySecretHeader);
  if (!site && visitorHostname && isTrustedProxyHost && isAuthenticated) {
    log(`[SSR] Trying proxy mode lookup by visitor hostname: ${visitorHostname} (trusted host: ${siteDomain}, authenticated: ${isAuthenticated})`, "ssr");
    site = await storage.getSiteByVisitorHostname(visitorHostname);
    if (site) {
      log(`[SSR] Found site via proxy mode: domain=${site.domain || '(empty)'}, proxyVisitorHostname=${site.proxyVisitorHostname}, visitor=${visitorHostname}`, "ssr");
      // Security warning if no proxy secret is configured
      if (!PROXY_SECRET) {
        console.warn(`[SECURITY WARNING] Proxy mode lookup succeeded without PROXY_SECRET configured. Set PROXY_SECRET environment variable and configure nginx to send X-BV-Proxy-Secret header for secure proxy mode.`);
      }
    }
  }
  
  return site;
}

function getCanonicalPostRedirect(
  routePath: string,
  postUrlFormat: "with-prefix" | "root",
  basePath: string
): string | null {
  const systemRoutes = [
    "rss.xml", "sitemap.xml", "robots.txt", "favicon.ico", "favicon.png",
    "manifest.json", "sw.js", "service-worker.js", "about", "contact",
    "privacy", "terms", "search", "categories", "archives", "tag", "topics"
  ];
  
  // Check if URL is in /post/:slug format
  const postPrefixMatch = routePath.match(/^\/post\/(.+)$/);
  if (postPrefixMatch && postUrlFormat === "root") {
    // URL has /post/ but site uses root format - redirect to /:slug
    const slug = postPrefixMatch[1];
    const canonicalPath = basePath ? `${basePath}/${slug}` : `/${slug}`;
    log(`[Canonical] /post/${slug} -> ${canonicalPath} (postUrlFormat=root)`, "ssr");
    return canonicalPath;
  }
  
  // Check if URL is in /:slug format (single segment, not a system route)
  const rootSlugMatch = routePath.match(/^\/([^\/]+)$/);
  if (rootSlugMatch && postUrlFormat === "with-prefix") {
    const slug = rootSlugMatch[1];
    // Skip system routes
    if (systemRoutes.includes(slug.toLowerCase()) || 
        routePath.startsWith("/tag/") || 
        routePath.startsWith("/topics/")) {
      return null;
    }
    // URL is /:slug but site uses with-prefix format - redirect to /post/:slug
    const canonicalPath = basePath ? `${basePath}/post/${slug}` : `/post/${slug}`;
    log(`[Canonical] /${slug} -> ${canonicalPath} (postUrlFormat=with-prefix)`, "ssr");
    return canonicalPath;
  }
  
  return null;
}

/**
 * Resolve the site domain for database lookups.
 * Prioritizes the Host header (which nginx sets to the registered domain like blog.vyfy.co.uk)
 * over visitor-facing headers. This ensures we look up the correct site in the database.
 */
function resolveSiteDomain(req: express.Request): string {
  const hostHeader = req.headers["host"];
  const xOriginalHost = req.headers["x-original-host"];
  const xRealHost = req.headers["x-real-host"];
  
  // For database lookups, prioritize Host header (set by nginx to the registered domain)
  // This is what nginx sends: proxy_set_header Host blog.vyfy.co.uk;
  return (
    (typeof hostHeader === "string" ? hostHeader.split(":")[0] : null) ||
    (typeof xOriginalHost === "string" ? xOriginalHost.split(":")[0] : null) ||
    (typeof xRealHost === "string" ? xRealHost.split(":")[0] : null) ||
    req.hostname
  );
}

/**
 * Resolve the visitor-facing hostname for URL generation.
 * Prioritizes X-BV-Visitor-Host (which nginx sets to the visitor's actual domain like vyfy.co.uk)
 * This is used to generate URLs that match what the visitor sees in their browser.
 */
function resolveVisitorHostname(req: express.Request): string {
  const xBvVisitorHost = req.headers["x-bv-visitor-host"];
  const xForwardedHost = req.headers["x-forwarded-host"];
  const xOriginalHost = req.headers["x-original-host"];
  const xRealHost = req.headers["x-real-host"];
  
  // For visitor-facing URLs, prioritize X-BV-Visitor-Host (the actual domain visitor used)
  // This is what nginx sends: proxy_set_header X-BV-Visitor-Host vyfy.co.uk;
  return (
    (typeof xBvVisitorHost === "string" ? xBvVisitorHost.split(",")[0].trim().split(":")[0] : null) ||
    (typeof xForwardedHost === "string" ? xForwardedHost.split(",")[0].trim().split(":")[0] : null) ||
    (typeof xOriginalHost === "string" ? xOriginalHost.split(":")[0] : null) ||
    (typeof xRealHost === "string" ? xRealHost.split(":")[0] : null) ||
    req.hostname
  );
}

// Exported for diagnostic endpoint
export interface RouteAnalysis {
  routePath: string;
  decodedRoutePath: string;
  routeType: "home" | "post-prefix" | "post-root" | "tag" | "topics" | "system" | "unknown";
  extractedSlug: string | null;
  isSystemRoute: boolean;
  postPrefixMatch: boolean;
  rootSlugMatch: boolean;
}

export function analyzeRouteForPost(routePath: string): RouteAnalysis {
  const decodedRoutePath = decodeURIComponent(routePath);
  
  const systemRoutes = [
    "rss.xml", "sitemap.xml", "robots.txt", "favicon.ico", "favicon.png",
    "manifest.json", "sw.js", "service-worker.js", "about", "contact",
    "privacy", "terms", "search", "categories", "archives"
  ];
  
  // Check for home page
  if (decodedRoutePath === "/" || decodedRoutePath === "") {
    return {
      routePath,
      decodedRoutePath,
      routeType: "home",
      extractedSlug: null,
      isSystemRoute: false,
      postPrefixMatch: false,
      rootSlugMatch: false,
    };
  }
  
  // Check for /post/:slug format
  const postMatch = decodedRoutePath.match(/^\/post\/(.+)$/);
  if (postMatch) {
    return {
      routePath,
      decodedRoutePath,
      routeType: "post-prefix",
      extractedSlug: postMatch[1],
      isSystemRoute: false,
      postPrefixMatch: true,
      rootSlugMatch: false,
    };
  }
  
  // Check for tag archives
  if (decodedRoutePath.startsWith("/tag/")) {
    const tagMatch = decodedRoutePath.match(/^\/tag\/(.+)$/);
    return {
      routePath,
      decodedRoutePath,
      routeType: "tag",
      extractedSlug: tagMatch ? decodeURIComponent(tagMatch[1]) : null,
      isSystemRoute: false,
      postPrefixMatch: false,
      rootSlugMatch: false,
    };
  }
  
  // Check for topics archives
  if (decodedRoutePath.startsWith("/topics/")) {
    const topicsMatch = decodedRoutePath.match(/^\/topics\/(.+)$/);
    return {
      routePath,
      decodedRoutePath,
      routeType: "topics",
      extractedSlug: topicsMatch ? decodeURIComponent(topicsMatch[1]) : null,
      isSystemRoute: false,
      postPrefixMatch: false,
      rootSlugMatch: false,
    };
  }
  
  // Try root format: /:slug
  const slugMatch = decodedRoutePath.match(/^\/([^\/]+)$/);
  if (slugMatch) {
    const slug = slugMatch[1];
    const isSystem = systemRoutes.includes(slug.toLowerCase());
    return {
      routePath,
      decodedRoutePath,
      routeType: isSystem ? "system" : "post-root",
      extractedSlug: isSystem ? null : slug,
      isSystemRoute: isSystem,
      postPrefixMatch: false,
      rootSlugMatch: true,
    };
  }
  
  // Multi-segment path - try as slug
  if (decodedRoutePath.startsWith("/")) {
    const slug = decodedRoutePath.slice(1);
    return {
      routePath,
      decodedRoutePath,
      routeType: "post-root",
      extractedSlug: slug,
      isSystemRoute: false,
      postPrefixMatch: false,
      rootSlugMatch: false,
    };
  }
  
  return {
    routePath,
    decodedRoutePath,
    routeType: "unknown",
    extractedSlug: null,
    isSystemRoute: false,
    postPrefixMatch: false,
    rootSlugMatch: false,
  };
}

// Generate SEO meta tags for SSR
interface SeoMetaOptions {
  site: Site;
  routePath: string;
  post?: Post;
  currentTag?: string;
  visitorHostname?: string;
}

async function generateSeoMetaTags(options: SeoMetaOptions): Promise<string> {
  const { site, routePath, post, currentTag, visitorHostname } = options;
  const tags: string[] = [];
  
  // Determine canonical domain:
  // 1. Use site.domain if not empty
  // 2. Use site.proxyVisitorHostname if in reverse proxy mode
  // 3. Fall back to visitorHostname from request
  let canonicalDomain = site.domain;
  if (!canonicalDomain || canonicalDomain.trim() === '') {
    if (site.deploymentMode === 'reverse_proxy' && site.proxyVisitorHostname) {
      canonicalDomain = site.proxyVisitorHostname;
    } else if (visitorHostname) {
      canonicalDomain = visitorHostname;
    }
  }
  
  // Build canonical URL
  const basePath = normalizeBasePath(site.basePath);
  let canonicalPath = routePath;
  
  // For posts, build proper canonical path based on postUrlFormat
  if (post) {
    const postUrlFormat = (site.postUrlFormat as "with-prefix" | "root") || "with-prefix";
    canonicalPath = postUrlFormat === "with-prefix" 
      ? `/post/${post.slug}` 
      : `/${post.slug}`;
  }
  
  // Apply basePath to canonical path
  const fullCanonicalPath = basePath ? `${basePath}${canonicalPath}` : canonicalPath;
  const canonicalUrl = `https://${canonicalDomain}${fullCanonicalPath}`;
  
  // Determine title and description
  let title = site.metaTitle || site.title;
  let description = site.metaDescription || `Welcome to ${site.title}`;
  let ogImage = site.ogImage || null;
  let pageType = 'website';
  
  if (post) {
    title = post.metaTitle || post.title;
    pageType = 'article';
    
    // Generate description from post
    if (post.metaDescription) {
      description = post.metaDescription;
    } else if (post.content) {
      const text = post.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (text.length <= 160) {
        description = text;
      } else {
        const truncated = text.substring(0, 157);
        const lastSpace = truncated.lastIndexOf(' ');
        description = (lastSpace > 100 ? truncated.substring(0, lastSpace) : truncated) + '...';
      }
    }
    
    ogImage = post.ogImage || post.imageUrl || site.ogImage || null;
  } else if (currentTag) {
    title = `${currentTag} - ${site.title}`;
    description = `Articles tagged with ${currentTag} on ${site.title}`;
  }
  
  // Escape HTML entities
  const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Title tag
  tags.push(`<title>${escapeHtml(title)}</title>`);
  
  // Canonical URL
  tags.push(`<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`);
  
  // Basic meta tags
  tags.push(`<meta name="description" content="${escapeHtml(description)}">`);
  
  // Language/hreflang
  const language = site.displayLanguage || 'en';
  tags.push(`<link rel="alternate" hreflang="${language}" href="${escapeHtml(canonicalUrl)}">`);
  tags.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}">`);
  
  // Open Graph tags
  tags.push(`<meta property="og:title" content="${escapeHtml(title)}">`);
  tags.push(`<meta property="og:description" content="${escapeHtml(description)}">`);
  tags.push(`<meta property="og:type" content="${pageType}">`);
  tags.push(`<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`);
  tags.push(`<meta property="og:site_name" content="${escapeHtml(site.title)}">`);
  tags.push(`<meta property="og:locale" content="${language.replace('-', '_')}">`);
  
  if (ogImage) {
    tags.push(`<meta property="og:image" content="${escapeHtml(ogImage)}">`);
  }
  
  // Article-specific meta tags
  if (post) {
    // Author - use site title as fallback since posts don't have author field
    tags.push(`<meta property="article:author" content="${escapeHtml(site.title)}">`);
    
    if (post.createdAt) {
      const publishedTime = new Date(post.createdAt).toISOString();
      tags.push(`<meta property="article:published_time" content="${publishedTime}">`);
    }
    if (post.updatedAt) {
      const modifiedTime = new Date(post.updatedAt).toISOString();
      tags.push(`<meta property="article:modified_time" content="${modifiedTime}">`);
    }
    // Add article section (first tag if available)
    if (post.tags && post.tags.length > 0) {
      tags.push(`<meta property="article:section" content="${escapeHtml(post.tags[0])}">`);
      // Add all tags
      post.tags.forEach(tag => {
        tags.push(`<meta property="article:tag" content="${escapeHtml(tag)}">`);
      });
    }
  }
  
  // Twitter Card tags
  tags.push(`<meta name="twitter:card" content="summary_large_image">`);
  tags.push(`<meta name="twitter:title" content="${escapeHtml(title)}">`);
  tags.push(`<meta name="twitter:description" content="${escapeHtml(description)}">`);
  if (ogImage) {
    tags.push(`<meta name="twitter:image" content="${escapeHtml(ogImage)}">`);
  }
  
  // Noindex for post if specified
  if (post?.noindex) {
    tags.push(`<meta name="robots" content="noindex">`);
  }
  
  // Favicon
  if (site.favicon) {
    tags.push(`<link rel="icon" href="${escapeHtml(site.favicon)}">`);
  }
  
  // JSON-LD structured data - role-specific for posts
  if (post) {
    const { generateRoleBasedJsonLd } = await import("./json-ld-generator");
    const jsonLd = generateRoleBasedJsonLd({
      post,
      site,
      canonicalUrl,
      description,
      language
    });
    
    // Remove undefined values
    const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));
    tags.push(`<script type="application/ld+json">${JSON.stringify(cleanJsonLd).replace(/</g, '\\u003c')}</script>`);
  } else {
    // Website JSON-LD for home page
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": site.title,
      "url": `https://${site.domain}${basePath || ''}`,
      "description": description,
      "inLanguage": language
    };
    tags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`);
  }
  
  return tags.join('\n    ');
}

async function getSSRData(site: Site, routePath: string): Promise<{
  posts?: Post[];
  post?: Post;
  relatedPosts?: Post[];
  tagPosts?: Post[];
  currentTag?: string;
}> {
  const postUrlFormat = (site.postUrlFormat as "with-prefix" | "root") || "with-prefix";
  const analysis = analyzeRouteForPost(routePath);
  
  log(`[getSSRData] routePath="${routePath}", analysis=${JSON.stringify(analysis)}, postUrlFormat="${postUrlFormat}", siteId=${site.id}`, "ssr");
  
  // Home page
  if (analysis.routeType === "home") {
    const posts = await storage.getPostsBySiteId(site.id);
    log(`[getSSRData] Home page, found ${posts?.length || 0} posts`, "ssr");
    return { posts };
  }

  // Post pages (both /post/:slug and /:slug formats)
  if ((analysis.routeType === "post-prefix" || analysis.routeType === "post-root") && analysis.extractedSlug) {
    const slug = analysis.extractedSlug;
    log(`[getSSRData] Looking up post with slug="${slug}", routeType="${analysis.routeType}"`, "ssr");
    const post = await storage.getPostBySlug(site.id, slug);
    if (post) {
      // Wrap relatedPosts in try/catch so it can't crash SSR
      let relatedPosts: Post[] = [];
      try {
        relatedPosts = await storage.getRelatedPosts(post.id, site.id);
      } catch (e) {
        log(`[getSSRData] Error fetching related posts: ${e instanceof Error ? e.message : String(e)}`, "ssr");
      }
      log(`[getSSRData] Found post id=${post.id}, title="${post.title}", relatedPosts=${relatedPosts.length}`, "ssr");
      return { post, relatedPosts };
    }
    log(`[getSSRData] No post found for slug="${slug}"`, "ssr");
  }

  // Tag archives
  if (analysis.routeType === "tag" && analysis.extractedSlug) {
    const tag = analysis.extractedSlug;
    const allPosts = await storage.getPostsBySiteId(site.id);
    const tagPosts = allPosts.filter((p: Post) => 
      p.tags?.some((t: string) => t.toLowerCase() === tag.toLowerCase())
    );
    log(`[getSSRData] Tag archive: tag="${tag}", found ${tagPosts.length} posts`, "ssr");
    return { tagPosts, currentTag: tag };
  }

  // Topics archives
  if (analysis.routeType === "topics" && analysis.extractedSlug) {
    const groupSlug = analysis.extractedSlug;
    const menuItems = await storage.getMenuItemsBySiteId(site.id);
    const tagGroup = menuItems?.find(item => item.type === 'tag-group' && item.groupSlug === groupSlug);
    if (tagGroup && tagGroup.tagSlugs) {
      const allPosts = await storage.getPostsBySiteId(site.id);
      const tagPosts = allPosts.filter((p: Post) => 
        p.tags?.some((t: string) => 
          tagGroup.tagSlugs!.some((groupTag: string) => groupTag.toLowerCase() === t.toLowerCase())
        )
      );
      log(`[getSSRData] Topics archive: groupSlug="${groupSlug}", tags=${JSON.stringify(tagGroup.tagSlugs)}, found ${tagPosts.length} posts`, "ssr");
      return { tagPosts, currentTag: groupSlug };
    }
    log(`[getSSRData] Topics archive: groupSlug="${groupSlug}" not found in menu items`, "ssr");
  }

  log(`[getSSRData] No match found for routeType="${analysis.routeType}", returning empty`, "ssr");
  return {};
}

async function renderSSR(
  vite: ViteDevServer,
  site: Site,
  routePath: string,
  fullPath: string,
  template: string,
  isAliasDomain: boolean,
  visitorHostname: string
): Promise<string> {
  try {
    const { render } = await vite.ssrLoadModule("/src/entry-server.tsx");
    const ssrData = await getSSRData(site, routePath);
    
    // Always use fullPath for SSR since Router base is always basePath
    // Both alias and primary domains use the same routing structure
    const ssrPath = fullPath;
    const { html, dehydratedState } = render({
      site,
      path: routePath,
      ssrPath,
      isAliasDomain,
      visitorHostname,
      ...ssrData,
    });

    const ssrDataScript = `<script>window.__SSR_DATA__ = ${JSON.stringify({
      site,
      dehydratedState,
      ssrPath,
      isAliasDomain,
      visitorHostname,
    }).replace(/</g, "\\u003c")}</script>`;

    // Generate SEO meta tags
    const seoTags = await generateSeoMetaTags({
      site,
      routePath,
      post: ssrData.post,
      currentTag: ssrData.currentTag,
      visitorHostname,
    });

    // Remove existing <title> tag (from template) to avoid duplicates
    let page = template.replace(/<title>[^<]*<\/title>/i, '');
    
    // Inject SEO tags, SSR data script, and rendered HTML
    page = page
      .replace(`<div id="root"></div>`, `<div id="root">${html}</div>`)
      .replace(`</head>`, `${seoTags}\n    ${ssrDataScript}\n  </head>`);

    return page;
  } catch (e) {
    vite.ssrFixStacktrace(e as Error);
    console.error("[SSR Error]", e);
    return template;
  }
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      template = await vite.transformIndexHtml(url, template);

      // Use resolveSiteDomain for database lookup (prioritizes Host header)
      const siteDomain = resolveSiteDomain(req);
      // Use resolveVisitorHostname for URL generation (prioritizes X-BV-Visitor-Host)
      const visitorHostname = resolveVisitorHostname(req);
      // Get proxy secret for authentication
      const proxySecret = req.headers["x-bv-proxy-secret"] as string | undefined;
      
      log(`[SSR-Dev] Request: siteDomain=${siteDomain}, visitorHostname=${visitorHostname}, url=${url}`, "ssr");
      const site = await resolveSite(siteDomain, visitorHostname, proxySecret);
      log(`[SSR-Dev] Site lookup: ${site ? `found (${site.id})` : 'not found'}`, "ssr");
      
      if (site && isPublicRoute(url)) {
        const basePath = normalizeBasePath(site.basePath);
        const fullPath = url.split("?")[0];
        let routePath = fullPath;
        if (basePath && routePath.startsWith(basePath)) {
          routePath = routePath.slice(basePath.length) || "/";
        }
        
        // Normalize trailing slashes
        if (routePath.length > 1 && routePath.endsWith("/")) {
          routePath = routePath.slice(0, -1);
        }
        
        // Check for canonical URL redirect before SSR
        const postUrlFormat = (site.postUrlFormat as "with-prefix" | "root") || "with-prefix";
        const canonicalRedirect = getCanonicalPostRedirect(routePath, postUrlFormat, basePath);
        if (canonicalRedirect) {
          log(`[SSR-Dev] Canonical redirect: ${routePath} -> ${canonicalRedirect}`, "ssr");
          res.redirect(308, canonicalRedirect);
          return;
        }
        
        // Determine if accessed via alias domain (visitor hostname differs from registered domain)
        const isAliasDomain = visitorHostname !== site.domain;

        log(`[SSR] Rendering siteDomain=${siteDomain}, visitorHostname=${visitorHostname}, url=${url} -> route: ${routePath}, fullPath: ${fullPath}, isAlias=${isAliasDomain}`, "ssr");
        const page = await renderSSR(vite, site, routePath, fullPath, template, isAliasDomain, visitorHostname);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } else {
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      }
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export async function serveStatic(app: Express) {
  const distDir = getDistDir();
  const distPath = path.resolve(distDir, "public");
  const ssrPath = path.resolve(distDir, "server", "entry-server.js");
  
  log(`[SSR] distDir: ${distDir}, distPath: ${distPath}, ssrPath: ${ssrPath}`, "ssr");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  let ssrRender: ((ctx: any) => { html: string; dehydratedState: unknown }) | null = null;
  
  if (fs.existsSync(ssrPath)) {
    try {
      const ssrUrl = pathToFileURL(ssrPath).href;
      log(`[SSR] Loading SSR bundle from: ${ssrUrl}`, "ssr");
      const ssrModule = await import(ssrUrl);
      ssrRender = ssrModule.render;
      log("[SSR] SSR module loaded successfully", "ssr");
    } catch (e) {
      console.error("[SSR] Failed to load SSR module:", e);
      log(`[SSR] Error loading module: ${e instanceof Error ? e.message : String(e)}`, "ssr");
    }
  } else {
    log(`[SSR] SSR module not found at ${ssrPath}, falling back to client-only rendering`, "ssr");
  }

  const templatePath = path.resolve(distPath, "index.html");
  const template = fs.readFileSync(templatePath, "utf-8");

  app.use(express.static(distPath, {
    index: false,
  }));

  app.use("*", async (req, res) => {
    const url = req.originalUrl;
    
    try {
      // Use resolveSiteDomain for database lookup (prioritizes Host header)
      const siteDomain = resolveSiteDomain(req);
      // Use resolveVisitorHostname for URL generation (prioritizes X-BV-Visitor-Host)
      const visitorHostname = resolveVisitorHostname(req);
      // Get proxy secret for authentication
      const proxySecret = req.headers["x-bv-proxy-secret"] as string | undefined;
      
      log(`[SSR-Prod] Request: siteDomain=${siteDomain}, visitorHostname=${visitorHostname}, url=${url}, ssrRender=${!!ssrRender}`, "ssr");
      const site = await resolveSite(siteDomain, visitorHostname, proxySecret);
      log(`[SSR-Prod] Site lookup: ${site ? `found (${site.id})` : 'not found'}, isPublic=${isPublicRoute(url)}`, "ssr");
      
      if (site && ssrRender && isPublicRoute(url)) {
        const basePath = normalizeBasePath(site.basePath);
        const fullPath = url.split("?")[0];
        let routePath = fullPath;
        if (basePath && routePath.startsWith(basePath)) {
          routePath = routePath.slice(basePath.length) || "/";
        }
        
        // Normalize trailing slashes
        if (routePath.length > 1 && routePath.endsWith("/")) {
          routePath = routePath.slice(0, -1);
        }
        
        // Check for canonical URL redirect before SSR
        const postUrlFormat = (site.postUrlFormat as "with-prefix" | "root") || "with-prefix";
        const canonicalRedirect = getCanonicalPostRedirect(routePath, postUrlFormat, basePath);
        if (canonicalRedirect) {
          log(`[SSR-Prod] Canonical redirect: ${routePath} -> ${canonicalRedirect}`, "ssr");
          res.redirect(308, canonicalRedirect);
          return;
        }
        
        // Determine if accessed via alias domain (visitor hostname differs from registered domain)
        const isAliasDomain = visitorHostname !== site.domain;
        // Always use fullPath for SSR since Router base is always basePath
        // Both alias and primary domains use the same routing structure
        const ssrPath = fullPath;

        log(`[SSR-Prod] Rendering siteDomain=${siteDomain}, visitorHostname=${visitorHostname}, url=${url} -> route: ${routePath}, fullPath: ${fullPath}, ssrPath: ${ssrPath}, isAlias=${isAliasDomain}, basePath=${basePath}`, "ssr");
        
        const ssrData = await getSSRData(site, routePath);
        log(`[SSR-Prod] SSR data: hasPost=${!!ssrData.post}, hasPosts=${!!ssrData.posts}, hasTagPosts=${!!ssrData.tagPosts}`, "ssr");
        
        const { html, dehydratedState } = ssrRender({
          site,
          path: routePath,
          ssrPath,
          isAliasDomain,
          visitorHostname,
          ...ssrData,
        });

        log(`[SSR-Prod] Rendered HTML length: ${html?.length || 0}`, "ssr");

        const ssrDataScript = `<script>window.__SSR_DATA__ = ${JSON.stringify({
          site,
          dehydratedState,
          ssrPath,
          isAliasDomain,
          visitorHostname,
        }).replace(/</g, "\\u003c")}</script>`;

        // Generate SEO meta tags
        const seoTags = await generateSeoMetaTags({
          site,
          routePath,
          post: ssrData.post,
          currentTag: ssrData.currentTag,
          visitorHostname,
        });

        // Remove existing <title> tag (from template) to avoid duplicates
        let page = template.replace(/<title>[^<]*<\/title>/i, '');
        
        // Inject SEO tags, SSR data script, and rendered HTML
        page = page
          .replace(`<div id="root"></div>`, `<div id="root">${html}</div>`)
          .replace(`</head>`, `${seoTags}\n    ${ssrDataScript}\n  </head>`);

        res.status(200).set({ "Content-Type": "text/html" }).end(page);
      } else {
        log(`[SSR-Prod] Skipping SSR: site=${!!site}, ssrRender=${!!ssrRender}, isPublic=${isPublicRoute(url)}`, "ssr");
        res.sendFile(templatePath);
      }
    } catch (e) {
      console.error("[SSR Error]", e);
      log(`[SSR-Prod] Error: ${e instanceof Error ? e.message : String(e)}`, "ssr");
      res.sendFile(templatePath);
    }
  });
}
