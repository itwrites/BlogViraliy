import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { pool } from "./db";
import { insertSiteSchema, insertPostSchema, insertUserSchema, type User } from "@shared/schema";
import { startAutomationSchedulers } from "./automation";
import { generateSitemap, invalidateSitemapCache, getSitemapStats } from "./sitemap";

const ADMIN_DOMAIN = process.env.ADMIN_DOMAIN || "localhost";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    userRole?: string;
  }
}

interface DomainRequest extends Request {
  siteId?: string;
}

interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const isProduction = process.env.NODE_ENV === "production";
  
  app.set("trust proxy", 1);
  
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

  // Domain detection middleware
  app.use(async (req: DomainRequest, res: Response, next: NextFunction) => {
    const hostname = req.hostname;
    
    const isExplicitAdminDomain = hostname === ADMIN_DOMAIN;
    const isReplitDefaultHost = hostname.includes("replit.dev") || hostname.includes("replit.app");
    
    if (isExplicitAdminDomain) {
      req.siteId = undefined;
      return next();
    }

    const site = await storage.getSiteByDomain(hostname);
    if (site) {
      req.siteId = site.id;
      return next();
    }

    if (isReplitDefaultHost) {
      req.siteId = undefined;
    }
    
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
      const { keywords, masterPrompt } = req.body;
      
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
    const hostname = req.hostname;
    
    const site = await storage.getSiteByDomain(hostname);
    if (site) {
      return res.json({ isAdmin: false, site });
    }

    const isExplicitAdminDomain = hostname === ADMIN_DOMAIN;
    const isReplitDefaultHost = hostname.includes("replit.dev") || hostname.includes("replit.app");
    
    if (isExplicitAdminDomain || isReplitDefaultHost) {
      return res.json({ isAdmin: true });
    }

    res.json({ isAdmin: false, site: null });
  });

  app.get("/api/public/sites/:id/posts", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPostsBySiteId(req.params.id);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

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

  app.get("/api/public/sites/:id/posts-by-tag/:tag", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getPostsByTag(req.params.id, decodeURIComponent(req.params.tag));
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

  app.get("/api/public/sites/:id/related-posts/:postId", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getRelatedPosts(req.params.postId, req.params.id);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch related posts" });
    }
  });

  // Sitemap Routes
  // Public sitemap.xml - served based on domain
  app.get("/sitemap.xml", async (req: DomainRequest, res: Response) => {
    try {
      // Get site from domain
      const hostname = req.hostname;
      let site = null;
      
      // If siteId is already set by middleware, use that
      if (req.siteId) {
        site = await storage.getSiteById(req.siteId);
      } else {
        // Try to get site by domain
        site = await storage.getSiteByDomain(hostname);
      }
      
      if (!site) {
        return res.status(404).send("Site not found");
      }

      // Construct base URL
      const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const baseUrl = `${protocol}://${hostname}`;
      
      const xml = await generateSitemap(site, baseUrl);
      
      res.set("Content-Type", "application/xml");
      res.set("Cache-Control", "public, max-age=900"); // 15 minutes
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
      
      // Generate with a placeholder base URL (actual URL comes from request)
      const baseUrl = `https://${site.domain}`;
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
      
      const baseUrl = `https://${site.domain}`;
      const xml = await generateSitemap(site, baseUrl);
      
      res.set("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate sitemap preview" });
    }
  });

  const httpServer = createServer(app);

  startAutomationSchedulers();

  return httpServer;
}
