import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { storage } from "./storage";
import { pool } from "./db";
import { insertSiteSchema, insertPostSchema, insertUserSchema, insertPillarSchema, type User, PLAN_LIMITS } from "@shared/schema";
import { startAutomationSchedulers } from "./automation";
import { generateSitemap, invalidateSitemapCache, getSitemapStats } from "./sitemap";
import { normalizeBasePath } from "./utils";
import { rewriteHtmlForBasePath, rewriteInternalPostLinks, SiteUrlConfig } from "./html-rewriter";
import { analyzeRouteForPost } from "./vite";
import { createPublicApiRouter, generateApiKey } from "./public-api";
import { searchPexelsImage } from "./pexels";
import { generateTopicSuggestions } from "./openai";

async function ensureAdminUser() {
  try {
    const existingAdmin = await storage.getUserByUsername("admin");
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await storage.createUser({
        username: "admin",
        password: hashedPassword,
      });
      console.log("[Seed] Created default admin user (username: admin, password: admin123)");
    }
  } catch (error) {
    console.error("[Seed] Failed to ensure admin user:", error);
  }
}

// View tracking deduplication cache (IP+slug -> timestamp)
// Used to prevent the same visitor from counting multiple views
const viewCache = new Map<string, number>();
const VIEW_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// Clean up old entries periodically (every hour)
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(viewCache.entries());
  for (const [key, timestamp] of entries) {
    if (now - timestamp > VIEW_COOLDOWN_MS) {
      viewCache.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Rate limiter for view tracking endpoint
const viewTrackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 view requests per IP per minute
  message: { error: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default key generator which handles IPv6 properly
  // The X-Forwarded-For is automatically used when trust proxy is set
});

// Auth rate limits and lockout tracking
const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max login attempts per IP per window
  message: { error: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max registrations per IP per window
  message: { error: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const AUTH_FAILURE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_FAILURES = 5;
const AUTH_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_CLEANUP_INTERVAL_MS = 60 * 1000;

type AuthFailureState = {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
};

const authFailureTracker = new Map<string, AuthFailureState>();

const getAuthKey = (req: Request, email?: string): string => {
  const ip = req.ip || "unknown";
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail ? `${ip}|${normalizedEmail}` : `ip:${ip}`;
};

const checkAuthLockout = (key: string): { locked: boolean; retryAfterMs: number } => {
  const entry = authFailureTracker.get(key);
  if (!entry) return { locked: false, retryAfterMs: 0 };
  const now = Date.now();
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { locked: true, retryAfterMs: entry.lockedUntil - now };
  }
  if (now - entry.firstAttemptAt > AUTH_FAILURE_WINDOW_MS) {
    authFailureTracker.delete(key);
  }
  return { locked: false, retryAfterMs: 0 };
};

const recordAuthFailure = (key: string): { locked: boolean; retryAfterMs: number } => {
  const now = Date.now();
  let entry = authFailureTracker.get(key);
  if (!entry || now - entry.firstAttemptAt > AUTH_FAILURE_WINDOW_MS) {
    entry = { count: 0, firstAttemptAt: now };
  }

  entry.count += 1;
  if (entry.count >= AUTH_MAX_FAILURES) {
    entry.lockedUntil = now + AUTH_LOCKOUT_MS;
  }

  authFailureTracker.set(key, entry);
  return checkAuthLockout(key);
};

const clearAuthFailures = (key: string) => {
  authFailureTracker.delete(key);
};

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of authFailureTracker.entries()) {
    const windowExpired = now - entry.firstAttemptAt > AUTH_FAILURE_WINDOW_MS;
    const lockExpired = entry.lockedUntil ? entry.lockedUntil <= now : true;
    if (windowExpired && lockExpired) {
      authFailureTracker.delete(key);
    }
  }
}, AUTH_CLEANUP_INTERVAL_MS);

const ensureCsrfToken = (req: Request): string | null => {
  if (!req.session) return null;
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  return req.session.csrfToken;
};

const ADMIN_DOMAIN = process.env.ADMIN_DOMAIN || "localhost";

// Trusted proxy hosts that can use X-BV-Visitor-Host for site lookup
// Format: comma-separated list of domains (supports wildcards with *)
// Example: TRUSTED_PROXY_HOSTS=blog.vyfy.co.uk,proxy.example.com,*.mycompany.com
const TRUSTED_PROXY_HOSTS = (process.env.TRUSTED_PROXY_HOSTS || "").split(",").map(h => h.trim()).filter(Boolean);

// Shared secret for authenticating reverse proxy requests
// When set, requests must include X-BV-Proxy-Secret header matching this value
// to use the visitor hostname lookup fallback
const PROXY_SECRET = process.env.PROXY_SECRET || "";

function isTrustedHost(host: string): boolean {
  if (!host) return false;
  
  for (const trusted of TRUSTED_PROXY_HOSTS) {
    if (trusted.startsWith("*")) {
      // Wildcard match: *.example.com matches sub.example.com
      const suffix = trusted.slice(1); // Remove the *
      if (host.endsWith(suffix)) return true;
    } else {
      // Exact match
      if (host === trusted) return true;
    }
  }
  
  return false;
}

function isAuthenticatedProxyRequest(req: Request): boolean {
  // If no proxy secret is configured, don't require authentication
  // (backwards compatible, but less secure)
  if (!PROXY_SECRET) return true;
  
  const proxySecret = req.headers["x-bv-proxy-secret"];
  return proxySecret === PROXY_SECRET;
}

function hasValidBusinessProfile(site: any): boolean {
  return Boolean(site?.businessDescription && site.businessDescription.trim().length > 0);
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    userRole?: string;
    csrfToken?: string;
  }
}

interface DomainRequest extends Request {
  siteId?: string;
  siteBasePath?: string;
  siteHostname?: string;  // The site's primary domain (for internal logic)
  siteVisitorHostname?: string;  // The visitor's actual hostname (for URL generation, alias detection)
  sitePrimaryDomain?: string;  // The site's primary domain (for alias detection)
}

interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const isProduction = process.env.NODE_ENV === "production";
  
  // Ensure admin user exists on startup (works in both dev and prod)
  await ensureAdminUser();
  
  app.set("trust proxy", 1);
  
  // Cookie parser for reading view tracking cookies
  app.use(cookieParser());
  
  // PostgreSQL session store for persistent sessions
  const PgSession = connectPgSimple(session);
  
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "chameleonweb-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: isProduction ? "none" : "lax",
      },
    })
  );

  // Rewrite /bv_api/ to /api/ for reverse proxy deployments
  // This allows sites behind a proxy to use /bv_api/ prefix without conflicts
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/bv_api/") || req.path === "/bv_api") {
      const originalPath = req.path;
      req.url = req.url.replace(/^\/bv_api/, "/api");
      console.log(`[bv_api rewrite] ${originalPath} -> ${req.url}`);
    }
    next();
  });

  // CSRF token endpoint (used by the SPA to fetch a token)
  app.get("/api/auth/csrf", (req: Request, res: Response) => {
    const token = ensureCsrfToken(req);
    if (!token) {
      return res.status(500).json({ error: "CSRF token unavailable" });
    }
    res.setHeader("x-csrf-token", token);
    res.json({ csrfToken: token });
  });

  // CSRF protection for session-authenticated state-changing requests
  const csrfSafeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (csrfSafeMethods.has(req.method)) return next();
    if (!req.session?.userId) return next();

    const path = req.path;
    if (path === "/api/auth/login" || path === "/api/auth/register" || path === "/api/auth/csrf") {
      return next();
    }

    const sentToken = req.get("x-csrf-token");
    const sessionToken = ensureCsrfToken(req);
    if (!sessionToken || !sentToken || sentToken !== sessionToken) {
      return res.status(403).json({ error: "Invalid CSRF token" });
    }

    return next();
  });

  // Domain detection middleware
  app.use(async (req: DomainRequest, res: Response, next: NextFunction) => {
    // Log ALL headers for debugging proxy issues
    if (req.path === "/" || req.path === "/api/domain-check") {
      console.log(`[ALL HEADERS] path=${req.path}`, JSON.stringify(req.headers, null, 2));
    }
    
    // Check multiple headers that proxies might use
    const xBvVisitorHost = req.headers["x-bv-visitor-host"];
    const xForwardedHost = req.headers["x-forwarded-host"];
    const xOriginalHost = req.headers["x-original-host"];
    const xRealHost = req.headers["x-real-host"];
    const hostHeader = req.headers["host"];
    
    // SITE DOMAIN: Used for database lookup - prioritizes Host header
    // This is what nginx sets to the registered domain: proxy_set_header Host blog.vyfy.co.uk;
    const siteDomain = 
      (typeof hostHeader === "string" ? hostHeader.split(":")[0] : null) ||
      (typeof xOriginalHost === "string" ? xOriginalHost.split(":")[0] : null) ||
      (typeof xRealHost === "string" ? xRealHost.split(":")[0] : null) ||
      req.hostname;
    
    // VISITOR HOSTNAME: Used for URL generation - prioritizes X-BV-Visitor-Host
    // This is what nginx sets to the visitor's actual domain: proxy_set_header X-BV-Visitor-Host vyfy.co.uk;
    const visitorHostname = 
      (typeof xBvVisitorHost === "string" ? xBvVisitorHost.split(",")[0].trim().split(":")[0] : null) ||
      (typeof xForwardedHost === "string" ? xForwardedHost.split(",")[0].trim().split(":")[0] : null) ||
      (typeof xOriginalHost === "string" ? xOriginalHost.split(":")[0] : null) ||
      (typeof xRealHost === "string" ? xRealHost.split(":")[0] : null) ||
      req.hostname;
    
    // Debug logging for domain routing issues - show all relevant headers
    console.log(`[Domain Routing] siteDomain=${siteDomain}, visitorHostname=${visitorHostname}, Host=${hostHeader}, X-BV-Visitor-Host=${xBvVisitorHost}, X-Forwarded-Host=${xForwardedHost}, req.hostname=${req.hostname}, path=${req.path}`);
    
    const isExplicitAdminDomain = siteDomain === ADMIN_DOMAIN;
    const isReplitDefaultHost = siteDomain.includes("replit.dev") || siteDomain.includes("replit.app") || siteDomain === "blogvirality.brandvirality.com";
    
    if (isExplicitAdminDomain) {
      req.siteId = undefined;
      req.siteBasePath = "";
      return next();
    }

    // Use siteDomain for database lookup (from Host header)
    let site = await storage.getSiteByDomain(siteDomain);
    
    // PROXY MODE: If no site found by domain, try looking up by visitor hostname
    // This supports reverse_proxy deployment mode where primary domain can be empty
    // and the site is identified by X-BV-Visitor-Host header (proxyVisitorHostname field)
    // SECURITY: Only honor this fallback when:
    // 1. Host header is from a trusted source (Replit domains or TRUSTED_PROXY_HOSTS)
    // 2. Request is authenticated with PROXY_SECRET (if configured)
    const isTrustedProxyHost = isReplitDefaultHost || isTrustedHost(siteDomain);
    const isAuthenticated = isAuthenticatedProxyRequest(req);
    if (!site && visitorHostname && isTrustedProxyHost && isAuthenticated) {
      console.log(`[Domain Routing] Trying proxy mode lookup by visitor hostname: ${visitorHostname} (trusted host: ${siteDomain}, authenticated: ${isAuthenticated})`);
      site = await storage.getSiteByVisitorHostname(visitorHostname);
      if (site) {
        console.log(`[Domain Routing] Found site via proxy mode: domain=${site.domain || '(empty)'}, proxyVisitorHostname=${site.proxyVisitorHostname}, visitor=${visitorHostname}`);
        // Security warning if no proxy secret is configured
        if (!PROXY_SECRET) {
          console.warn(`[SECURITY WARNING] Proxy mode lookup succeeded without PROXY_SECRET configured. Set PROXY_SECRET environment variable and configure nginx to send X-BV-Proxy-Secret header for secure proxy mode.`);
        }
      }
    } else if (!site && visitorHostname && !isTrustedProxyHost) {
      console.log(`[Domain Routing] Skipping proxy mode lookup - host ${siteDomain} not in trusted list`);
    } else if (!site && visitorHostname && isTrustedProxyHost && !isAuthenticated) {
      console.log(`[Domain Routing] Skipping proxy mode lookup - proxy secret mismatch`);
    }
    
    if (site) {
      console.log(`[Domain Routing] Found site: ${site.domain || '(empty)'}, id=${site.id}, deploymentMode=${site.deploymentMode || 'standalone'}, via siteDomain=${siteDomain}, visitorHostname=${visitorHostname}`);
      req.siteId = site.id;
      req.siteBasePath = normalizeBasePath(site.basePath);
      req.siteHostname = site.domain || undefined;  // Use site's primary domain for internal logic (null -> undefined)
      req.siteVisitorHostname = visitorHostname;  // Save visitor hostname for URL generation and alias detection
      req.sitePrimaryDomain = site.domain || undefined;  // Save the primary domain for alias detection (null -> undefined)
      return next();
    }

    if (isReplitDefaultHost) {
      req.siteId = undefined;
      req.siteBasePath = "";
    } else {
      // Log when domain is not found for debugging
      console.log(`[Domain Routing] Site not found for siteDomain: ${siteDomain}`);
    }
    
    next();
  });

  // Canonical URL redirect middleware for basePath handling
  // - Primary domains with basePath: Redirect root to basePath
  // - Alias domains: No redirect needed (nginx proxies path directly, e.g., vyfy.co.uk/blog -> /blog)
  app.use((req: DomainRequest, res: Response, next: NextFunction) => {
    const basePath = req.siteBasePath;
    const visitorHostname = req.siteVisitorHostname;  // Visitor's actual hostname (e.g., vyfy.co.uk)
    const primaryDomain = req.sitePrimaryDomain;      // Site's registered domain (e.g., blog.vyfy.co.uk)
    
    // Skip if no basePath, no site found, or if it's an API/asset request
    if (!basePath || basePath === "/" || !visitorHostname || !primaryDomain) {
      return next();
    }
    
    // Skip redirects for API calls, assets, and internal paths
    if (req.path.startsWith("/api/") || req.path.startsWith("/bv_api/") || 
        req.path.startsWith("/assets/") || req.path.startsWith("/src/") ||
        req.path.startsWith("/@") || req.path.startsWith("/node_modules/")) {
      return next();
    }
    
    // Alias detection: visitor hostname differs from site's primary domain
    // For vyfy.co.uk/blog/ -> blog.vyfy.co.uk, visitorHostname=vyfy.co.uk, primaryDomain=blog.vyfy.co.uk
    const isAliasDomain = visitorHostname !== primaryDomain;
    
    console.log(`[Canonical Redirect Check] visitorHostname=${visitorHostname}, primaryDomain=${primaryDomain}, isAlias=${isAliasDomain}, path=${req.path}`);
    
    // Only redirect on primary domain: root -> basePath
    // Alias domains don't redirect - they serve content at whatever URL nginx proxies to
    if (!isAliasDomain && req.path === "/") {
      const redirectUrl = basePath + "/";
      console.log(`[Canonical Redirect] Primary domain ${visitorHostname}: root -> ${redirectUrl}`);
      return res.redirect(301, redirectUrl);
    }
    
    next();
  });

  // Strip basePath from incoming URLs for sites with basePath configured
  // This allows asset requests like /blog/assets/* to be served from /assets/*
  app.use((req: DomainRequest, res: Response, next: NextFunction) => {
    const basePath = req.siteBasePath;
    // Skip if no basePath or if basePath is just "/" (shouldn't happen with normalizer)
    if (!basePath || basePath === "/") return next();
    
    // If the request path starts with the basePath, strip it so assets can be served
    if (req.path.startsWith(basePath + "/") || req.path === basePath) {
      let strippedUrl = req.url.substring(basePath.length);
      // Ensure we always have a leading slash
      if (!strippedUrl.startsWith("/")) {
        strippedUrl = "/" + strippedUrl;
      }
      // Only modify req.url - Express will recalculate req.path from it
      req.url = strippedUrl || "/";
    }
    next();
  });

  // Base path asset URL rewriting middleware for reverse proxy support
  // This rewrites asset paths in HTML responses to include the basePath
  app.use((req: DomainRequest, res: Response, next: NextFunction) => {
    const basePath = req.siteBasePath;
    
    // Skip if no basePath configured or if it's an API/asset request
    if (!basePath || req.path.startsWith("/api/") || req.path.startsWith("/assets/") || req.path.startsWith("/src/")) {
      return next();
    }

    // Collect response chunks for HTML rewriting
    let chunks: Buffer[] = [];
    let isHtmlResponse = false;
    
    // Store original methods
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const originalSetHeader = res.setHeader.bind(res);

    // Track if this is an HTML response
    res.setHeader = function(name: string, value: string | number | readonly string[]): Response {
      if (name.toLowerCase() === 'content-type' && String(value).includes('text/html')) {
        isHtmlResponse = true;
      }
      return originalSetHeader(name, value);
    };

    // Intercept write to collect chunks
    (res as any).write = function(chunk: any, encodingOrCallback?: BufferEncoding | ((error: Error | null | undefined) => void), callback?: (error: Error | null | undefined) => void): boolean {
      // Check content type on first write
      const contentType = res.get("Content-Type") || "";
      if (contentType.includes("text/html")) {
        isHtmlResponse = true;
      }
      
      if (isHtmlResponse && chunk) {
        if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk);
        } else if (typeof chunk === "string") {
          chunks.push(Buffer.from(chunk, typeof encodingOrCallback === "string" ? encodingOrCallback : "utf-8"));
        }
        // Return true to indicate write was "successful" - we'll send the actual data in end()
        if (typeof encodingOrCallback === "function") {
          encodingOrCallback(null);
        } else if (callback) {
          callback(null);
        }
        return true;
      }
      
      // For non-HTML responses, pass through normally
      if (typeof encodingOrCallback === "function") {
        return originalWrite(chunk, encodingOrCallback);
      }
      if (encodingOrCallback) {
        return originalWrite(chunk, encodingOrCallback, callback);
      }
      return originalWrite(chunk, callback);
    };

    // Intercept end to rewrite and send HTML
    (res as any).end = function(chunk?: any, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void): Response {
      // Check content type
      const contentType = res.get("Content-Type") || "";
      if (contentType.includes("text/html")) {
        isHtmlResponse = true;
      }
      
      if (isHtmlResponse) {
        // Collect final chunk if provided
        if (chunk) {
          if (Buffer.isBuffer(chunk)) {
            chunks.push(chunk);
          } else if (typeof chunk === "string") {
            chunks.push(Buffer.from(chunk, typeof encodingOrCallback === "string" ? encodingOrCallback : "utf-8"));
          }
        }
        
        // Combine all chunks and rewrite using DOM-based HTML parser
        if (chunks.length > 0) {
          const html = Buffer.concat(chunks).toString("utf-8");
          const rewrittenHtml = rewriteHtmlForBasePath(html, basePath);
          
          // Update content-length header
          res.setHeader("Content-Length", Buffer.byteLength(rewrittenHtml));
          
          // Send rewritten HTML
          originalWrite(rewrittenHtml, "utf-8");
        }
        
        // Call original end without chunk (already sent via write)
        if (typeof encodingOrCallback === "function") {
          return originalEnd(encodingOrCallback);
        }
        return originalEnd(callback);
      }
      
      // For non-HTML responses, pass through normally
      if (typeof encodingOrCallback === "function") {
        return originalEnd(chunk, encodingOrCallback);
      }
      if (encodingOrCallback) {
        return originalEnd(chunk, encodingOrCallback, callback);
      }
      return originalEnd(chunk, callback);
    };

    next();
  });

  // Base authentication middleware
  const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized - Please log in" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user || user.status !== "active") {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Session expired or account inactive" });
    }
    
    req.user = user;
    next();
  };

  // Admin-only middleware
  const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };

  // Permission levels hierarchy (higher index = more permissions)
  const PERMISSION_LEVELS = ["view", "posts_only", "edit", "manage"];
  
  const hasMinimumPermission = (userPermission: string, requiredPermission: string): boolean => {
    const userLevel = PERMISSION_LEVELS.indexOf(userPermission);
    const requiredLevel = PERMISSION_LEVELS.indexOf(requiredPermission);
    return userLevel >= requiredLevel;
  };

  // Site access middleware (for editors) with permission level enforcement
  const requireSiteAccess = (paramName: string = "id", minPermission: string = "view") => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Admins have access to all sites
      if (req.user.role === "admin") {
        return next();
      }
      
      const siteId = req.params[paramName];
      if (!siteId) {
        return res.status(400).json({ error: "Site ID required" });
      }
      
      // Owners have full access to sites they own
      if (req.user.role === "owner") {
        const site = await storage.getSiteById(siteId);
        if (site?.ownerId === req.user.id) {
          return next();
        }
      }
      
      const permission = await storage.getUserSitePermission(req.user.id, siteId);
      if (!permission) {
        return res.status(403).json({ error: "You don't have access to this site" });
      }
      
      if (!hasMinimumPermission(permission, minPermission)) {
        return res.status(403).json({ error: `Insufficient permissions. Required: ${minPermission}` });
      }
      
      next();
    };
  };

  // Subscription access check helper function
  // Returns whether the user has access to premium features based on their subscription status
  async function checkSubscriptionAccess(user: User): Promise<{ hasAccess: boolean; reason?: string }> {
    // Admins always have access
    if (user.role === "admin") {
      return { hasAccess: true };
    }
    // Editors always have access (they work for the owner)
    if (user.role === "editor") {
      return { hasAccess: true };
    }
    // Owners need active subscription
    if (user.role === "owner") {
      if (user.subscriptionStatus === "active" && user.subscriptionPlan) {
        return { hasAccess: true };
      }
      return { hasAccess: false, reason: "Active subscription required" };
    }
    return { hasAccess: false, reason: "Unknown role" };
  }

  // === PUBLIC API v1 (for external access) ===
  app.use("/api", createPublicApiRouter());

  // === AUTH ROUTES ===

  app.post("/api/auth/login", authLoginLimiter, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

      if (!normalizedEmail || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required" });
      }

      const authKey = getAuthKey(req, normalizedEmail);
      const lockout = checkAuthLockout(authKey);
      if (lockout.locked) {
        const retryAfterSeconds = Math.ceil(lockout.retryAfterMs / 1000);
        res.setHeader("Retry-After", String(retryAfterSeconds));
        return res.status(429).json({ success: false, message: "Too many failed login attempts. Please try again later." });
      }

      const user = await storage.getUserByEmail(normalizedEmail);

      if (!user || !(await bcrypt.compare(password, user.password))) {
        const failure = recordAuthFailure(authKey);
        if (failure.locked) {
          const retryAfterSeconds = Math.ceil(failure.retryAfterMs / 1000);
          res.setHeader("Retry-After", String(retryAfterSeconds));
          return res.status(429).json({ success: false, message: "Too many failed login attempts. Please try again later." });
        }
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      if (user.status !== "active") {
        const failure = recordAuthFailure(authKey);
        if (failure.locked) {
          const retryAfterSeconds = Math.ceil(failure.retryAfterMs / 1000);
          res.setHeader("Retry-After", String(retryAfterSeconds));
          return res.status(429).json({ success: false, message: "Too many failed login attempts. Please try again later." });
        }
        return res.status(401).json({ success: false, message: "Account is not active" });
      }

      // For owners, check if they have a site - create one if not
      let userSite = null;
      if (user.role === "owner") {
        const sites = await storage.getSitesByOwnerId(user.id);
        if (sites.length === 0) {
          // Auto-create a starter site for owner with no sites
          userSite = await storage.createSite({
            domain: `${user.username.toLowerCase().replace(/[^a-z0-9]/g, '-')}-site`,
            title: `${user.username}'s Blog`,
            description: "My personal blog powered by Blog Autopilot",
            theme: "starter",
            ownerId: user.id,
            isOnboarded: false,
            menuMode: "automatic",
            siteType: "forbis",
          });
        } else {
          userSite = sites[0]; // Return first site
        }
      } else if (user.role === "editor") {
        // For editors, get their first assigned site
        const sitesWithPermission = await storage.getSitesForUserWithPermission(user.id);
        if (sitesWithPermission.length > 0) {
          userSite = sitesWithPermission[0];
        }
      }

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "Session error" });
        }
        
        req.session.userId = user.id;
        req.session.userRole = user.role;
        const csrfToken = ensureCsrfToken(req);
        
        // Explicitly save the session before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            return res.status(500).json({ error: "Failed to save session" });
          }
          clearAuthFailures(authKey);

          if (csrfToken) {
            res.setHeader("x-csrf-token", csrfToken);
          }

          res.json({ 
            success: true,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
            },
            site: userSite ? { id: userSite.id, isOnboarded: userSite.isOnboarded } : null,
            csrfToken: csrfToken || undefined,
          });
        });
      });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
    });
  });

  app.post("/api/auth/register", authRegisterLimiter, async (req: Request, res: Response) => {
    try {
      const { email, username, password, confirmPassword } = req.body;
      const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

      // Validate required fields
      if (!normalizedEmail || !username || !password || !confirmPassword) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      // Validate password length
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      // Validate passwords match
      if (password !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match" });
      }

      // Check for duplicate username
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Check for duplicate email
      const existingEmail = await storage.getUserByEmail(normalizedEmail);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Hash password and create user
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        email: normalizedEmail,
        password: hashedPassword,
        role: "owner",
        status: "active",
      });

      // Auto-create a starter site for the new owner
      const starterSite = await storage.createSite({
        domain: `${username.toLowerCase().replace(/[^a-z0-9]/g, '-')}-site`,
        title: `${username}'s Blog`,
        description: "My personal blog powered by Blog Autopilot",
        theme: "starter",
        ownerId: user.id,
        isOnboarded: false, // Will trigger onboarding modal
        menuMode: "automatic",
        siteType: "forbis",
      });

      // Log the user in after registration
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "Session error" });
        }

        req.session.userId = user.id;
        req.session.userRole = user.role;
        const csrfToken = ensureCsrfToken(req);

        req.session.save((saveErr) => {
          if (saveErr) {
            return res.status(500).json({ error: "Failed to save session" });
          }

          if (csrfToken) {
            res.setHeader("x-csrf-token", csrfToken);
          }

          res.json({
            success: true,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
            },
            // Return the starter site so frontend can redirect to onboarding
            starterSite: {
              id: starterSite.id,
              domain: starterSite.domain,
              title: starterSite.title,
            },
            csrfToken: csrfToken || undefined,
          });
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // === STRIPE CHECKOUT & SUBSCRIPTION ROUTES ===
  
  // Create checkout session for subscription
  app.post("/api/checkout", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { planId } = req.body;
      
      if (!planId || !["launch", "growth", "scale"].includes(planId)) {
        return res.status(400).json({ error: "Invalid plan selected" });
      }
      
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Import stripeService
      const { stripeService } = await import("./stripeService");
      
      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email || user.username, user.id);
        await storage.updateUser(user.id, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }
      
      // Get price for the selected plan from Stripe
      const productsWithPrices = await stripeService.listProductsWithPrices();
      const planProduct = productsWithPrices.find((row: any) => 
        row.product_metadata?.plan_id === planId
      );
      
      if (!planProduct || !planProduct.price_id) {
        return res.status(400).json({ error: "Plan price not found. Please contact support." });
      }
      
      // Create checkout session
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCheckoutSession(
        customerId,
        planProduct.price_id,
        `${baseUrl}/owner/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        `${baseUrl}/pricing`
      );
      
      res.json({ url: session.url, checkoutUrl: session.url });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ error: error.message || "Failed to create checkout session" });
    }
  });
  
  // Get subscription info for current user
  app.get("/api/subscription", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (!user.stripeSubscriptionId) {
        return res.json({ subscription: null, plan: null, status: "none" });
      }
      
      const { stripeService } = await import("./stripeService");
      const subscription = await stripeService.getSubscription(user.stripeSubscriptionId);
      
        const planLimits = user.subscriptionPlan
          ? PLAN_LIMITS[user.subscriptionPlan as keyof typeof PLAN_LIMITS]
          : null;
        const postsUsedThisMonth = user.postsUsedThisMonth || 0;
        const postsLimit = planLimits?.postsPerMonth || 0;
        const sitesLimit = planLimits?.maxSites ?? 0;
        const sitesUsed = user.role === "owner" ? (await storage.getSitesByOwnerId(user.id)).length : 0;
        const now = new Date();
        const billingStart = user.postsResetDate
          ? new Date(user.postsResetDate)
          : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
        const postsCreatedThisMonth = user.role === "owner"
          ? await storage.countPostsByOwnerSince(user.id, billingStart, false)
          : 0;
        const effectivePostsUsedThisMonth = Math.max(postsUsedThisMonth, postsCreatedThisMonth);

        if (effectivePostsUsedThisMonth !== postsUsedThisMonth) {
          await storage.updateUser(user.id, { postsUsedThisMonth: effectivePostsUsedThisMonth });
        }

        res.json({
          subscription,
          plan: user.subscriptionPlan,
          status: user.subscriptionStatus,
          postsUsedThisMonth: effectivePostsUsedThisMonth,
          postsUsed: effectivePostsUsedThisMonth,
          postsCreatedThisMonth,
          postsLimit,
          sitesUsed,
          sitesLimit,
          postsResetDate: user.postsResetDate,
        });
      } catch (error: any) {
      console.error("Get subscription error:", error);
      res.status(500).json({ error: error.message || "Failed to get subscription" });
    }
  });
  
  // Create customer portal session for managing subscription
  app.post("/api/subscription/portal", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No billing account found" });
      }
      
      const { stripeService } = await import("./stripeService");
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/owner`
      );
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Portal error:", error);
      res.status(500).json({ error: error.message || "Failed to create portal session" });
    }
  });

  // Sync subscription from Stripe - fallback when webhook hasn't fired yet
  app.post("/api/subscription/sync", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.body;
      const user = await storage.getUser(req.user!.id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // If already active, no need to sync
      if (user.subscriptionStatus === 'active' && user.stripeSubscriptionId) {
        return res.json({ 
          synced: false, 
          message: "Already active",
          status: user.subscriptionStatus,
          plan: user.subscriptionPlan
        });
      }
      
      const { stripeService } = await import("./stripeService");
      const stripe = await stripeService.getStripeClient();
      
      if (!stripe) {
        return res.status(500).json({ error: "Stripe not configured" });
      }
      
      // Try to get session details from Stripe
      if (sessionId) {
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription', 'subscription.items.data.price.product']
          });
          
          if (session.payment_status === 'paid' && session.subscription) {
            const subscription = session.subscription as any;
            const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
            const subscriptionId = typeof subscription === 'string' ? subscription : subscription.id;
            
            // Get full subscription details
            const fullSubscription = await stripe.subscriptions.retrieve(subscriptionId);
            const productId = fullSubscription.items.data[0]?.price.product as string;
            const product = await stripe.products.retrieve(productId);
            const planId = product.metadata?.plan_id || 'launch';
            
            // Update user with subscription info
            await storage.updateUser(user.id, {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              subscriptionPlan: planId,
              subscriptionStatus: fullSubscription.status,
              postsUsedThisMonth: 0,
              postsResetDate: new Date(),
            });
            
            console.log(`[Subscription Sync] User ${user.id} synced to ${planId} plan (status: ${fullSubscription.status})`);
            
            return res.json({
              synced: true,
              status: fullSubscription.status,
              plan: planId
            });
          }
        } catch (error: any) {
          console.error("[Subscription Sync] Session retrieval error:", error.message);
        }
      }
      
      // Fallback: check if user has customer ID and look for active subscriptions
      if (user.stripeCustomerId) {
        try {
          const subscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: 'active',
            limit: 1
          });
          
          if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0];
            const productId = subscription.items.data[0]?.price.product as string;
            const product = await stripe.products.retrieve(productId);
            const planId = product.metadata?.plan_id || 'launch';
            
            await storage.updateUser(user.id, {
              stripeSubscriptionId: subscription.id,
              subscriptionPlan: planId,
              subscriptionStatus: subscription.status,
            });
            
            console.log(`[Subscription Sync] User ${user.id} synced via customer lookup to ${planId} plan`);
            
            return res.json({
              synced: true,
              status: subscription.status,
              plan: planId
            });
          }
        } catch (error: any) {
          console.error("[Subscription Sync] Customer subscription lookup error:", error.message);
        }
      }
      
      return res.json({ synced: false, message: "No active subscription found" });
    } catch (error: any) {
      console.error("Subscription sync error:", error);
      res.status(500).json({ error: error.message || "Failed to sync subscription" });
    }
  });

  // Trigger first-payment article generation (failsafe for webhook timing)
  // Uses atomic database claim to prevent duplicate generation across all entry points
  app.post("/api/trigger-first-payment-generation", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.subscriptionStatus !== "active" || !user.subscriptionPlan) {
        return res.status(400).json({ error: "No active subscription" });
      }
      
      // Get all sites for this user to check if any have been onboarded but not generated
      const sites = await storage.getSitesByOwnerId(userId);
      const sitesNeedingGeneration = sites.filter(s => 
        s.isOnboarded && 
        s.businessDescription && 
        !s.initialArticlesGenerated
      );
      
      if (sitesNeedingGeneration.length === 0) {
        console.log(`[First Payment] User ${userId}: No sites need generation`);
        return res.json({ 
          success: true, 
          message: "No sites need content generation",
          totalArticles: 0,
          sitesProcessed: 0 
        });
      }
      
      // Two-phase atomic claim - prevents duplicate generation across all entry points
      // Phase 1: Set "started" timestamp (allows retry after 10 min timeout)
      const claimResult = await storage.claimFirstPaymentGeneration(userId);
      
      if (!claimResult.claimed) {
        console.log(`[First Payment] User ${userId}: Could not claim - ${claimResult.reason}`);
        return res.json({ 
          success: true, 
          message: claimResult.reason === "already_done" 
            ? "First payment generation already completed"
            : claimResult.reason === "in_progress"
              ? "Generation already in progress"
              : "Could not start generation",
          totalArticles: 0,
          sitesProcessed: 0,
          skipped: true,
          reason: claimResult.reason
        });
      }
      
      console.log(`[First Payment] User ${userId}: Claimed generation, processing ${sitesNeedingGeneration.length} sites`);
      
      try {
        // Import and trigger the monthly content engine
        const { triggerMonthlyContentGeneration } = await import("./monthly-content-engine");
        const result = await triggerMonthlyContentGeneration(userId);
        
        console.log(`[First Payment] Result: ${result.totalArticles} articles for ${result.sitesProcessed} sites`);
        
        // Phase 2: Mark as completed if successful
        if (result.success && result.totalArticles > 0) {
          await storage.completeFirstPaymentGeneration(userId);
          console.log(`[First Payment] User ${userId}: Marked generation as completed`);
        } else {
          // Clear started flag to allow retry
          await storage.clearFirstPaymentGenerationStarted(userId);
          console.log(`[First Payment] User ${userId}: Cleared started flag (no articles generated)`);
        }
        
        res.json({
          success: result.success,
          totalArticles: result.totalArticles,
          sitesProcessed: result.sitesProcessed,
          errors: result.errors,
        });
      } catch (genError: any) {
        // On error, clear started flag to allow retry
        await storage.clearFirstPaymentGenerationStarted(userId);
        console.error(`[First Payment] User ${userId}: Generation failed, cleared started flag`);
        throw genError;
      }
    } catch (error: any) {
      console.error("[First Payment] Error:", error);
      res.status(500).json({ error: error.message || "Failed to trigger content generation" });
    }
  });

  // Get current generation status for a site (used for floating progress indicator)
  app.get("/api/sites/:siteId/generation-status", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { siteId } = req.params;
      const site = await storage.getSiteById(siteId);
      
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      // Check if user is owner
      const user = await storage.getUser(req.user!.id);
      const isOwner = user?.role === "owner" && site.ownerId === user.id;
      
      if (!isOwner) {
        return res.json({ isGenerating: false, articlesCreated: 0, expectedCount: 0, isPaidUser: false });
      }
      
      const isSubscribed = user.subscriptionStatus === "active" && user.subscriptionPlan;

      const posts = await storage.getPostsBySiteId(siteId);
      const realArticleCount = posts.filter((p: any) => !p.isLocked).length;

      if (!isSubscribed) {
        const shouldGenerateInitial = Boolean(site.isOnboarded && !site.initialArticlesGenerated);
        if (shouldGenerateInitial) {
          const { generateInitialArticlesForSite, isGenerating } = await import("./initial-article-generator");
          if (!isGenerating(siteId)) {
            generateInitialArticlesForSite(siteId).catch((err) => {
              console.error(`[Generation Status] Failed to trigger initial generation for site ${siteId}:`, err);
            });
          }
        }
        return res.json({
          isGenerating: shouldGenerateInitial,
          articlesCreated: realArticleCount,
          expectedCount: 4,
          isPaidUser: false,
        });
      }
      
      // Get current article count for progress display
      
      // Get expected target based on plan + allocation (if any)
      const planLimits = PLAN_LIMITS[user.subscriptionPlan as keyof typeof PLAN_LIMITS];
      const sites = await storage.getSitesByOwnerId(user.id);
      const sitesCount = sites.length;
      const allocation = await storage.getArticleAllocation(user.id);
      const allocationForSite = allocation?.[siteId];

      let expectedCount = planLimits?.postsPerMonth || 30;
      if (allocationForSite && allocationForSite > 0) {
        expectedCount = Math.max(4, Math.min(allocationForSite, 100));
      } else {
        const perSite = sitesCount > 0 ? Math.floor(planLimits.postsPerMonth / sitesCount) : planLimits.postsPerMonth;
        expectedCount = Math.max(4, Math.min(perSite, 40));
      }
      
      // Show generation indicator when:
      // 1. Site is onboarded with business profile
      // 2. User is paid subscriber
      // 3. Current article count is less than expected target (still more to create)
      // 4. First payment generation not yet complete
      const hasBusinessProfile = site.isOnboarded && site.businessDescription;
      const stillMoreToCreate = realArticleCount < expectedCount;
      const generationInProgress = !user.firstPaymentGenerationDone;
      
      const isGenerating = hasBusinessProfile && stillMoreToCreate && generationInProgress;
      
      res.json({
        isGenerating,
        articlesCreated: realArticleCount,
        expectedCount,
        isPaidUser: true
      });
    } catch (error: any) {
      console.error("[Generation Status] Error:", error);
      res.status(500).json({ error: error.message });
    }
    });

  // Get monthly target & remaining quota for a specific site (autopilot)
  app.get("/api/sites/:siteId/monthly-target", requireAuth, requireSiteAccess("siteId", "view"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { siteId } = req.params;
      const site = await storage.getSiteById(siteId);

      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isSubscribed = user.subscriptionStatus === "active" && user.subscriptionPlan;
      const planLimits = user.subscriptionPlan
        ? PLAN_LIMITS[user.subscriptionPlan as keyof typeof PLAN_LIMITS]
        : null;

      const sites = await storage.getSitesByOwnerId(user.id);
      const sitesCount = sites.length;
      const allocation = await storage.getArticleAllocation(user.id);
      const allocationForSite = allocation?.[siteId];

      let targetForSite = 0;
      let targetSource: "allocation" | "plan_split" | "none" = "none";

      if (planLimits) {
        if (allocationForSite && allocationForSite > 0) {
          targetForSite = Math.max(4, Math.min(allocationForSite, 100));
          targetSource = "allocation";
        } else {
          const perSite = sitesCount > 0 ? Math.floor(planLimits.postsPerMonth / sitesCount) : planLimits.postsPerMonth;
          targetForSite = Math.max(4, Math.min(perSite, 40));
          targetSource = "plan_split";
        }
      }

      const postsUsedThisMonth = user.postsUsedThisMonth || 0;
      const remainingPlanQuota = planLimits ? Math.max(0, planLimits.postsPerMonth - postsUsedThisMonth) : 0;
      const effectiveTarget = Math.min(targetForSite, remainingPlanQuota);

      res.json({
        siteId,
        isSubscribed: Boolean(isSubscribed),
        plan: user.subscriptionPlan,
        planLimit: planLimits?.postsPerMonth || 0,
        sitesCount,
        allocation: allocation || null,
        allocationForSite: allocationForSite ?? null,
        targetForSite,
        targetSource,
        postsUsedThisMonth,
        remainingPlanQuota,
        effectiveTarget,
        postsResetDate: user.postsResetDate,
      });
    } catch (error: any) {
      console.error("[Monthly Target] Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch monthly target" });
    }
  });

  // Read-only strategy view: pillars, article counts, and recent growth
  app.get("/api/sites/:id/strategy-view", requireAuth, requireSiteAccess("id", "view"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: siteId } = req.params;
      const site = await storage.getSiteById(siteId);

      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      const pillars = await storage.getPillarsBySiteId(siteId);
      const posts = await storage.getPostsBySiteId(siteId);

      const postsByPillar = new Map<string, any[]>();
      for (const post of posts) {
        if (!post.pillarId) continue;
        const list = postsByPillar.get(post.pillarId) || [];
        list.push(post);
        postsByPillar.set(post.pillarId, list);
      }

      const now = new Date();
      const recentCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let totalArticles = 0;
      let totalRecent = 0;

      const pillarSummaries = await Promise.all(
        pillars.map(async (pillar) => {
          const pillarArticles = await storage.getPillarArticlesByPillarId(pillar.id);
          const hasPillarMap = pillarArticles.length > 0;

          let articles: Array<{
            title: string;
            status: string | null;
            createdAt: Date | null;
            source: string;
          }> = [];
          let articleCount = 0;
          let recentCount = 0;

          if (hasPillarMap) {
            articles = pillarArticles.map((a) => ({
              title: a.title,
              status: a.status || null,
              createdAt: a.generatedAt || a.createdAt || null,
              source: "pillar-map",
            }));

            articleCount = pillarArticles.length;
            recentCount = pillarArticles.filter(
              (a) => a.generatedAt && new Date(a.generatedAt) >= recentCutoff
            ).length;
          } else {
            const pillarPosts = postsByPillar.get(pillar.id) || [];
            articles = pillarPosts.map((p) => ({
              title: p.title,
              status: p.status || null,
              createdAt: p.createdAt || null,
              source: p.source || "manual",
            }));
            articleCount = pillarPosts.length;
            recentCount = pillarPosts.filter(
              (p) => p.createdAt && new Date(p.createdAt) >= recentCutoff
            ).length;
          }

          totalArticles += articleCount;
          totalRecent += recentCount;

          return {
            id: pillar.id,
            name: pillar.name,
            description: pillar.description,
            status: pillar.status,
            isAutomation: Boolean(pillar.isAutomation),
            targetArticleCount: pillar.targetArticleCount || null,
            generatedCount: pillar.generatedCount || 0,
            articleCount,
            recentCount,
            articles,
          };
        })
      );

      const visiblePillars = pillarSummaries.filter((pillar) => pillar.articleCount > 0);
      const visibleTotals = {
        pillars: visiblePillars.length,
        articles: visiblePillars.reduce((sum, pillar) => sum + pillar.articleCount, 0),
        recent: visiblePillars.reduce((sum, pillar) => sum + pillar.recentCount, 0),
      };

      res.json({
        siteId,
        generatedAt: now,
        totals: {
          pillars: visibleTotals.pillars,
          articles: visibleTotals.articles,
          recent: visibleTotals.recent,
        },
        pillars: visiblePillars,
      });
    } catch (error: any) {
      console.error("[Strategy View] Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch strategy view" });
    }
  });
  
    // Fix missing feature images on articles for a site
  app.post("/api/sites/:siteId/fix-missing-images", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { siteId } = req.params;
      const site = await storage.getSiteById(siteId);
      
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      // Get all posts without images
      const posts = await storage.getPostsBySiteId(siteId);
      const postsWithoutImages = posts.filter((p: any) => !p.isLocked && !p.imageUrl);
      
      if (postsWithoutImages.length === 0) {
        return res.json({ message: "All articles have images", fixed: 0 });
      }
      
      console.log(`[Fix Images] Found ${postsWithoutImages.length} articles without images for site ${siteId}`);
      
      let fixed = 0;
      for (const post of postsWithoutImages) {
        try {
          // Try to find an image using various fallback queries
          const fallbackQueries = [
            post.tags?.[0] || "",
            post.title.split(" ").slice(0, 3).join(" "),
            site.industry || "",
            site.title || "",
            "professional business blog"
          ].filter(q => q && q.length > 2);
          
          let imageUrl: string | null = null;
          for (const query of fallbackQueries) {
            imageUrl = await searchPexelsImage(query);
            if (imageUrl) break;
          }
          
          if (imageUrl) {
            await storage.updatePost(post.id, { imageUrl });
            fixed++;
            console.log(`[Fix Images] Added image to "${post.title}"`);
          }
        } catch (err) {
          console.error(`[Fix Images] Failed to fix image for post ${post.id}:`, err);
        }
      }
      
      res.json({ 
        message: `Fixed ${fixed} of ${postsWithoutImages.length} articles`,
        fixed,
        total: postsWithoutImages.length
      });
    } catch (error: any) {
      console.error("[Fix Images] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check if user needs generation and whether allocation is required
  app.get("/api/check-generation-needs", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const isSubscribed = user.subscriptionStatus === "active" && user.subscriptionPlan;
      const generationDone = user.firstPaymentGenerationDone;
      
      if (!isSubscribed || generationDone) {
        return res.json({ 
          needsGeneration: false,
          reason: !isSubscribed ? "no_subscription" : "already_done"
        });
      }
      
      const sites = await storage.getSitesByOwnerId(userId);
      const onboardedSites = sites.filter(s => s.isOnboarded && s.businessDescription);
      
      if (onboardedSites.length === 0) {
        return res.json({
          needsGeneration: false,
          reason: "no_onboarded_sites"
        });
      }
      
      const planLimits = PLAN_LIMITS[user.subscriptionPlan as keyof typeof PLAN_LIMITS];
      const existingAllocation = await storage.getArticleAllocation(userId);
      
      res.json({
        needsGeneration: true,
        needsAllocation: onboardedSites.length > 1 && !existingAllocation,
        sites: onboardedSites.map(s => ({ id: s.id, title: s.title })),
        totalQuota: planLimits?.postsPerMonth || 30,
        existingAllocation
      });
    } catch (error: any) {
      console.error("[Check Generation] Error:", error);
      res.status(500).json({ error: error.message || "Failed to check generation needs" });
    }
  });

  // Save article allocation for multi-site users
  app.post("/api/article-allocation", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { allocation } = req.body;
      
      if (!allocation || typeof allocation !== "object") {
        return res.status(400).json({ error: "Invalid allocation format" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.subscriptionStatus !== "active" || !user.subscriptionPlan) {
        return res.status(400).json({ error: "No active subscription" });
      }
      
      const planLimits = PLAN_LIMITS[user.subscriptionPlan as keyof typeof PLAN_LIMITS];
      const totalAllocated = Object.values(allocation).reduce((sum: number, val) => sum + (val as number), 0);
      
      if (totalAllocated !== planLimits.postsPerMonth) {
        return res.status(400).json({ 
          error: `Total allocation (${totalAllocated}) must equal plan limit (${planLimits.postsPerMonth})`
        });
      }
      
      await storage.setArticleAllocation(userId, allocation);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Article Allocation] Error:", error);
      res.status(500).json({ error: error.message || "Failed to save allocation" });
    }
  });

  // === USER MANAGEMENT ROUTES (Admin only) ===

  app.get("/api/users", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      // Don't return passwords
      const safeUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }));
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { username, email, password, role, status } = req.body;
      
      // Check for duplicate username/email
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        role: role || "editor",
        status: status || "active",
      });
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { username, email, password, role, status } = req.body;
      
      const updateData: any = {};
      if (username) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (role) updateData.role = role;
      if (status) updateData.status = status;
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }
      
      const user = await storage.updateUser(req.params.id, updateData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Prevent deleting yourself
      if (req.user?.id === req.params.id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // === EDITOR API ROUTES (for users with posts_only permission) ===

  app.get("/api/editor/sites", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Return sites with permissions for editors
      const sitesWithPermission = await storage.getSitesForUserWithPermission(req.user.id);
      res.json(sitesWithPermission);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sites" });
    }
  });

  app.get("/api/editor/sites/:id", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const site = await storage.getSiteById(req.params.id);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      res.json(site);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch site" });
    }
  });

  app.get("/api/editor/sites/:id/posts", requireAuth, requireSiteAccess("id", "view"), async (req: Request, res: Response) => {
    try {
      const siteId = req.params.id;
      const posts = await storage.getPostsBySiteId(siteId);
      
      // If site is onboarded with business info but initialArticlesGenerated is false, trigger generation
      const site = await storage.getSiteById(siteId);
      if (site && site.isOnboarded && !site.initialArticlesGenerated) {
        const { generateInitialArticlesForSite, isGenerating } = await import("./initial-article-generator");
        // Only trigger if not already generating
        if (!isGenerating(siteId)) {
          console.log(`[Auto-Recovery] Site ${siteId} has business info but initialArticlesGenerated=false (${posts.length} posts) - triggering initial article generation`);
          generateInitialArticlesForSite(siteId).then(result => {
            if (result.success) {
              console.log(`[Auto-Recovery] Initial articles generated for site ${siteId}: ${result.articlesCreated} articles`);
            } else {
              console.error(`[Auto-Recovery] Failed to generate initial articles for site ${siteId}:`, result.error);
            }
          }).catch(err => {
            console.error(`[Auto-Recovery] Error generating initial articles for site ${siteId}:`, err);
          });
        }
      }
      
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/editor/sites/:id/posts", requireAuth, requireSiteAccess("id", "posts_only"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check subscription access before creating post
      if (req.user) {
        const subscriptionCheck = await checkSubscriptionAccess(req.user);
        if (!subscriptionCheck.hasAccess) {
          return res.status(403).json({ 
            error: subscriptionCheck.reason || "Active subscription required", 
            code: "SUBSCRIPTION_REQUIRED" 
          });
        }
      }
      
      const postData = insertPostSchema.parse({
        ...req.body,
        siteId: req.params.id,
      });
      
      // Use limit-checked post creation for owner sites
      const result = await storage.createPostWithLimitCheck(postData);
      if (result.error) {
        return res.status(403).json({ error: result.error, code: result.code });
      }
      
      res.json(result.post);
    } catch (error) {
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // Generate single AI post
  app.post("/api/editor/sites/:id/posts/generate-ai", requireAuth, requireSiteAccess("id", "posts_only"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check subscription access before AI generation
      if (req.user) {
        const subscriptionCheck = await checkSubscriptionAccess(req.user);
        if (!subscriptionCheck.hasAccess) {
          return res.status(403).json({ 
            error: subscriptionCheck.reason || "Active subscription required", 
            code: "SUBSCRIPTION_REQUIRED" 
          });
        }
      }
      
      const siteId = req.params.id;
      const { topic } = req.body;
      
      if (!topic || typeof topic !== "string") {
        return res.status(400).json({ error: "Topic is required" });
      }
      
      const cleanTopic = topic.trim();
      if (cleanTopic.length < 3 || cleanTopic.length > 500) {
        return res.status(400).json({ error: "Topic must be between 3 and 500 characters" });
      }
      
      // Get site for business context and AI config
      const site = await storage.getSiteById(siteId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      // Check business profile
      const businessProfile = site.businessProfile as any;
      if (!businessProfile?.description) {
        return res.status(400).json({ 
          error: "Business profile required for AI generation", 
          code: "BUSINESS_PROFILE_REQUIRED" 
        });
      }
      
      // Build business context
      const businessContext = {
        description: businessProfile.description || "",
        targetAudience: businessProfile.targetAudience || "",
        brandVoice: businessProfile.brandVoice || "",
        valuePropositions: businessProfile.valuePropositions || [],
        industry: businessProfile.industry || "",
        competitors: businessProfile.competitors || [],
      };
      
      const aiConfig = site.aiConfig as any || {};
      const masterPrompt = aiConfig.masterPrompt || "Write an engaging, informative blog post.";
      const targetLanguage = site.language || "en";
      
      // Generate the AI post
      const { generateAIPost } = await import("./openai");
      const result = await generateAIPost(masterPrompt, cleanTopic, targetLanguage, businessContext);
      
      // Create the post with limit check
      const postResult = await storage.createPostWithLimitCheck({
        siteId,
        title: result.title,
        content: result.content,
        slug: result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        tags: result.tags,
        imageUrl: result.imageUrl || null,
        metaTitle: result.metaTitle,
        metaDescription: result.metaDescription,
        source: "ai",
        status: (aiConfig.defaultPostStatus as "published" | "draft") || "published",
      });
      
      if (postResult.error) {
        return res.status(403).json({ error: postResult.error, code: postResult.code });
      }
      
      res.json(postResult.post);
    } catch (error) {
      console.error("AI post generation error:", error);
      res.status(500).json({ error: "Failed to generate AI post" });
    }
  });

  // CSV Import for posts
  app.post("/api/editor/sites/:id/posts/import-csv", requireAuth, requireSiteAccess("id", "posts_only"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check subscription access before importing posts
      if (req.user) {
        const subscriptionCheck = await checkSubscriptionAccess(req.user);
        if (!subscriptionCheck.hasAccess) {
          return res.status(403).json({ 
            error: subscriptionCheck.reason || "Active subscription required", 
            code: "SUBSCRIPTION_REQUIRED" 
          });
        }
      }
      
      const siteId = req.params.id;
      let { csvContent } = req.body;
      
      if (!csvContent || typeof csvContent !== "string") {
        return res.status(400).json({ error: "CSV content is required" });
      }
      
      // Check file size (max 20MB of text)
      if (csvContent.length > 20 * 1024 * 1024) {
        return res.status(400).json({ error: "CSV content too large (max 20MB)" });
      }
      
      // Strip UTF-8 BOM if present (common in Excel exports)
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
      }
      
      // Helper function to generate slug
      const slugify = (text: string): string => {
        return text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 100);
      };
      
      // Helper to normalize a slug from CSV (strip leading slashes, clean up)
      const normalizeSlug = (rawSlug: string): string => {
        return rawSlug
          .replace(/^\/+/, "") // Remove leading slashes
          .replace(/\/+$/, "") // Remove trailing slashes
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-") // Replace invalid chars with hyphens
          .replace(/-+/g, "-") // Collapse multiple hyphens
          .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
          .substring(0, 100);
      };
      
      // RFC 4180 compliant CSV parser that handles multiline quoted fields
      // Preserves whitespace inside quoted fields and properly unescapes doubled quotes
      const parseCSV = (content: string): string[][] => {
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentField = "";
        let inQuotes = false;
        let fieldWasQuoted = false;
        
        for (let i = 0; i < content.length; i++) {
          const char = content[i];
          const nextChar = content[i + 1];
          
          if (char === '"') {
            if (!inQuotes && currentField === "") {
              // Opening quote at start of field
              inQuotes = true;
              fieldWasQuoted = true;
            } else if (inQuotes && nextChar === '"') {
              // Escaped quote (doubled) - unescape to single quote
              currentField += '"';
              i++;
            } else if (inQuotes) {
              // Closing quote
              inQuotes = false;
            } else {
              // Quote in middle of unquoted field - just add it
              currentField += char;
            }
          } else if (char === ',' && !inQuotes) {
            // Field separator - preserve content, only trim unquoted fields
            currentRow.push(fieldWasQuoted ? currentField : currentField.trim());
            currentField = "";
            fieldWasQuoted = false;
          } else if ((char === '\r' || char === '\n') && !inQuotes) {
            // Row separator (outside quotes)
            if (char === '\r' && nextChar === '\n') {
              i++; // Skip \n in \r\n
            }
            // Finish current row - preserve content, only trim unquoted fields
            currentRow.push(fieldWasQuoted ? currentField : currentField.trim());
            currentField = "";
            fieldWasQuoted = false;
            // Only add non-empty rows (at least one field with content after trimming)
            if (currentRow.some(cell => cell.trim().length > 0)) {
              rows.push(currentRow);
            }
            currentRow = [];
          } else {
            // Regular character (including newlines inside quotes)
            currentField += char;
          }
        }
        
        // Handle last field/row
        if (currentField || currentRow.length > 0) {
          currentRow.push(fieldWasQuoted ? currentField : currentField.trim());
          if (currentRow.some(f => f.trim())) {
            rows.push(currentRow);
          }
        }
        
        return rows;
      };
      
      // Parse CSV content
      const rows = parseCSV(csvContent);
      
      if (rows.length < 2) {
        return res.status(400).json({ error: "CSV must have a header row and at least one data row" });
      }
      
      // Parse header
      const header = rows[0].map(h => h.toLowerCase().trim());
      const titleIdx = header.indexOf("title");
      const descIdx = header.indexOf("description");
      const tagsIdx = header.indexOf("tags");
      const slugIdx = header.indexOf("slug");
      const imageUrlIdx = header.indexOf("imageurl");
      
      if (titleIdx === -1) {
        return res.status(400).json({ error: "CSV must have a 'title' column" });
      }
      if (descIdx === -1) {
        return res.status(400).json({ error: "CSV must have a 'description' column" });
      }
      
      // Get existing post slugs for this site to check for duplicates
      const existingPosts = await storage.getPostsBySiteId(siteId);
      const existingSlugs = new Set(existingPosts.map(p => p.slug));
      
      // Process data rows (limit to 1000 rows)
      const dataRows = rows.slice(1).slice(0, 1000);
      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as string[],
      };
      
      for (let i = 0; i < dataRows.length; i++) {
        const rowNum = i + 2; // 1-indexed, accounting for header
        try {
          const fields = dataRows[i];
          // Get raw values - preserve whitespace in content fields
          const rawTitle = fields[titleIdx] ?? "";
          const rawDescription = fields[descIdx] ?? "";
          const tagsRaw = tagsIdx !== -1 ? fields[tagsIdx]?.trim() ?? "" : "";
          const rawSlug = slugIdx !== -1 ? fields[slugIdx]?.trim() ?? "" : "";
          const imageUrl = imageUrlIdx !== -1 ? fields[imageUrlIdx]?.trim() ?? "" : "";
          
          // Title is trimmed for display and validation
          const title = rawTitle.trim();
          // Description preserves whitespace (e.g., newlines) - only check if not empty
          const description = rawDescription;
          
          // Validate required fields
          if (!title) {
            results.errors.push(`Row ${rowNum}: Missing title`);
            results.skipped++;
            continue;
          }
          if (!description.trim()) {
            results.errors.push(`Row ${rowNum}: Missing description`);
            results.skipped++;
            continue;
          }
          
          // Use provided slug if valid, otherwise generate from title
          let baseSlug = rawSlug ? normalizeSlug(rawSlug) : slugify(title);
          if (!baseSlug) baseSlug = "post";
          
          let slug = baseSlug;
          let suffix = 1;
          while (existingSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix++;
          }
          existingSlugs.add(slug);
          
          // Parse tags (comma or semicolon separated)
          const tags = tagsRaw
            ? tagsRaw.split(/[,;]/).map(t => t.trim().toLowerCase()).filter(t => t.length > 0)
            : [];
          
          // Create the post with limit checking
          const createResult = await storage.createPostWithLimitCheck({
            siteId,
            title,
            slug,
            content: description,
            tags,
            source: "csv-import",
            ...(imageUrl && { imageUrl }),
          });
          
          if (createResult.error) {
            if (createResult.code === "POST_LIMIT_REACHED") {
              // Stop processing if post limit is reached
              results.errors.push(`Row ${rowNum}: ${createResult.error}`);
              results.skipped += 1;
              break; // Exit the loop - no more posts can be created
            }
            throw new Error(createResult.error);
          }
          
          results.imported++;
        } catch (err) {
          results.errors.push(`Row ${rowNum}: ${err instanceof Error ? err.message : "Unknown error"}`);
          results.skipped++;
        }
      }
      
      res.json({
        success: true,
        imported: results.imported,
        skipped: results.skipped,
        errors: results.errors.slice(0, 20), // Return first 20 errors
        totalErrors: results.errors.length,
      });
    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ error: "Failed to import CSV" });
    }
  });

  app.put("/api/editor/posts/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const post = await storage.getPostById(req.params.id);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      // Check site access with minimum permission level
      if (req.user?.role !== "admin") {
        const permission = await storage.getUserSitePermission(req.user!.id, post.siteId);
        if (!permission) {
          return res.status(403).json({ error: "You don't have access to this post" });
        }
        if (!hasMinimumPermission(permission, "posts_only")) {
          return res.status(403).json({ error: "Insufficient permissions to edit posts" });
        }
      }
      
      // Check subscription access for locked articles
      if (post.isLocked && req.user) {
        const subscriptionCheck = await checkSubscriptionAccess(req.user);
        if (!subscriptionCheck.hasAccess) {
          return res.status(403).json({ 
            error: subscriptionCheck.reason || "Active subscription required to edit locked articles", 
            code: "SUBSCRIPTION_REQUIRED" 
          });
        }
      }
      
      const updated = await storage.updatePost(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  app.get("/api/editor/sites/:id/scheduled-posts", requireAuth, requireSiteAccess("id", "view"), async (req: Request, res: Response) => {
    try {
      const siteId = req.params.id;
      const posts = await storage.getPostsBySiteId(siteId);
      
      const scheduledPosts = posts
        .filter(
          (post) =>
            post.scheduledPublishDate &&
            (post.status === "draft" || new Date(post.scheduledPublishDate) > new Date())
        )
        .sort((a, b) => {
          const dateA = new Date(a.scheduledPublishDate!);
          const dateB = new Date(b.scheduledPublishDate!);
          return dateA.getTime() - dateB.getTime();
        });

      res.json(scheduledPosts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scheduled posts" });
    }
  });

  app.put("/api/editor/posts/:id/reschedule", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const post = await storage.getPostById(req.params.id);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      if (req.user?.role !== "admin") {
        const permission = await storage.getUserSitePermission(req.user!.id, post.siteId);
        if (!permission || !hasMinimumPermission(permission, "posts_only")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
      }

      const { scheduledPublishDate } = req.body;
      if (!scheduledPublishDate) {
        return res.status(400).json({ error: "scheduledPublishDate is required" });
      }

      const updated = await storage.updatePost(req.params.id, {
        scheduledPublishDate: new Date(scheduledPublishDate),
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to reschedule post" });
    }
  });

  app.delete("/api/editor/posts/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const post = await storage.getPostById(req.params.id);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      // Check site access with minimum permission level
      if (req.user?.role !== "admin") {
        const permission = await storage.getUserSitePermission(req.user!.id, post.siteId);
        if (!permission) {
          return res.status(403).json({ error: "You don't have access to this post" });
        }
        if (!hasMinimumPermission(permission, "posts_only")) {
          return res.status(403).json({ error: "Insufficient permissions to delete posts" });
        }
      }
      
      await storage.deletePost(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // === USER-SITE ASSIGNMENT ROUTES ===

  app.get("/api/users/:id/sites", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userSites = await storage.getUserSites(req.params.id);
      res.json(userSites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user sites" });
    }
  });

  app.post("/api/users/:id/sites", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { siteId, permission } = req.body;
      
      // Validate permission level
      const validPermissions = ["view", "posts_only", "edit", "manage"];
      if (permission && !validPermissions.includes(permission)) {
        return res.status(400).json({ error: "Invalid permission level" });
      }
      
      const userSite = await storage.addUserToSite({
        userId: req.params.id,
        siteId,
        permission: permission || "posts_only",
      });
      res.json(userSite);
    } catch (error: any) {
      // Handle duplicate assignment
      if (error?.code === "23505") {
        return res.status(400).json({ error: "User already has access to this site" });
      }
      res.status(500).json({ error: "Failed to assign site to user" });
    }
  });
  
  app.put("/api/users/:userId/sites/:siteId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { permission } = req.body;
      
      // Validate permission level
      const validPermissions = ["view", "posts_only", "edit", "manage"];
      if (!validPermissions.includes(permission)) {
        return res.status(400).json({ error: "Invalid permission level" });
      }
      
      const updated = await storage.updateUserSitePermission(req.params.userId, req.params.siteId, permission);
      if (!updated) {
        return res.status(404).json({ error: "User site assignment not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update permission" });
    }
  });

  app.delete("/api/users/:userId/sites/:siteId", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.removeUserFromSite(req.params.userId, req.params.siteId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove site from user" });
    }
  });

  app.get("/api/sites/:id/users", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const siteUsers = await storage.getSiteUsers(req.params.id);
      res.json(siteUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch site users" });
    }
  });

  // === ADMIN WIKI ===

    app.get("/api/admin/wiki", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { adminWikiData } = await import("@shared/admin-wiki");
        res.json(adminWikiData);
      } catch (error) {
        res.status(500).json({ error: "Failed to load documentation" });
      }
    });

    // Admin autopilot status overview
    app.get("/api/admin/autopilot-status", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
      try {
        const owners = await storage.getActivePaidOwners();
        const rows: Array<{
          ownerId: string;
          ownerEmail: string | null;
          ownerPlan: string | null;
          subscriptionStatus: string | null;
          postsUsedThisMonth: number;
          remainingPlanQuota: number;
          postsResetDate: Date | null;
          siteId: string;
          siteTitle: string;
          siteDomain: string | null;
          siteOnboarded: boolean;
          hasBusinessProfile: boolean;
          sitesCount: number;
          allocationForSite: number | null;
          targetForSite: number;
          createdAutopilotThisCycle: number;
          missingToTarget: number;
          cycleStart: Date;
        }> = [];

        const now = new Date();

        for (const owner of owners) {
          const planLimits = owner.subscriptionPlan
            ? PLAN_LIMITS[owner.subscriptionPlan as keyof typeof PLAN_LIMITS]
            : null;

          if (!planLimits) continue;

          const postsUsedThisMonth = owner.postsUsedThisMonth || 0;
          const remainingPlanQuota = Math.max(0, planLimits.postsPerMonth - postsUsedThisMonth);
          const cycleStart = owner.postsResetDate
            ? new Date(owner.postsResetDate)
            : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));

          const sites = await storage.getSitesByOwnerId(owner.id);
          const sitesCount = sites.length || 1;
          const allocation = await storage.getArticleAllocation(owner.id);

          for (const site of sites) {
            const allocationForSite = allocation?.[site.id] ?? null;
            let targetForSite = 0;

            if (allocationForSite && allocationForSite > 0) {
              targetForSite = Math.max(4, Math.min(allocationForSite, 100));
            } else {
              const perSite = Math.floor(planLimits.postsPerMonth / sitesCount);
              targetForSite = Math.max(4, Math.min(perSite, 40));
            }

            const createdAutopilotThisCycle = await storage.countPostsBySiteSince(
              site.id,
              cycleStart,
              "monthly-automation"
            );

            const missingToTarget = Math.max(0, targetForSite - createdAutopilotThisCycle);

            rows.push({
              ownerId: owner.id,
              ownerEmail: owner.email,
              ownerPlan: owner.subscriptionPlan,
              subscriptionStatus: owner.subscriptionStatus,
              postsUsedThisMonth,
              remainingPlanQuota,
              postsResetDate: owner.postsResetDate || null,
              siteId: site.id,
              siteTitle: site.title,
              siteDomain: site.domain || null,
              siteOnboarded: site.isOnboarded,
              hasBusinessProfile: Boolean(site.businessDescription && site.businessDescription.trim().length > 0),
              sitesCount,
              allocationForSite,
              targetForSite,
              createdAutopilotThisCycle,
              missingToTarget,
              cycleStart,
            });
          }
        }

        res.json({
          generatedAt: now,
          rows,
        });
      } catch (error) {
        console.error("[Admin Autopilot] Error:", error);
        res.status(500).json({ error: "Failed to fetch autopilot status" });
      }
    });
  
    // === OWNER WIKI ===

  app.get("/api/owner/wiki", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user?.role !== "owner" && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }
      const { ownerWikiData } = await import("@shared/owner-wiki");
      res.json(ownerWikiData);
    } catch (error) {
      res.status(500).json({ error: "Failed to load documentation" });
    }
  });

  // === SITES CRUD ===

  app.get("/api/sites", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      let sites;
      if (req.user?.role === "admin") {
        sites = await storage.getSites();
      } else if (req.user?.role === "owner") {
        // Owners see sites they own
        sites = await storage.getSitesByOwnerId(req.user.id);
      } else {
        // Editors see sites they have access to
        sites = await storage.getSitesForUser(req.user!.id);
      }
      res.json(sites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sites" });
    }
  });

  app.get("/api/sites/:id", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const site = await storage.getSiteById(req.params.id);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      res.json(site);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch site" });
    }
  });

  app.post("/api/sites", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // For owners, enforce plan limits
      if (req.user?.role === "owner") {
        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(401).json({ error: "User not found" });
        }
        
        // Check if user has an active subscription
        if (!user.subscriptionPlan || user.subscriptionStatus !== "active") {
          return res.status(403).json({ 
            error: "Active subscription required to create sites",
            code: "SUBSCRIPTION_REQUIRED"
          });
        }
        
        // Get plan limits
        const { PLAN_LIMITS } = await import("@shared/schema");
        const planLimits = PLAN_LIMITS[user.subscriptionPlan as keyof typeof PLAN_LIMITS];
        if (!planLimits) {
          return res.status(400).json({ error: "Invalid subscription plan" });
        }
        
        // Check site limit (maxSites -1 means unlimited)
        if (planLimits.maxSites !== -1) {
          const ownedSites = await storage.getSitesByOwnerId(req.user.id);
          if (ownedSites.length >= planLimits.maxSites) {
            return res.status(403).json({ 
              error: `Your ${planLimits.name} plan allows up to ${planLimits.maxSites} site(s). Please upgrade to create more.`,
              code: "SITE_LIMIT_REACHED"
            });
          }
        }
      }
      
      const siteData = insertSiteSchema.parse(req.body);
      
      // Set ownerId for owner role users
      if (req.user?.role === "owner") {
        siteData.ownerId = req.user.id;
      }
      
      const site = await storage.createSite(siteData);
      
      // Create default automation configs
      await storage.createOrUpdateAiConfig({
        siteId: site.id,
        enabled: false,
        schedule: "1_per_day",
        masterPrompt: "",
        keywords: [],
        lastKeywordIndex: 0,
      });

      await storage.createOrUpdateRssConfig({
        siteId: site.id,
        enabled: false,
        schedule: "every_6_hours",
        feedUrls: [],
        articlesToFetch: 3,
      });

      // If non-admin creates site, automatically assign them to it
      if (req.user && req.user.role !== "admin") {
        await storage.addUserToSite({
          userId: req.user.id,
          siteId: site.id,
          permission: "manage",
        });
      }

      res.json(site);
    } catch (error) {
      res.status(500).json({ error: "Failed to create site" });
    }
  });

  app.put("/api/sites/:id", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      // Convert empty domain string to null for reverse_proxy mode
      const siteData = { ...req.body };
      if (siteData.domain === "" || siteData.domain === undefined) {
        siteData.domain = null;
      }
      
      const site = await storage.updateSite(req.params.id, siteData);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      res.json(site);
    } catch (error) {
      console.error("[updateSite] Error:", error);
      res.status(500).json({ error: "Failed to update site" });
    }
  });

  app.delete("/api/sites/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteSite(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete site" });
    }
  });

  // === API KEYS MANAGEMENT ===

  app.get("/api/sites/:id/api-keys", requireAuth, requireSiteAccess("id", "manage"), async (req: Request, res: Response) => {
    try {
      const apiKeys = await storage.getApiKeysBySiteId(req.params.id);
      res.json(apiKeys.map(key => ({
        ...key,
        keyHash: undefined,
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch API keys" });
    }
  });

  app.post("/api/sites/:id/api-keys", requireAuth, requireSiteAccess("id", "manage"), async (req: Request, res: Response) => {
    try {
      const { name, permissions, rateLimit, expiresAt } = req.body;
      
      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Name is required" });
      }

      const { key, prefix, hash } = generateApiKey();
      
      const apiKey = await storage.createApiKey({
        siteId: req.params.id,
        name,
        keyHash: hash,
        keyPrefix: prefix,
        permissions: permissions || undefined,
        rateLimit: rateLimit || 1000,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      res.json({
        ...apiKey,
        keyHash: undefined,
        key,
      });
    } catch (error) {
      console.error("[createApiKey] Error:", error);
      res.status(500).json({ error: "Failed to create API key" });
    }
  });

  app.put("/api/sites/:siteId/api-keys/:keyId", requireAuth, requireSiteAccess("siteId", "manage"), async (req: Request, res: Response) => {
    try {
      const { name, permissions, rateLimit, isActive, expiresAt } = req.body;
      
      const apiKey = await storage.getApiKeyById(req.params.keyId);
      if (!apiKey || apiKey.siteId !== req.params.siteId) {
        return res.status(404).json({ error: "API key not found" });
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (permissions !== undefined) updates.permissions = permissions;
      if (rateLimit !== undefined) updates.rateLimit = rateLimit;
      if (isActive !== undefined) updates.isActive = isActive;
      if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

      const updated = await storage.updateApiKey(req.params.keyId, updates);
      res.json({
        ...updated,
        keyHash: undefined,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update API key" });
    }
  });

  app.delete("/api/sites/:siteId/api-keys/:keyId", requireAuth, requireSiteAccess("siteId", "manage"), async (req: Request, res: Response) => {
    try {
      const apiKey = await storage.getApiKeyById(req.params.keyId);
      if (!apiKey || apiKey.siteId !== req.params.siteId) {
        return res.status(404).json({ error: "API key not found" });
      }

      await storage.deleteApiKey(req.params.keyId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete API key" });
    }
  });

  // AI Automation Config
  app.get("/api/sites/:id/ai-config", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const config = await storage.getAiConfigBySiteId(req.params.id);
      res.json(config || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AI config" });
    }
  });

  app.put("/api/sites/:id/ai-config", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const config = await storage.createOrUpdateAiConfig({
        siteId: req.params.id,
        ...req.body,
      });
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to update AI config" });
    }
  });

  // RSS Automation Config
  app.get("/api/sites/:id/rss-config", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const config = await storage.getRssConfigBySiteId(req.params.id);
      res.json(config || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RSS config" });
    }
  });

  app.put("/api/sites/:id/rss-config", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const config = await storage.createOrUpdateRssConfig({
        siteId: req.params.id,
        ...req.body,
      });
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to update RSS config" });
    }
  });

  // Keyword Batch Routes (Bulk AI Post Generation)
  app.get("/api/sites/:id/keyword-batches", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const batches = await storage.getKeywordBatchesBySiteId(req.params.id);
      // For each batch, get job counts
      const batchesWithJobs = await Promise.all(
        batches.map(async (batch) => {
          const jobs = await storage.getKeywordJobsByBatchId(batch.id);
          return {
            ...batch,
            jobs: jobs.map(j => ({ id: j.id, keyword: j.keyword, status: j.status, postId: j.postId, error: j.error })),
          };
        })
      );
      res.json(batchesWithJobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch keyword batches" });
    }
  });

  app.post("/api/sites/:id/keyword-batches", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const site = await storage.getSiteById(req.params.id);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      if (!hasValidBusinessProfile(site)) {
        return res.status(400).json({ 
          error: "Business profile required",
          message: "Please complete your Business Profile before using AI features. Go to Site Settings > Business Profile.",
          code: "BUSINESS_PROFILE_REQUIRED"
        });
      }

      const { keywords, masterPrompt, targetLanguage, pillarId, articleRole } = req.body;
      
      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({ error: "Keywords array is required" });
      }

      // Filter out empty keywords
      const validKeywords = keywords.map((k: string) => k.trim()).filter((k: string) => k.length > 0);
      
      if (validKeywords.length === 0) {
        return res.status(400).json({ error: "At least one valid keyword is required" });
      }

      // Create the batch with optional pillar and article role for internal linking
      const batch = await storage.createKeywordBatch({
        siteId: req.params.id,
        totalKeywords: validKeywords.length,
        masterPrompt: masterPrompt || null,
        targetLanguage: targetLanguage || "en",
        pillarId: pillarId || null,
        articleRole: articleRole || null,
        status: "pending",
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
      });

      // Create individual jobs for each keyword
      await Promise.all(
        validKeywords.map((keyword: string) =>
          storage.createKeywordJob({
            batchId: batch.id,
            keyword,
            status: "queued",
          })
        )
      );

      // Fetch the batch with jobs
      const jobs = await storage.getKeywordJobsByBatchId(batch.id);
      
      res.json({
        ...batch,
        jobs: jobs.map(j => ({ id: j.id, keyword: j.keyword, status: j.status })),
      });
    } catch (error) {
      console.error("Error creating keyword batch:", error);
      res.status(500).json({ error: "Failed to create keyword batch" });
    }
  });

  app.get("/api/keyword-batches/:batchId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const batch = await storage.getKeywordBatchById(req.params.batchId);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      // Check site access for non-admins
      if (req.user?.role !== "admin") {
        const hasAccess = await storage.canUserAccessSite(req.user!.id, batch.siteId);
        if (!hasAccess) {
          return res.status(403).json({ error: "You don't have access to this batch" });
        }
      }

      const jobs = await storage.getKeywordJobsByBatchId(batch.id);
      res.json({
        ...batch,
        jobs,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch keyword batch" });
    }
  });

  app.post("/api/keyword-batches/:batchId/cancel", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const batch = await storage.getKeywordBatchById(req.params.batchId);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      // Check site access for non-admins
      if (req.user?.role !== "admin") {
        const hasAccess = await storage.canUserAccessSite(req.user!.id, batch.siteId);
        if (!hasAccess) {
          return res.status(403).json({ error: "You don't have access to this batch" });
        }
      }

      // Cancel all pending jobs
      await storage.cancelPendingJobsByBatchId(batch.id);

      // Update batch status
      const updatedBatch = await storage.updateKeywordBatch(batch.id, {
        status: "cancelled",
      });

      res.json(updatedBatch);
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel batch" });
    }
  });

  app.delete("/api/keyword-batches/:batchId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const batch = await storage.getKeywordBatchById(req.params.batchId);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      // Check site access for non-admins
      if (req.user?.role !== "admin") {
        const hasAccess = await storage.canUserAccessSite(req.user!.id, batch.siteId);
        if (!hasAccess) {
          return res.status(403).json({ error: "You don't have access to this batch" });
        }
      }

      await storage.deleteKeywordBatch(batch.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete batch" });
    }
  });

  // Posts CRUD
  app.get("/api/sites/:id/posts", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPostsBySiteId(req.params.id);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Get all unique tags for a site (for admin tag selection dropdown)
  app.get("/api/sites/:id/all-tags", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      // Get all unique tags (up to 1000)
      const tags = await storage.getTopTags(req.params.id, 1000);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  app.post("/api/posts", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      
      // Check site access for non-admins
      if (req.user?.role !== "admin") {
        // For owners, check if they own the site
        if (req.user?.role === "owner") {
          const site = await storage.getSiteById(postData.siteId);
          if (!site || site.ownerId !== req.user.id) {
            return res.status(403).json({ error: "You don't have access to this site" });
          }
        } else {
          const hasAccess = await storage.canUserAccessSite(req.user!.id, postData.siteId);
          if (!hasAccess) {
            return res.status(403).json({ error: "You don't have access to this site" });
          }
        }
      }
      
      // Use centralized limit-checked post creation (handles limits for owner sites)
      const result = await storage.createPostWithLimitCheck(postData);
      if (result.error) {
        return res.status(403).json({ error: result.error, code: result.code });
      }
      
      res.json(result.post);
    } catch (error) {
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.put("/api/posts/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existingPost = await storage.getPostById(req.params.id);
      if (!existingPost) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      // Check site access for non-admins
      if (req.user?.role !== "admin") {
        const hasAccess = await storage.canUserAccessSite(req.user!.id, existingPost.siteId);
        if (!hasAccess) {
          return res.status(403).json({ error: "You don't have access to this site" });
        }
      }
      
      const post = await storage.updatePost(req.params.id, req.body);
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  app.delete("/api/posts/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existingPost = await storage.getPostById(req.params.id);
      if (!existingPost) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      // Check site access for non-admins
      if (req.user?.role !== "admin") {
        const hasAccess = await storage.canUserAccessSite(req.user!.id, existingPost.siteId);
        if (!hasAccess) {
          return res.status(403).json({ error: "You don't have access to this site" });
        }
      }
      
      await storage.deletePost(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Search posts by image URL (for bulk image replacement)
  app.get("/api/sites/:id/posts/search-by-image", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const imageUrl = req.query.imageUrl as string;
      if (!imageUrl) {
        return res.status(400).json({ error: "imageUrl query parameter required" });
      }
      
      const posts = await storage.getPostsBySiteId(req.params.id);
      const matchingPosts = posts.filter(post => post.imageUrl === imageUrl);
      
      res.json(matchingPosts);
    } catch (error) {
      res.status(500).json({ error: "Failed to search posts by image" });
    }
  });

  // Bulk replace image URL in posts
  app.post("/api/sites/:id/posts/bulk-replace-image", requireAuth, requireSiteAccess(), async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check subscription access for bulk operations
      if (req.user) {
        const subscriptionCheck = await checkSubscriptionAccess(req.user);
        if (!subscriptionCheck.hasAccess) {
          return res.status(403).json({ 
            error: subscriptionCheck.reason || "Active subscription required", 
            code: "SUBSCRIPTION_REQUIRED" 
          });
        }
      }
      
      const { oldImageUrl, newImageUrl, postIds } = req.body;
      
      if (!oldImageUrl || !newImageUrl) {
        return res.status(400).json({ error: "oldImageUrl and newImageUrl are required" });
      }
      
      if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({ error: "postIds array is required" });
      }
      
      let updatedCount = 0;
      for (const postId of postIds) {
        const post = await storage.getPostById(postId);
        if (post && post.siteId === req.params.id && post.imageUrl === oldImageUrl) {
          await storage.updatePost(postId, { imageUrl: newImageUrl });
          updatedCount++;
        }
      }
      
      res.json({ success: true, updatedCount });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk replace images" });
    }
  });

  // Get all unique featured images for a site (for troubleshooting)
  app.get("/api/sites/:id/featured-images", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPostsBySiteId(req.params.id);
      const imageMap = new Map<string, { url: string; count: number }>();
      
      for (const post of posts) {
        if (post.imageUrl) {
          const existing = imageMap.get(post.imageUrl);
          if (existing) {
            existing.count++;
          } else {
            imageMap.set(post.imageUrl, { url: post.imageUrl, count: 1 });
          }
        }
      }
      
      const images = Array.from(imageMap.values())
        .sort((a, b) => b.count - a.count);
      
      res.json(images);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch featured images" });
    }
  });

  // Search Pexels for replacement images (for troubleshooting)
  app.post("/api/sites/:id/pexels-search", requireAuth, requireSiteAccess(), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { keywords } = req.body;
      
      if (!keywords || typeof keywords !== "string" || !keywords.trim()) {
        return res.status(400).json({ error: "keywords string is required" });
      }
      
      const imageUrl = await searchPexelsImage(keywords.trim());
      
      if (!imageUrl) {
        return res.status(404).json({ error: "No images found for those keywords" });
      }
      
      res.json({ imageUrl });
    } catch (error) {
      console.error("[Pexels Search] Error:", error);
      res.status(500).json({ error: "Failed to search Pexels" });
    }
  });

  // Bulk auto-replace images with Pexels (fully automated)
  app.post("/api/sites/:id/bulk-auto-replace", requireAuth, requireSiteAccess(), async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check subscription access for bulk operations
      if (req.user) {
        const subscriptionCheck = await checkSubscriptionAccess(req.user);
        if (!subscriptionCheck.hasAccess) {
          return res.status(403).json({ 
            error: subscriptionCheck.reason || "Active subscription required", 
            code: "SUBSCRIPTION_REQUIRED" 
          });
        }
      }
      
      const siteId = req.params.id;
      const { oldImageUrl } = req.body;
      
      if (!oldImageUrl || typeof oldImageUrl !== "string") {
        return res.status(400).json({ error: "oldImageUrl is required" });
      }
      
      // Get all posts for this site
      const allPosts = await storage.getPostsBySiteId(siteId);
      
      // Find posts with the old image
      const postsToUpdate = allPosts.filter((p: { imageUrl?: string | null }) => p.imageUrl === oldImageUrl);
      
      if (postsToUpdate.length === 0) {
        return res.json({ success: true, updated: 0, failed: 0, results: [], message: "No posts found with that image" });
      }
      
      // Get all currently used image URLs to avoid duplicates
      const usedImageUrls = new Set<string>();
      for (const post of allPosts) {
        if (post.imageUrl && post.imageUrl !== oldImageUrl) {
          usedImageUrls.add(post.imageUrl);
        }
      }
      
      // Stop words to filter out when extracting keywords
      const stopWords = new Set([
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "must", "shall", "can", "need",
        "this", "that", "these", "those", "i", "you", "he", "she", "it", "we",
        "they", "what", "which", "who", "whom", "how", "why", "when", "where",
        "your", "my", "our", "their", "its", "his", "her", "as", "if", "so",
        "than", "then", "just", "only", "also", "even", "more", "most", "very",
        "too", "now", "here", "there", "all", "any", "each", "every", "both",
        "few", "many", "some", "such", "no", "not", "own", "same", "other"
      ]);
      
      const extractKeywords = (title: string): string => {
        const words = title.toLowerCase()
          .replace(/[^\w\s]/g, "")
          .split(/\s+/)
          .filter(w => w.length > 2 && !stopWords.has(w));
        return words.slice(0, 4).join(" ");
      };
      
      const results: Array<{ postId: string; title: string; success: boolean; newImageUrl?: string; error?: string }> = [];
      let updated = 0;
      let failed = 0;
      
      // Process each post
      for (const post of postsToUpdate) {
        try {
          const keywords = extractKeywords(post.title);
          
          if (!keywords) {
            results.push({ postId: post.id, title: post.title, success: false, error: "Could not extract keywords from title" });
            failed++;
            continue;
          }
          
          // Search Pexels with exclusion of already-used URLs
          const newImageUrl = await searchPexelsImage(keywords, undefined, usedImageUrls);
          
          if (!newImageUrl) {
            results.push({ postId: post.id, title: post.title, success: false, error: "No Pexels image found for keywords: " + keywords });
            failed++;
            continue;
          }
          
          // Update the post
          await storage.updatePost(post.id, { imageUrl: newImageUrl });
          
          // Add the new URL to the exclusion set for future posts
          usedImageUrls.add(newImageUrl);
          
          results.push({ postId: post.id, title: post.title, success: true, newImageUrl });
          updated++;
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          results.push({ postId: post.id, title: post.title, success: false, error: errorMessage });
          failed++;
        }
      }
      
      res.json({
        success: true,
        updated,
        failed,
        total: postsToUpdate.length,
        results
      });
      
    } catch (error) {
      console.error("[Bulk Auto-Replace] Error:", error);
      res.status(500).json({ error: "Failed to bulk replace images" });
    }
  });

  // === PUBLIC ROUTES ===

  app.get("/api/domain-check", async (req: DomainRequest, res: Response) => {
    // Use hostname from query parameter (sent by frontend) if available
    // This supports reverse proxy scenarios where the backend sees a different hostname
    const hostnameParam = req.query.hostname as string | undefined;
    const hostname = hostnameParam || req.hostname;
    
    console.log(`[domain-check] Query hostname=${hostnameParam}, req.hostname=${req.hostname}, using=${hostname}`);
    
    const isExplicitAdminDomain = hostname === ADMIN_DOMAIN;
    const isReplitDefaultHost = hostname.includes("replit.dev") || hostname.includes("replit.app") || hostname === "blogvirality.brandvirality.com";
    
    // Check if this hostname is associated with a site
    const site = await storage.getSiteByDomain(hostname);
    
    if (site) {
      console.log(`[domain-check] Found site: ${site.domain} for hostname=${hostname}`);
      // Return site info AND indicate admin is accessible
      // The frontend will decide whether to show admin or public based on the current path
      return res.json({ 
        isAdmin: false, 
        site,
        // Allow admin access from any site domain - frontend will route based on path
        allowAdminAccess: true,
        siteId: site.id
      });
    }

    if (isExplicitAdminDomain || isReplitDefaultHost) {
      // Pure admin domain - no site context
      return res.json({ isAdmin: true, allowAdminAccess: true });
    }

    console.log(`[domain-check] No site found for hostname=${hostname}`);
    res.json({ isAdmin: false, site: null, allowAdminAccess: false });
  });

  // SSR Debug endpoint - traces the EXACT production SSR lookup path
  // Mirrors the logic in server/vite.ts serveStatic() line by line
  app.get("/api/ssr-debug", async (req: Request, res: Response) => {
    try {
      const hostname = (req.query.hostname as string) || req.hostname;
      const url = (req.query.path as string) || "/";
      
      // Step 1: Resolve site (mirrors line 453 in vite.ts)
      const site = await storage.getSiteByDomain(hostname);
      if (!site) {
        return res.json({
          success: false,
          error: "Site not found",
          hostname,
          url,
          step: "site_resolution",
        });
      }
      
      // Step 2: Compute basePath and routePath (mirrors lines 457-462 in vite.ts)
      const basePath = normalizeBasePath(site.basePath);
      const fullPath = url.split("?")[0];
      let routePath = fullPath;
      if (basePath && routePath.startsWith(basePath)) {
        routePath = routePath.slice(basePath.length) || "/";
      }
      
      // Step 3: Normalize trailing slashes (mirrors lines 464-467 in vite.ts)
      let trailingSlashNormalized = false;
      if (routePath.length > 1 && routePath.endsWith("/")) {
        routePath = routePath.slice(0, -1);
        trailingSlashNormalized = true;
      }
      
      // Step 4: Check canonical redirect (mirrors lines 470-476 in vite.ts)
      const postUrlFormat = (site.postUrlFormat as "with-prefix" | "root") || "with-prefix";
      // Simplified check - in production this would redirect
      let canonicalRedirectUrl: string | null = null;
      const postPrefixMatch = routePath.match(/^\/post\/(.+)$/);
      if (postPrefixMatch && postUrlFormat === "root") {
        canonicalRedirectUrl = basePath + "/" + postPrefixMatch[1];
      }
      const rootSlugMatch = routePath.match(/^\/([^\/]+)$/);
      if (rootSlugMatch && postUrlFormat === "with-prefix" && !routePath.startsWith("/tag/") && !routePath.startsWith("/topics/")) {
        // Check if this is actually a post (not a system route)
        const systemRoutes = ["rss.xml", "sitemap.xml", "robots.txt", "favicon.ico", "favicon.png", "manifest.json", "sw.js", "service-worker.js", "about", "contact", "privacy", "terms", "search", "categories", "archives"];
        if (!systemRoutes.includes(rootSlugMatch[1].toLowerCase())) {
          canonicalRedirectUrl = basePath + "/post/" + rootSlugMatch[1];
        }
      }
      
      // Step 5: Determine alias domain (mirrors line 479 in vite.ts)
      const isAliasDomain = hostname !== site.domain;
      
      // Step 6: Analyze route using shared utility
      const analysis = analyzeRouteForPost(routePath);
      
      // Step 7: If slug detected, try lookup (mirrors getSSRData behavior)
      let postLookupResult: { found: boolean; postId?: string; title?: string; slug?: string; error?: string } | null = null;
      if (analysis.extractedSlug) {
        try {
          const post = await storage.getPostBySlug(site.id, analysis.extractedSlug);
          postLookupResult = post 
            ? { found: true, postId: post.id, title: post.title, slug: post.slug }
            : { found: false, slug: analysis.extractedSlug };
        } catch (e: any) {
          postLookupResult = { found: false, error: e.message, slug: analysis.extractedSlug };
        }
      }
      
      // Step 8: List some posts to verify site has data
      let samplePosts: { slug: string; title: string }[] = [];
      try {
        const allPosts = await storage.getPostsBySiteId(site.id);
        samplePosts = allPosts.slice(0, 5).map(p => ({ slug: p.slug, title: p.title }));
      } catch (e) {
        // ignore
      }
      
      // Step 9: Return full diagnostic matching EXACT production flow
      res.json({
        success: true,
        input: {
          hostname,
          url,
        },
        site: {
          id: site.id,
          domain: site.domain,
          basePath: site.basePath,
          postUrlFormat: site.postUrlFormat,
        },
        ssrProcessing: {
          step1_fullPath: fullPath,
          step2_normalizedBasePath: basePath,
          step3_routePathAfterBasePathStrip: routePath,
          step4_trailingSlashNormalized: trailingSlashNormalized,
          step5_canonicalRedirectUrl: canonicalRedirectUrl,
          step6_isAliasDomain: isAliasDomain,
        },
        routeAnalysis: analysis,
        postLookup: postLookupResult,
        samplePostsInSite: samplePosts,
        note: "This mirrors the EXACT logic in server/vite.ts serveStatic() lines 447-498",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      });
    }
  });

  // Helper function to get all valid slugs for a site
  // Includes both existing posts AND pillar articles (from topical map)
  // This allows internal links to future posts that will be generated
  async function getValidSlugsForSite(siteId: string): Promise<Set<string>> {
    const validSlugs = new Set<string>();
    
    // Add all existing post slugs
    const allPosts = await storage.getPostsBySiteId(siteId);
    allPosts.forEach(p => validSlugs.add(p.slug));
    
    // Also add all pillar article slugs (from topical map) - these will become posts
    const pillars = await storage.getPillarsBySiteId(siteId);
    for (const pillar of pillars) {
      const pillarArticles = await storage.getPillarArticlesByPillarId(pillar.id);
      pillarArticles.forEach(a => validSlugs.add(a.slug));
    }
    
    return validSlugs;
  }

  // Helper function to rewrite internal links in post content based on site URL config
  // Also validates links - broken links are converted to plain text
  async function rewritePostContent<T extends { content: string }>(post: T, siteId: string): Promise<T> {
    const site = await storage.getSiteById(siteId);
    if (!site) return post;
    
    // Get all valid slugs for this site (existing posts + pillar articles)
    const validSlugs = await getValidSlugsForSite(siteId);
    
    const urlConfig: SiteUrlConfig = {
      basePath: site.basePath || "",
      postUrlFormat: (site.postUrlFormat as "with-prefix" | "root") || "with-prefix",
      validSlugs, // Include valid slugs for link validation
    };
    
    return {
      ...post,
      content: rewriteInternalPostLinks(post.content, urlConfig),
    };
  }
  
  async function rewritePostsContent<T extends { content: string }>(posts: T[], siteId: string): Promise<T[]> {
    const site = await storage.getSiteById(siteId);
    if (!site) return posts;
    
    // Get all valid slugs for this site (existing posts + pillar articles)
    const validSlugs = await getValidSlugsForSite(siteId);
    
    const urlConfig: SiteUrlConfig = {
      basePath: site.basePath || "",
      postUrlFormat: (site.postUrlFormat as "with-prefix" | "root") || "with-prefix",
      validSlugs, // Include valid slugs for link validation
    };
    
    return posts.map(post => ({
      ...post,
      content: rewriteInternalPostLinks(post.content, urlConfig),
    }));
  }

  app.get("/api/public/sites/:id/posts", async (req: Request, res: Response) => {
    try {
      // Use method with authors to include author names in public posts (only published)
      const posts = await storage.getPublishedPostsBySiteIdWithAuthors(req.params.id);
      const rewrittenPosts = await rewritePostsContent(posts, req.params.id);
      res.json(rewrittenPosts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/public/sites/:id/posts/:slug", async (req: Request, res: Response) => {
    try {
      // Use method with author to include author name in public post detail
      const post = await storage.getPostBySlugWithAuthor(req.params.id, req.params.slug);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      // Only show published posts on public site
      if (post.status === "draft") {
        return res.status(404).json({ error: "Post not found" });
      }
      const rewrittenPost = await rewritePostContent(post, req.params.id);
      res.json(rewrittenPost);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  app.get("/api/public/sites/:id/posts-by-tag/:tag", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPostsByTag(req.params.id, decodeURIComponent(req.params.tag));
      const rewrittenPosts = await rewritePostsContent(posts, req.params.id);
      res.json(rewrittenPosts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/public/sites/:id/posts-by-tags/:tags", async (req: Request, res: Response) => {
    try {
      const tags = decodeURIComponent(req.params.tags).split(",").filter(t => t.trim());
      if (tags.length === 0) {
        return res.json([]);
      }
      const posts = await storage.getPostsByTags(req.params.id, tags);
      const rewrittenPosts = await rewritePostsContent(posts, req.params.id);
      res.json(rewrittenPosts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/public/sites/:id/top-tags", async (req: Request, res: Response) => {
    try {
      const tags = await storage.getTopTags(req.params.id, 10);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  // Public menu items endpoint (no auth required for public site navigation)
  app.get("/api/public/sites/:id/menu-items", async (req: Request, res: Response) => {
    try {
      const items = await storage.getMenuItemsBySiteId(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.get("/api/public/sites/:id/related-posts/:postId", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getRelatedPosts(req.params.postId, req.params.id);
      const rewrittenPosts = await rewritePostsContent(posts, req.params.id);
      res.json(rewrittenPosts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch related posts" });
    }
  });

  // Robots.txt Route
  // Dynamically generates robots.txt per site with sitemap reference
  app.get("/robots.txt", async (req: DomainRequest, res: Response) => {
    try {
      let site = null;
      // For robots.txt URLs, prioritize visitor hostname (from X-BV-Visitor-Host header)
      // This ensures proxy deployments (Netlify, nginx) get correct sitemap URL
      let robotsHostname = req.siteVisitorHostname || req.siteHostname || req.hostname;
      let basePath = req.siteBasePath || "";
      
      // If siteId is already set by middleware, use that
      if (req.siteId) {
        site = await storage.getSiteById(req.siteId);
      } else {
        // Fallback: try to get site by hostname
        site = await storage.getSiteByDomain(req.hostname);
        if (site) {
          basePath = normalizeBasePath(site.basePath);
        }
      }
      
      if (!site) {
        // Return a basic robots.txt for admin/unknown domains
        res.set("Content-Type", "text/plain");
        res.send("User-agent: *\nDisallow: /");
        return;
      }

      // Construct sitemap URL
      const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const sitemapUrl = `${protocol}://${robotsHostname}${basePath}/sitemap.xml`;
      
      const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;
      
      res.set("Content-Type", "text/plain");
      res.set("Cache-Control", "public, max-age=86400"); // 24 hours
      res.send(robotsTxt);
    } catch (error) {
      console.error("Error generating robots.txt:", error);
      res.status(500).send("Error generating robots.txt");
    }
  });

  // Sitemap Routes
  // Public sitemap.xml - served based on domain
  // Uses hostname and basePath already computed by domain routing middleware
  app.get("/sitemap.xml", async (req: DomainRequest, res: Response) => {
    try {
      // Log the request for debugging
      console.log(`[Sitemap] Request: siteId=${req.siteId}, siteHostname=${req.siteHostname}, siteVisitorHostname=${req.siteVisitorHostname}, siteBasePath=${req.siteBasePath}, req.hostname=${req.hostname}`);
      
      let site = null;
      // For sitemap URLs, prioritize visitor hostname (from X-BV-Visitor-Host header)
      // This ensures proxy deployments (Netlify, nginx) get correct URLs in the sitemap
      let sitemapHostname = req.siteVisitorHostname || req.siteHostname || req.hostname;
      let basePath = req.siteBasePath || "";
      
      // If siteId is already set by middleware, use that
      if (req.siteId) {
        site = await storage.getSiteById(req.siteId);
      } else {
        // Fallback: try to get site by hostname
        site = await storage.getSiteByDomain(req.hostname);
        if (site) {
          // Site found by hostname, use the site's basePath
          basePath = normalizeBasePath(site.basePath);
        }
      }
      
      if (!site) {
        console.log(`[Sitemap] Site not found for hostname=${req.hostname}`);
        return res.status(404).send("Site not found");
      }

      // Construct base URL
      const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const baseUrl = `${protocol}://${sitemapHostname}${basePath}`;
      
      console.log(`[Sitemap] Generating sitemap: site=${site.domain}, baseUrl=${baseUrl}, hostname=${sitemapHostname}, basePath=${basePath}`);
      
      const xml = await generateSitemap(site, baseUrl);
      
      res.set("Content-Type", "application/xml");
      res.set("Cache-Control", "public, max-age=900"); // 15 minutes
      // Debug headers to troubleshoot proxy issues
      res.set("X-Sitemap-Hostname", sitemapHostname);
      res.set("X-Sitemap-BasePath", basePath || "(none)");
      res.set("X-Sitemap-BaseUrl", baseUrl);
      res.set("X-Req-Hostname", req.hostname);
      res.set("X-BV-Visitor-Host-Received", req.headers["x-bv-visitor-host"] as string || "(none)");
      res.set("X-Forwarded-Host-Received", req.headers["x-forwarded-host"] as string || "(none)");
      res.send(xml);
    } catch (error) {
      console.error("Error generating sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });

  // Admin API to get sitemap stats
  app.get("/api/sites/:id/sitemap/stats", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const stats = await getSitemapStats(req.params.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sitemap stats" });
    }
  });

  // Admin API to regenerate sitemap cache
  app.post("/api/sites/:id/sitemap/regenerate", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      invalidateSitemapCache(req.params.id);
      
      const site = await storage.getSiteById(req.params.id);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      // Generate with full base URL including optional base path (normalized)
      const basePath = normalizeBasePath(site.basePath);
      const baseUrl = `https://${site.domain}${basePath}`;
      await generateSitemap(site, baseUrl);
      
      const stats = await getSitemapStats(req.params.id);
      res.json({ success: true, stats });
    } catch (error) {
      res.status(500).json({ error: "Failed to regenerate sitemap" });
    }
  });

  // Preview sitemap XML for a site (admin)
  app.get("/api/sites/:id/sitemap/preview", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const site = await storage.getSiteById(req.params.id);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      const basePath = normalizeBasePath(site.basePath);
      const baseUrl = `https://${site.domain}${basePath}`;
      const xml = await generateSitemap(site, baseUrl);
      
      res.set("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate sitemap preview" });
    }
  });

  // ========================================
  // MENU ITEMS ROUTES
  // ========================================

  // Get all menu items for a site
  app.get("/api/sites/:id/menu-items", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const items = await storage.getMenuItemsBySiteId(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  // Create a new menu item
  app.post("/api/sites/:id/menu-items", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const item = await storage.createMenuItem({
        siteId: req.params.id,
        ...req.body,
      });
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create menu item" });
    }
  });

  // Reorder menu items (must come before :itemId routes)
  app.post("/api/sites/:id/menu-items/reorder", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const { itemIds } = req.body;
      if (!Array.isArray(itemIds)) {
        return res.status(400).json({ error: "itemIds must be an array" });
      }
      await storage.reorderMenuItems(req.params.id, itemIds);
      const items = await storage.getMenuItemsBySiteId(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder menu items" });
    }
  });

  // Update a menu item
  app.put("/api/sites/:id/menu-items/:itemId", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const item = await storage.getMenuItemById(req.params.itemId);
      if (!item || item.siteId !== req.params.id) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      const updated = await storage.updateMenuItem(req.params.itemId, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update menu item" });
    }
  });

  // Delete a menu item
  app.delete("/api/sites/:id/menu-items/:itemId", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const item = await storage.getMenuItemById(req.params.itemId);
      if (!item || item.siteId !== req.params.id) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      await storage.deleteMenuItem(req.params.itemId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });

  // ========================================
  // SITE AUTHORS ROUTES
  // ========================================

  // Get all authors for a site
  app.get("/api/sites/:id/authors", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const authors = await storage.getAuthorsBySiteId(req.params.id);
      res.json(authors);
    } catch (error) {
      console.error("Error fetching authors:", error);
      res.status(500).json({ error: "Failed to fetch authors" });
    }
  });

  // Create a new author
  app.post("/api/sites/:id/authors", requireAuth, requireSiteAccess("id", "edit"), async (req: Request, res: Response) => {
    try {
      const { name, slug, bio, avatarUrl, isDefault } = req.body;
      if (!name || !slug) {
        return res.status(400).json({ error: "Name and slug are required" });
      }
      
      const author = await storage.createAuthor({
        siteId: req.params.id,
        name,
        slug,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        isDefault: isDefault || false,
      });
      
      // If this is set as default, update default status
      if (isDefault) {
        await storage.setDefaultAuthor(req.params.id, author.id);
      }
      
      res.status(201).json(author);
    } catch (error) {
      console.error("Error creating author:", error);
      res.status(500).json({ error: "Failed to create author" });
    }
  });

  // Update an author
  app.put("/api/sites/:id/authors/:authorId", requireAuth, requireSiteAccess("id", "edit"), async (req: Request, res: Response) => {
    try {
      const author = await storage.getAuthorById(req.params.authorId);
      if (!author || author.siteId !== req.params.id) {
        return res.status(404).json({ error: "Author not found" });
      }
      
      const { name, slug, bio, avatarUrl, isDefault } = req.body;
      const updated = await storage.updateAuthor(req.params.authorId, {
        name,
        slug,
        bio,
        avatarUrl,
      });
      
      // Handle default status update
      if (isDefault === true) {
        await storage.setDefaultAuthor(req.params.id, req.params.authorId);
      }
      
      // Fetch updated author with correct default status
      const refreshed = await storage.getAuthorById(req.params.authorId);
      res.json(refreshed);
    } catch (error) {
      console.error("Error updating author:", error);
      res.status(500).json({ error: "Failed to update author" });
    }
  });

  // Delete an author
  app.delete("/api/sites/:id/authors/:authorId", requireAuth, requireSiteAccess("id", "edit"), async (req: Request, res: Response) => {
    try {
      const author = await storage.getAuthorById(req.params.authorId);
      if (!author || author.siteId !== req.params.id) {
        return res.status(404).json({ error: "Author not found" });
      }
      await storage.deleteAuthor(req.params.authorId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting author:", error);
      res.status(500).json({ error: "Failed to delete author" });
    }
  });

  // ========================================
  // ANALYTICS ROUTES
  // ========================================

  // Track a post view (public endpoint for the frontend)
  // Protected by: rate limiting, cookie deduplication, and IP+slug fingerprint cache
  app.post("/api/posts/:slug/view", viewTrackingLimiter, async (req: Request, res: Response) => {
    try {
      const { siteId, visitorIP } = req.body;
      if (!siteId) {
        return res.status(400).json({ error: "siteId required" });
      }
      
      const slug = req.params.slug;
      
      // Get client IP for fingerprinting
      const { getDeviceType, getBrowserName, getCountryFromIP, getClientIP } = await import("./analytics-utils");
      
      // Log ALL relevant headers for debugging
      console.log(`[ViewTrack] === Headers Debug ===`);
      console.log(`[ViewTrack] X-Real-IP: ${req.headers["x-real-ip"]}`);
      console.log(`[ViewTrack] X-BV-Visitor-IP: ${req.headers["x-bv-visitor-ip"]}`);
      console.log(`[ViewTrack] X-Forwarded-For: ${req.headers["x-forwarded-for"]}`);
      console.log(`[ViewTrack] Browser-sent visitorIP: ${visitorIP}`);
      
      // Use browser-sent IP as fallback if server headers don't have it
      let clientIP = getClientIP(req.headers as Record<string, string | string[] | undefined>);
      if ((clientIP === "Unknown" || !clientIP) && visitorIP) {
        clientIP = visitorIP;
        console.log(`[ViewTrack] Using browser-sent visitorIP: ${clientIP}`);
      }
      console.log(`[ViewTrack] Final clientIP: ${clientIP}`);
      
      // Create fingerprint from IP + siteId + slug
      const fingerprint = `${clientIP}:${siteId}:${slug}`;
      
      // Check if this is a new unique visitor for today (IP + siteId + date)
      const today = new Date().toISOString().split("T")[0];
      const uniqueVisitorKey = `unique:${clientIP}:${siteId}:${today}`;
      const isNewUniqueVisitor = !viewCache.has(uniqueVisitorKey);
      
      // Check cookie-based deduplication (browser-level)
      const viewedCookie = req.cookies?.[`viewed_${siteId}_${slug}`];
      
      // Check server-side cache (IP-level, survives cookie clearing)
      const lastViewTime = viewCache.get(fingerprint);
      const now = Date.now();
      
      // If we've seen this view recently (cookie OR cache), skip counting
      if (viewedCookie || (lastViewTime && now - lastViewTime < VIEW_COOLDOWN_MS)) {
        return res.json({ success: true, counted: false, reason: "duplicate" });
      }
      
      // Verify post exists before counting
      const post = await storage.getPostBySlug(siteId, slug);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      // Mark as viewed in server-side cache
      viewCache.set(fingerprint, now);
      
      // Mark unique visitor for today (to avoid double-counting)
      if (isNewUniqueVisitor) {
        viewCache.set(uniqueVisitorKey, now);
      }
      
      // Set cookie to prevent duplicate counting from same browser (24 hour expiry)
      res.cookie(`viewed_${siteId}_${slug}`, "1", {
        maxAge: VIEW_COOLDOWN_MS,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      
      // Increment legacy post view count
      await storage.incrementPostViewCount(post.id);
      
      // Parse user-agent for device and browser info
      const userAgent = req.headers["user-agent"] || "";
      const deviceType = getDeviceType(userAgent);
      const browserName = getBrowserName(userAgent);
      
      // Get country from IP (async, non-blocking - will use "Unknown" if fails)
      let country = "Unknown";
      try {
        country = await getCountryFromIP(clientIP);
        console.log(`[ViewTrack] Country resolved: ${country} for IP: ${clientIP}`);
      } catch (geoError) {
        console.log(`[ViewTrack] GeoIP error:`, geoError);
        // Non-critical, continue with Unknown
      }
      
      // Record in daily stats (aggregated)
      console.log(`[ViewTrack] Recording view: siteId=${siteId}, slug=${post.slug}, device=${deviceType}, browser=${browserName}, country=${country}, isNewUniqueVisitor=${isNewUniqueVisitor}`);
      await storage.recordPageView(siteId, post.slug, deviceType, browserName, country, isNewUniqueVisitor);
      
      res.json({ success: true, counted: true });
    } catch (error) {
      console.error("Error tracking view:", error);
      res.status(500).json({ error: "Failed to track view" });
    }
  });

  // Get site analytics summary
  app.get("/api/sites/:id/analytics", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const totalViews = await storage.getTotalSiteViews(req.params.id);
      const popularPosts = await storage.getPopularPosts(req.params.id, 10);
      const posts = await storage.getPostsBySiteId(req.params.id);
      
      // Get daily stats for the last 30 days
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const dailyStats = await storage.getDailyStatsRange(req.params.id, startDate, endDate);
      
      // Aggregate breakdowns across all days (page views, not unique visitors)
      const aggregatedDevice: Record<string, number> = {};
      const aggregatedBrowser: Record<string, number> = {};
      const aggregatedCountry: Record<string, number> = {};
      
      for (const day of dailyStats) {
        // Merge device breakdown (page views)
        for (const [key, value] of Object.entries(day.deviceBreakdown || {})) {
          aggregatedDevice[key] = (aggregatedDevice[key] || 0) + value;
        }
        
        // Merge browser breakdown (page views)
        for (const [key, value] of Object.entries(day.browserBreakdown || {})) {
          aggregatedBrowser[key] = (aggregatedBrowser[key] || 0) + value;
        }
        
        // Merge country breakdown (page views by country - NOT unique visitors)
        for (const [key, value] of Object.entries(day.countryBreakdown || {})) {
          aggregatedCountry[key] = (aggregatedCountry[key] || 0) + value;
        }
      }
      
      // Convert to sorted arrays for charts
      const deviceBreakdown = Object.entries(aggregatedDevice)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      
      const browserBreakdown = Object.entries(aggregatedBrowser)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      
      const countryBreakdown = Object.entries(aggregatedCountry)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10); // Top 10 countries by page views
      
      // Format daily views as time series
      const viewsOverTime = dailyStats.map(day => ({
        date: day.date,
        views: day.views,
        uniqueVisitors: day.uniqueVisitors,
      }));
      
      res.json({
        totalViews,
        totalPosts: posts.length,
        popularPosts: popularPosts.map(p => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          viewCount: p.viewCount,
        })),
        // Enhanced analytics - aggregated across date range
        deviceBreakdown,
        browserBreakdown,
        countryBreakdown,
        // Daily time series with per-day unique visitor counts (accurate for each day)
        viewsOverTime,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // ========================================
  // TOPICAL AUTHORITY ROUTES
  // ========================================

  // POST /api/sites/:id/topic-suggestions - Generate AI topic suggestions
  app.post("/api/sites/:id/topic-suggestions", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const siteId = req.params.id;
      const site = await storage.getSiteById(siteId);
      
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      if (!hasValidBusinessProfile(site)) {
        return res.status(400).json({
          error: "Business profile required",
          message: "Please complete your Business Profile before generating topic suggestions.",
          code: "BUSINESS_PROFILE_REQUIRED"
        });
      }
      
      // Get existing pillars to avoid duplicates
      const existingPillars = await storage.getPillarsBySiteId(siteId);
      const existingPillarNames = existingPillars.map(p => p.name);
      
      // Delete old suggestions before generating new ones
      await storage.deleteTopicSuggestions(siteId);
      
      // Generate suggestions using OpenAI
      const aiSuggestions = await generateTopicSuggestions(site, existingPillarNames);
      
      // Store in database
      const storedSuggestions = await storage.createTopicSuggestions(
        aiSuggestions.map(s => ({
          siteId,
          name: s.name,
          description: s.description,
          packType: s.packType,
          suggestedArticleCount: s.suggestedArticleCount,
          used: false,
        }))
      );
      
      return res.json({ suggestions: storedSuggestions });
    } catch (error: any) {
      console.error("[Topic Suggestions] Error:", error);
      return res.status(500).json({ error: error.message || "Failed to generate suggestions" });
    }
  });

  // GET /api/sites/:id/topic-suggestions - Get stored suggestions
  app.get("/api/sites/:id/topic-suggestions", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const suggestions = await storage.getTopicSuggestions(req.params.id);
      return res.json({ suggestions });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // PATCH /api/topic-suggestions/:id/used - Mark suggestion as used
  app.patch("/api/topic-suggestions/:id/used", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Get suggestion to verify ownership
      const suggestion = await storage.getTopicSuggestionById(req.params.id);
      if (!suggestion) {
        return res.status(404).json({ error: "Suggestion not found" });
      }
      
      // Check site access for non-admins
      if (req.user?.role !== "admin") {
        const hasAccess = await storage.canUserAccessSite(req.user!.id, suggestion.siteId);
        if (!hasAccess) {
          return res.status(403).json({ error: "You don't have access to this site" });
        }
      }
      
      await storage.markSuggestionUsed(req.params.id);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Get all pillars for a site
  app.get("/api/sites/:id/pillars", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const pillars = await storage.getPillarsBySiteId(req.params.id);
      // Get stats for each pillar
      const pillarsWithStats = await Promise.all(
        pillars.map(async (pillar) => {
          const stats = await storage.getPillarArticleStats(pillar.id);
          const clusters = await storage.getClustersByPillarId(pillar.id);
          return {
            ...pillar,
            stats,
            clusterCount: clusters.length,
          };
        })
      );
      res.json(pillarsWithStats);
    } catch (error) {
      console.error("Error fetching pillars:", error);
      res.status(500).json({ error: "Failed to fetch pillars" });
    }
  });

  // Create a new pillar
  app.post("/api/sites/:id/pillars", requireAuth, requireSiteAccess("id", "edit"), async (req: Request, res: Response) => {
    try {
      const site = await storage.getSiteById(req.params.id);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      if (!hasValidBusinessProfile(site)) {
        return res.status(400).json({ 
          error: "Business profile required",
          message: "Please complete your Business Profile before using AI features. Go to Site Settings > Business Profile.",
          code: "BUSINESS_PROFILE_REQUIRED"
        });
      }

      const parsed = insertPillarSchema.safeParse({
        ...req.body,
        siteId: req.params.id,
      });
      
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid pillar data", details: parsed.error.errors });
      }

      const pillar = await storage.createPillar(parsed.data);
      res.status(201).json(pillar);
    } catch (error) {
      console.error("Error creating pillar:", error);
      res.status(500).json({ error: "Failed to create pillar" });
    }
  });

  // Get a specific pillar with full details
  app.get("/api/pillars/:pillarId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pillar = await storage.getPillarById(req.params.pillarId);
      if (!pillar) {
        return res.status(404).json({ error: "Pillar not found" });
      }

      // Check site access for non-admins
      if (req.user?.role !== "admin") {
        const hasAccess = await storage.canUserAccessSite(req.user!.id, pillar.siteId);
        if (!hasAccess) {
          return res.status(403).json({ error: "You don't have access to this pillar" });
        }
      }

      // Get clusters and articles
      const clusters = await storage.getClustersByPillarId(pillar.id);
      const articles = await storage.getPillarArticlesByPillarId(pillar.id);
      const stats = await storage.getPillarArticleStats(pillar.id);

      res.json({
        ...pillar,
        clusters: clusters.map(cluster => ({
          ...cluster,
          articles: articles.filter(a => a.clusterId === cluster.id),
        })),
        pillarArticle: articles.find(a => a.articleType === "pillar"),
        stats,
      });
    } catch (error) {
      console.error("Error fetching pillar:", error);
      res.status(500).json({ error: "Failed to fetch pillar" });
    }
  });

  // Update a pillar
  app.patch("/api/pillars/:pillarId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pillar = await storage.getPillarById(req.params.pillarId);
      if (!pillar) {
        return res.status(404).json({ error: "Pillar not found" });
      }

      // Check site access for non-admins
      if (req.user?.role !== "admin") {
        const hasAccess = await storage.canUserAccessSite(req.user!.id, pillar.siteId);
        if (!hasAccess) {
          return res.status(403).json({ error: "You don't have access to this pillar" });
        }
      }

      const updated = await storage.updatePillar(req.params.pillarId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating pillar:", error);
      res.status(500).json({ error: "Failed to update pillar" });
    }
  });

  // Delete a pillar
  app.delete("/api/pillars/:pillarId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pillar = await storage.getPillarById(req.params.pillarId);
      if (!pillar) {
        return res.status(404).json({ error: "Pillar not found" });
      }

      // Check site access for non-admins
      if (req.user?.role !== "admin") {
        const hasAccess = await storage.canUserAccessSite(req.user!.id, pillar.siteId);
        if (!hasAccess) {
          return res.status(403).json({ error: "You don't have access to this pillar" });
        }
      }

      await storage.deletePillar(req.params.pillarId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting pillar:", error);
      res.status(500).json({ error: "Failed to delete pillar" });
    }
  });

  // Generate topical map for a pillar (AI-powered)
  app.post("/api/pillars/:pillarId/generate-map", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pillar = await storage.getPillarById(req.params.pillarId);
      if (!pillar) {
        return res.status(404).json({ error: "Pillar not found" });
      }

      // Check site access for non-admins
      if (req.user?.role !== "admin") {
        const hasAccess = await storage.canUserAccessSite(req.user!.id, pillar.siteId);
        if (!hasAccess) {
          return res.status(403).json({ error: "You don't have access to this pillar" });
        }
      }

      // Check business profile before AI generation
      const site = await storage.getSiteById(pillar.siteId);
      if (!hasValidBusinessProfile(site)) {
        return res.status(400).json({ 
          error: "Business profile required",
          message: "Please complete your Business Profile before using AI features. Go to Site Settings > Business Profile.",
          code: "BUSINESS_PROFILE_REQUIRED"
        });
      }

      // Validate workflow - can only generate map from draft, failed, or mapped (with force flag) status
      const allowedStatuses = ["draft", "failed", "mapped"];
      const { force } = req.body;
      
      if (!allowedStatuses.includes(pillar.status)) {
        return res.status(400).json({ 
          error: `Cannot generate map: pillar is currently ${pillar.status}. Must be in 'draft', 'failed', or 'mapped' status.`
        });
      }
      
      // Require force flag to regenerate from mapped status (will clear existing clusters/articles)
      if (pillar.status === "mapped" && !force) {
        return res.status(400).json({
          error: "Pillar already has a topical map. Use force=true to regenerate (this will clear existing articles)."
        });
      }

      // Update status to mapping
      await storage.updatePillar(pillar.id, { status: "mapping" });

      // Import and call the topical map generator
      const { generateTopicalMap } = await import("./topical-authority");
      const result = await generateTopicalMap(pillar);

      res.json(result);
    } catch (error) {
      console.error("Error generating topical map:", error);
      // Reset status on error
      await storage.updatePillar(req.params.pillarId, { status: "failed" });
      res.status(500).json({ error: "Failed to generate topical map" });
    }
  });

  // Start content generation for a pillar
  app.post("/api/pillars/:pillarId/start-generation", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pillar = await storage.getPillarById(req.params.pillarId);
      if (!pillar) {
        return res.status(404).json({ error: "Pillar not found" });
      }

      // Check site access for non-admins
      if (req.user?.role !== "admin") {
        const hasAccess = await storage.canUserAccessSite(req.user!.id, pillar.siteId);
        if (!hasAccess) {
          return res.status(403).json({ error: "You don't have access to this pillar" });
        }
      }

      // Check business profile before AI generation
      const site = await storage.getSiteById(pillar.siteId);
      if (!hasValidBusinessProfile(site)) {
        return res.status(400).json({ 
          error: "Business profile required",
          message: "Please complete your Business Profile before using AI features. Go to Site Settings > Business Profile.",
          code: "BUSINESS_PROFILE_REQUIRED"
        });
      }

      if (pillar.status !== "mapped" && pillar.status !== "paused") {
        return res.status(400).json({ error: "Pillar must be mapped or paused to start generation" });
      }

      // Update status to generating
      await storage.updatePillar(pillar.id, { 
        status: "generating",
        nextPublishAt: new Date(),
      });

      res.json({ success: true, message: "Content generation started" });
    } catch (error) {
      console.error("Error starting generation:", error);
      res.status(500).json({ error: "Failed to start generation" });
    }
  });

  // Pause content generation for a pillar
  app.post("/api/pillars/:pillarId/pause-generation", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pillar = await storage.getPillarById(req.params.pillarId);
      if (!pillar) {
        return res.status(404).json({ error: "Pillar not found" });
      }

      // Check site access for non-admins
      if (req.user?.role !== "admin") {
        const hasAccess = await storage.canUserAccessSite(req.user!.id, pillar.siteId);
        if (!hasAccess) {
          return res.status(403).json({ error: "You don't have access to this pillar" });
        }
      }

      if (pillar.status !== "generating") {
        return res.status(400).json({ error: "Pillar must be generating to pause" });
      }

      await storage.updatePillar(pillar.id, { status: "paused" });
      res.json({ success: true, message: "Content generation paused" });
    } catch (error) {
      console.error("Error pausing generation:", error);
      res.status(500).json({ error: "Failed to pause generation" });
    }
  });

  // Get pillar article details
  app.get("/api/pillar-articles/:articleId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const article = await storage.getPillarArticleById(req.params.articleId);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      const pillar = await storage.getPillarById(article.pillarId);
      if (!pillar) {
        return res.status(404).json({ error: "Pillar not found" });
      }

      // Check site access for non-admins
      if (req.user?.role !== "admin") {
        const hasAccess = await storage.canUserAccessSite(req.user!.id, pillar.siteId);
        if (!hasAccess) {
          return res.status(403).json({ error: "You don't have access to this article" });
        }
      }

      // Get the linked post if exists
      let post = null;
      if (article.postId) {
        post = await storage.getPostById(article.postId);
      }

      res.json({ ...article, post });
    } catch (error) {
      console.error("Error fetching pillar article:", error);
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  // ============================================
  // ONBOARDING ENDPOINTS
  // ============================================

  const normalizeFaviconUrl = (candidate: string | undefined | null, baseUrl: string): string | null => {
    if (!candidate || typeof candidate !== "string") return null;
    const trimmed = candidate.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("data:")) return trimmed;
    try {
      return new URL(trimmed, baseUrl).toString();
    } catch {
      return null;
    }
  };

  const extractFaviconFromHtml = (html: string, baseUrl: string): string | null => {
    if (!html) return null;
    const linkTags = html.match(/<link[^>]+>/gi) || [];
    const iconLinks = linkTags.filter((tag) => /rel=["'][^"']*icon[^"']*["']/i.test(tag));
    const appleLinks = linkTags.filter((tag) => /rel=["'][^"']*apple-touch-icon[^"']*["']/i.test(tag));
    const candidates = [...iconLinks, ...appleLinks, ...linkTags];

    for (const tag of candidates) {
      const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
      if (!hrefMatch?.[1]) continue;
      const resolved = normalizeFaviconUrl(hrefMatch[1], baseUrl);
      if (resolved) return resolved;
    }
    return null;
  };

  const fallbackFromUrl = (url: string, metadata?: Record<string, unknown>) => {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "");
    const root = domain.split(".")[0] || "your site";
    const humanName = root.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const metaTitle = (metadata?.title as string) || (metadata?.ogTitle as string) || "";
    const metaDescription = (metadata?.description as string) || (metadata?.ogDescription as string) || "";
    const keywords = (metadata?.keywords as string) || "";
    const industryHint = keywords.split(",")[0]?.trim() || humanName;

    return {
      businessDescription: metaDescription || `${humanName} provides helpful products or services for its customers.`,
      targetAudience: `People looking for ${industryHint} solutions or information.`,
      brandVoice: "friendly",
      valuePropositions: `Clear value, reliable service, and easy-to-understand guidance.`,
      industry: industryHint,
      competitors: `Other ${industryHint} providers and alternatives in the market.`,
      suggestedTitle: metaTitle || humanName,
      suggestedMetaDescription: metaDescription || `Learn about ${humanName} and how it helps its customers.`,
    };
  };

  // Scrape a website and extract business information using Firecrawl + OpenAI
  app.post("/api/sites/:id/onboarding/scrape", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL is required" });
      }

      // Validate URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      // Extract domain from URL and check if blog subdomain is already in use
      const siteId = req.params.id;
      const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
      const blogSubdomain = `blog.${hostname}`;
      const existingSiteWithDomain = await storage.getSiteByDomain(blogSubdomain);
      if (existingSiteWithDomain && existingSiteWithDomain.id !== siteId) {
        return res.status(400).json({ 
          error: "Domain already in use",
          code: "DOMAIN_EXISTS",
          message: `The domain "${blogSubdomain}" is already registered to another site. Please use a different website URL or enter your details manually.`
        });
      }

      // Check if Firecrawl API key is configured
      if (!process.env.FIRECRAWL_API_KEY) {
        return res.status(500).json({ error: "Firecrawl API key not configured" });
      }

      // Import Firecrawl dynamically
      const FirecrawlApp = (await import("@mendable/firecrawl-js")).default;
      const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

      // Scrape the URL with waitFor to handle JS-rendered content
      console.log(`[Onboarding] Scraping URL: ${url}`);
      const scrapeResult = await firecrawl.scrapeUrl(url, {
        formats: ["markdown", "html"],
        onlyMainContent: false,
        waitFor: 3000,
      });

      if (!scrapeResult.success) {
        console.error("[Onboarding] Firecrawl scrape failed:", scrapeResult);
        return res.status(400).json({ error: "Failed to scrape website content" });
      }

      // Use markdown if available, otherwise try html
      const scrapedContent = scrapeResult.markdown || scrapeResult.html || "";
      const pageTitle = scrapeResult.metadata?.title || "";
      const pageDescription = scrapeResult.metadata?.description || "";
      const ogTitle = scrapeResult.metadata?.ogTitle || "";
      const ogDescription = scrapeResult.metadata?.ogDescription || "";
      const keywords = scrapeResult.metadata?.keywords || "";
      const faviconFromMetadata = normalizeFaviconUrl(
        (scrapeResult.metadata as Record<string, unknown>)?.favicon as string,
        url
      );
      const faviconFromHtml = extractFaviconFromHtml(scrapeResult.html || "", url);
      const fallbackFavicon = normalizeFaviconUrl("/favicon.ico", url);
      const favicon = faviconFromMetadata || faviconFromHtml || fallbackFavicon;
      
      // Use the already-extracted hostname to create blog subdomain for response
      const blogDomain = `blog.${hostname}`;

      console.log(`[Onboarding] Scraped content length: ${scrapedContent.length} chars`);
      console.log(`[Onboarding] Page title: ${pageTitle}`);
      console.log(`[Onboarding] Page description: ${pageDescription}`);
      console.log(`[Onboarding] OG title: ${ogTitle}`);
      console.log(`[Onboarding] OG description: ${ogDescription}`);
      console.log(`[Onboarding] Keywords: ${keywords}`);
      console.log(`[Onboarding] Content preview: ${scrapedContent.slice(0, 1000)}...`);

      // If content is too sparse, try to infer from metadata
      const hasMinimalContent = scrapedContent.length < 100;

      // Use OpenAI to analyze the scraped content and extract business info
      const { getOpenAIClient } = await import("./openai");
      const openai = getOpenAIClient();

      const analysisPrompt = `You are analyzing a website to extract business information for a content management system.

URL: ${url}
Page Title: ${pageTitle || "Not available"}
Meta Description: ${pageDescription || "Not available"}
OG Title: ${ogTitle || "Not available"}
OG Description: ${ogDescription || "Not available"}
Keywords: ${keywords || "Not available"}

Website Content (may be limited if site uses heavy JavaScript):
${scrapedContent.slice(0, 15000) || "Content could not be extracted"}

IMPORTANT: Even if the content is limited, you MUST provide reasonable inferences based on:
1. The URL/domain name (e.g., "myserenify.com" suggests wellness/relaxation)
2. Any available metadata (title, description)
3. Common patterns for similar business types

You MUST return a valid JSON object with ALL fields filled. Do NOT return empty strings - make reasonable inferences instead.

Return this exact JSON structure with ALL fields populated:
{
  "businessDescription": "A clear 1-2 sentence description - infer from domain name and any available info",
  "targetAudience": "Who would visit this site based on its apparent purpose",
  "brandVoice": "One of: professional, casual, authoritative, friendly, technical, conversational",
  "valuePropositions": "Likely benefits based on the type of business",
  "industry": "The market or industry this appears to be in",
  "competitors": "Similar businesses in this space",
  "suggestedTitle": "SEO-friendly site title (50-60 chars)",
  "suggestedMetaDescription": "Meta description for homepage (150-160 chars)"
}

Remember: Provide your best inference for EVERY field - do not leave any empty.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: analysisPrompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048,
      });

      const rawContent = response.choices[0].message.content || "{}";
      console.log(`[Onboarding] OpenAI raw response: ${rawContent}`);
      let analysisResult: Record<string, unknown> = {};
      try {
        analysisResult = JSON.parse(rawContent);
      } catch (parseError) {
        console.error("[Onboarding] Failed to parse OpenAI response:", parseError);
      }

      const fallback = fallbackFromUrl(url, scrapeResult.metadata as Record<string, unknown>);
      const pick = (value: unknown, fallbackValue: string) =>
        typeof value === "string" && value.trim() ? value.trim() : fallbackValue;

      console.log(`[Onboarding] Successfully analyzed website: ${url}`);
      console.log(`[Onboarding] Parsed result:`, JSON.stringify(analysisResult, null, 2));
      console.log(`[Onboarding] Suggested domain: ${blogDomain}`);
      console.log(`[Onboarding] Favicon: ${favicon}`);
      res.json({
        businessDescription: pick(analysisResult.businessDescription, fallback.businessDescription),
        targetAudience: pick(analysisResult.targetAudience, fallback.targetAudience),
        brandVoice: pick(analysisResult.brandVoice, fallback.brandVoice),
        valuePropositions: pick(analysisResult.valuePropositions, fallback.valuePropositions),
        industry: pick(analysisResult.industry, fallback.industry),
        competitors: pick(analysisResult.competitors, fallback.competitors),
        suggestedTitle: pick(analysisResult.suggestedTitle, fallback.suggestedTitle),
        suggestedMetaDescription: pick(analysisResult.suggestedMetaDescription, fallback.suggestedMetaDescription),
        favicon,
        suggestedDomain: blogDomain,
      });
    } catch (error) {
      console.error("[Onboarding] Error scraping website:", error);
      res.status(500).json({ error: "Failed to analyze website" });
    }
  });

  // Complete site onboarding - save business profile and mark as onboarded
  app.post("/api/sites/:id/onboarding/complete", requireAuth, requireSiteAccess(), async (req: Request, res: Response) => {
    try {
      const siteId = req.params.id;
      const {
        businessDescription,
        targetAudience,
        brandVoice,
        valuePropositions,
        industry,
        competitors,
        onboardingSourceUrl,
        siteName,
        favicon,
        suggestedDomain,
      } = req.body;

      // Build update data with business profile and mark as onboarded
      const updateData: Record<string, unknown> = {
        businessDescription: businessDescription || null,
        targetAudience: targetAudience || null,
        brandVoice: brandVoice || null,
        valuePropositions: valuePropositions || null,
        industry: industry || null,
        competitors: competitors || null,
        isOnboarded: true,
        onboardingSourceUrl: onboardingSourceUrl || null,
      };
      
      // Update site title if provided from onboarding
      if (siteName && siteName.trim()) {
        updateData.title = siteName.trim();
      }
      if (favicon && typeof favicon === "string" && favicon.trim()) {
        updateData.favicon = favicon.trim();
      }
      // Update domain if suggested from onboarding (only if current domain is temporary/auto-generated)
      if (suggestedDomain && typeof suggestedDomain === "string" && suggestedDomain.trim()) {
        const site = await storage.getSiteById(siteId);
        // Only update if current domain looks like an auto-generated one (contains - or is very short)
        if (site && site.domain && (site.domain.includes("-") || site.domain.length < 10)) {
          const cleanDomain = suggestedDomain.trim().toLowerCase();
          // Check if domain is already in use by another site
          const existingSite = await storage.getSiteByDomain(cleanDomain);
          if (existingSite && existingSite.id !== siteId) {
            console.log(`[Onboarding] Domain "${cleanDomain}" already in use by site ${existingSite.id}, skipping domain update`);
            // Don't fail - just skip the domain update
          } else {
            updateData.domain = cleanDomain;
          }
        }
      }

      const updatedSite = await storage.updateSite(siteId, updateData);

      if (!updatedSite) {
        return res.status(404).json({ error: "Site not found" });
      }

      console.log(`[Onboarding] Site ${siteId} onboarding completed`);
      
      // Trigger initial article generation in the background (don't wait)
      const { generateInitialArticlesForSite } = await import("./initial-article-generator");
      generateInitialArticlesForSite(siteId).then(result => {
        if (result.success) {
          console.log(`[Onboarding] Initial articles generated for site ${siteId}: ${result.articlesCreated} articles`);
        } else {
          console.error(`[Onboarding] Failed to generate initial articles for site ${siteId}:`, result.error);
        }
      }).catch(err => {
        console.error(`[Onboarding] Error in initial article generation for site ${siteId}:`, err);
      });
      
      res.json(updatedSite);
    } catch (error) {
      console.error("[Onboarding] Error completing onboarding:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });

  const httpServer = createServer(app);

  startAutomationSchedulers();

  return httpServer;
}
