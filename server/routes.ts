import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { pool } from "./db";
import { insertSiteSchema, insertPostSchema, insertUserSchema, insertPillarSchema, type User } from "@shared/schema";
import { startAutomationSchedulers } from "./automation";
import { generateSitemap, invalidateSitemapCache, getSitemapStats } from "./sitemap";
import { normalizeBasePath } from "./utils";
import { rewriteHtmlForBasePath } from "./html-rewriter";

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

const ADMIN_DOMAIN = process.env.ADMIN_DOMAIN || "localhost";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

interface DomainRequest extends Request {
  siteId?: string;
  siteBasePath?: string;
  siteHostname?: string;  // The hostname used to find this site (could be alias or primary)
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

  // Domain detection middleware
  app.use(async (req: DomainRequest, res: Response, next: NextFunction) => {
    // Log ALL headers for debugging proxy issues
    if (req.path === "/" || req.path === "/api/domain-check") {
      console.log(`[ALL HEADERS] path=${req.path}`, JSON.stringify(req.headers, null, 2));
    }
    
    // Check multiple headers that proxies might use
    // X-BV-Visitor-Host is our custom header that won't be stripped by intermediary infrastructure (Google/Replit)
    const xBvVisitorHost = req.headers["x-bv-visitor-host"];
    const xForwardedHost = req.headers["x-forwarded-host"];
    const xOriginalHost = req.headers["x-original-host"];
    const xRealHost = req.headers["x-real-host"];
    const hostHeader = req.headers["host"];
    
    // Try multiple sources for the original hostname
    // Priority: X-BV-Visitor-Host (custom, survives intermediaries) > X-Forwarded-Host > X-Original-Host > X-Real-Host > req.hostname
    const hostname = 
      (typeof xBvVisitorHost === "string" ? xBvVisitorHost.split(",")[0].trim().split(":")[0] : null) ||
      (typeof xForwardedHost === "string" ? xForwardedHost.split(",")[0].trim().split(":")[0] : null) ||
      (typeof xOriginalHost === "string" ? xOriginalHost.split(":")[0] : null) ||
      (typeof xRealHost === "string" ? xRealHost.split(":")[0] : null) ||
      req.hostname;
    
    // Debug logging for domain routing issues - show all relevant headers
    console.log(`[Domain Routing] Final hostname=${hostname}, Host=${hostHeader}, X-BV-Visitor-Host=${xBvVisitorHost}, X-Forwarded-Host=${xForwardedHost}, req.hostname=${req.hostname}, path=${req.path}`);
    
    const isExplicitAdminDomain = hostname === ADMIN_DOMAIN;
    const isReplitDefaultHost = hostname.includes("replit.dev") || hostname.includes("replit.app") || hostname === "blogvirality.brandvirality.com";
    
    if (isExplicitAdminDomain) {
      req.siteId = undefined;
      req.siteBasePath = "";
      return next();
    }

    const site = await storage.getSiteByDomain(hostname);
    if (site) {
      console.log(`[Domain Routing] Found site: ${site.domain}, id=${site.id}, via hostname=${hostname}`);
      req.siteId = site.id;
      req.siteBasePath = normalizeBasePath(site.basePath);
      req.siteHostname = hostname;  // Save the hostname used to find this site
      return next();
    }

    if (isReplitDefaultHost) {
      req.siteId = undefined;
      req.siteBasePath = "";
    } else {
      // Log when domain is not found for debugging
      console.log(`[Domain Routing] Site not found for hostname: ${hostname}`);
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

  // === AUTH ROUTES ===

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      if (user.status !== "active") {
        return res.status(401).json({ success: false, message: "Account is not active" });
      }

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "Session error" });
        }
        
        req.session.userId = user.id;
        req.session.userRole = user.role;
        
        // Explicitly save the session before responding
        req.session.save((saveErr) => {
          if (saveErr) {
            return res.status(500).json({ error: "Failed to save session" });
          }
          
          res.json({ 
            success: true,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
            }
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
      const posts = await storage.getPostsBySiteId(req.params.id);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/editor/sites/:id/posts", requireAuth, requireSiteAccess("id", "posts_only"), async (req: Request, res: Response) => {
    try {
      const postData = insertPostSchema.parse({
        ...req.body,
        siteId: req.params.id,
      });
      const post = await storage.createPost(postData);
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // CSV Import for posts
  app.post("/api/editor/sites/:id/posts/import-csv", requireAuth, requireSiteAccess("id", "posts_only"), async (req: Request, res: Response) => {
    try {
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
          
          // Create the post
          await storage.createPost({
            siteId,
            title,
            slug,
            content: description,
            tags,
            source: "csv-import",
            ...(imageUrl && { imageUrl }),
          });
          
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
      
      const updated = await storage.updatePost(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update post" });
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

  // === SITES CRUD ===

  app.get("/api/sites", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      let sites;
      if (req.user?.role === "admin") {
        sites = await storage.getSites();
      } else {
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
      const siteData = insertSiteSchema.parse(req.body);
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
      const site = await storage.updateSite(req.params.id, req.body);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      res.json(site);
    } catch (error) {
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
      const { keywords, masterPrompt, targetLanguage } = req.body;
      
      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({ error: "Keywords array is required" });
      }

      // Filter out empty keywords
      const validKeywords = keywords.map((k: string) => k.trim()).filter((k: string) => k.length > 0);
      
      if (validKeywords.length === 0) {
        return res.status(400).json({ error: "At least one valid keyword is required" });
      }

      // Create the batch
      const batch = await storage.createKeywordBatch({
        siteId: req.params.id,
        totalKeywords: validKeywords.length,
        masterPrompt: masterPrompt || null,
        targetLanguage: targetLanguage || "en",
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
        const hasAccess = await storage.canUserAccessSite(req.user!.id, postData.siteId);
        if (!hasAccess) {
          return res.status(403).json({ error: "You don't have access to this site" });
        }
      }
      
      const post = await storage.createPost(postData);
      res.json(post);
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

  app.get("/api/public/sites/:id/posts", async (req: Request, res: Response) => {
    try {
      // Use method with authors to include author names in public posts
      const posts = await storage.getPostsBySiteIdWithAuthors(req.params.id);
      res.json(posts);
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
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  app.get("/api/public/sites/:id/posts-by-tag/:tag", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPostsByTag(req.params.id, decodeURIComponent(req.params.tag));
      res.json(posts);
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
      res.json(posts);
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
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch related posts" });
    }
  });

  // Robots.txt Route
  // Dynamically generates robots.txt per site with sitemap reference
  app.get("/robots.txt", async (req: DomainRequest, res: Response) => {
    try {
      let site = null;
      let robotsHostname = req.siteHostname || req.hostname;
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
      console.log(`[Sitemap] Request: siteId=${req.siteId}, siteHostname=${req.siteHostname}, siteBasePath=${req.siteBasePath}, req.hostname=${req.hostname}`);
      
      let site = null;
      let sitemapHostname = req.siteHostname || req.hostname;
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

  const httpServer = createServer(app);

  startAutomationSchedulers();

  return httpServer;
}
