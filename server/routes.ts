import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { insertSiteSchema, insertPostSchema } from "@shared/schema";
import { startAutomationSchedulers } from "./automation";

const ADMIN_DOMAIN = process.env.ADMIN_DOMAIN || "localhost";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

interface DomainRequest extends Request {
  siteId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  const isProduction = process.env.NODE_ENV === "production";
  
  app.set("trust proxy", 1); // Trust first proxy for secure cookies behind reverse proxy
  
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "chameleonweb-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction, // Use secure cookies in production (HTTPS)
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: isProduction ? "none" : "lax", // Required for cross-site cookies in production
      },
    })
  );

  // Domain detection middleware
  app.use(async (req: DomainRequest, res: Response, next: NextFunction) => {
    const hostname = req.hostname;
    
    // Check if hostname matches explicit admin domain
    const isExplicitAdminDomain = hostname === ADMIN_DOMAIN;
    
    // For production/testing: allow admin access on default replit domains unless a site is registered
    const isReplitDefaultHost = hostname.includes("replit.dev") || hostname.includes("replit.app");
    
    if (isExplicitAdminDomain) {
      req.siteId = undefined;
      return next();
    }

    // Check if site exists for this domain
    const site = await storage.getSiteByDomain(hostname);
    if (site) {
      req.siteId = site.id;
      return next();
    }

    // If on default host and no site registered, allow admin access
    if (isReplitDefaultHost) {
      req.siteId = undefined;
    }
    
    next();
  });

  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

  // === ADMIN ROUTES ===

  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // Sites CRUD
  app.get("/api/sites", requireAuth, async (req: Request, res: Response) => {
    try {
      const sites = await storage.getSites();
      res.json(sites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sites" });
    }
  });

  app.get("/api/sites/:id", requireAuth, async (req: Request, res: Response) => {
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

  app.post("/api/sites", requireAuth, async (req: Request, res: Response) => {
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

      res.json(site);
    } catch (error) {
      res.status(500).json({ error: "Failed to create site" });
    }
  });

  app.put("/api/sites/:id", requireAuth, async (req: Request, res: Response) => {
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

  app.delete("/api/sites/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deleteSite(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete site" });
    }
  });

  // AI Automation Config
  app.get("/api/sites/:id/ai-config", requireAuth, async (req: Request, res: Response) => {
    try {
      const config = await storage.getAiConfigBySiteId(req.params.id);
      res.json(config || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AI config" });
    }
  });

  app.put("/api/sites/:id/ai-config", requireAuth, async (req: Request, res: Response) => {
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
  app.get("/api/sites/:id/rss-config", requireAuth, async (req: Request, res: Response) => {
    try {
      const config = await storage.getRssConfigBySiteId(req.params.id);
      res.json(config || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RSS config" });
    }
  });

  app.put("/api/sites/:id/rss-config", requireAuth, async (req: Request, res: Response) => {
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

  // Posts CRUD
  app.get("/api/sites/:id/posts", requireAuth, async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPostsBySiteId(req.params.id);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/posts", requireAuth, async (req: Request, res: Response) => {
    try {
      const postData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(postData);
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.put("/api/posts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const post = await storage.updatePost(req.params.id, req.body);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  app.delete("/api/posts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.deletePost(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // === PUBLIC ROUTES ===

  // Domain check - determines if request is admin or public site
  app.get("/api/domain-check", async (req: DomainRequest, res: Response) => {
    const hostname = req.hostname;
    
    // Check for registered site first
    const site = await storage.getSiteByDomain(hostname);
    if (site) {
      return res.json({ isAdmin: false, site });
    }

    // If no site registered, check if this is admin domain or default host
    const isExplicitAdminDomain = hostname === ADMIN_DOMAIN;
    const isReplitDefaultHost = hostname.includes("replit.dev") || hostname.includes("replit.app");
    
    if (isExplicitAdminDomain || isReplitDefaultHost) {
      return res.json({ isAdmin: true });
    }

    // Unregistered non-admin domain
    res.json({ isAdmin: false, site: null });
  });

  // Public posts for a site
  app.get("/api/public/sites/:id/posts", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPostsBySiteId(req.params.id);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Get single post by slug
  app.get("/api/public/sites/:id/posts/:slug", async (req: Request, res: Response) => {
    try {
      const post = await storage.getPostBySlug(req.params.id, req.params.slug);
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch post" });
    }
  });

  // Get posts by tag
  app.get("/api/public/sites/:id/posts-by-tag/:tag", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPostsByTag(req.params.id, decodeURIComponent(req.params.tag));
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // Get top tags for navigation
  app.get("/api/public/sites/:id/top-tags", async (req: Request, res: Response) => {
    try {
      const tags = await storage.getTopTags(req.params.id, 10);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  // Get related posts
  app.get("/api/public/sites/:id/related-posts/:postId", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getRelatedPosts(req.params.postId, req.params.id);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch related posts" });
    }
  });

  const httpServer = createServer(app);

  // Start automation schedulers
  startAutomationSchedulers();

  return httpServer;
}
