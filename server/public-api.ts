import { Router, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { apiKeys, apiKeyLogs, posts, pillars, clusters, pillarArticles, type ApiKeyPermissions } from "@shared/schema";
import { eq, and, desc, gte, lte, sql, count } from "drizzle-orm";
import crypto from "crypto";

declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        siteId: string;
        permissions: ApiKeyPermissions;
        name: string;
      };
    }
  }
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomBytes = crypto.randomBytes(32);
  const key = `bv_${randomBytes.toString("base64url")}`;
  const prefix = key.substring(0, 12);
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

async function logApiRequest(
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  responseTimeMs: number,
  req: Request,
  errorMessage?: string
) {
  try {
    await db.insert(apiKeyLogs).values({
      apiKeyId,
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
      errorMessage,
    });
  } catch (err) {
    console.error("[Public API] Failed to log request:", err);
  }
}

export function apiKeyAuth(requiredPermission?: keyof ApiKeyPermissions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing or invalid Authorization header. Use: Bearer <api_key>",
      });
    }

    const apiKeyValue = authHeader.substring(7);
    const keyHash = hashApiKey(apiKeyValue);

    try {
      const [apiKeyRecord] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.keyHash, keyHash))
        .limit(1);

      if (!apiKeyRecord) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid API key",
        });
      }

      if (!apiKeyRecord.isActive) {
        await logApiRequest(apiKeyRecord.id, req.path, req.method, 403, Date.now() - startTime, req, "API key is inactive");
        return res.status(403).json({
          error: "Forbidden",
          message: "API key is inactive",
        });
      }

      if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
        await logApiRequest(apiKeyRecord.id, req.path, req.method, 403, Date.now() - startTime, req, "API key has expired");
        return res.status(403).json({
          error: "Forbidden",
          message: "API key has expired",
        });
      }

      const now = new Date();
      const resetAt = apiKeyRecord.rateLimitResetAt ? new Date(apiKeyRecord.rateLimitResetAt) : null;
      
      let currentCount = apiKeyRecord.requestCount;
      if (!resetAt || now > resetAt) {
        currentCount = 0;
        await db
          .update(apiKeys)
          .set({
            requestCount: 1,
            rateLimitResetAt: new Date(now.getTime() + 60 * 60 * 1000),
            lastUsedAt: now,
          })
          .where(eq(apiKeys.id, apiKeyRecord.id));
      } else if (currentCount >= apiKeyRecord.rateLimit) {
        const retryAfter = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);
        await logApiRequest(apiKeyRecord.id, req.path, req.method, 429, Date.now() - startTime, req, "Rate limit exceeded");
        return res.status(429).json({
          error: "Too Many Requests",
          message: `Rate limit exceeded. Limit: ${apiKeyRecord.rateLimit} requests/hour`,
          retryAfter,
        });
      } else {
        await db
          .update(apiKeys)
          .set({
            requestCount: currentCount + 1,
            lastUsedAt: now,
          })
          .where(eq(apiKeys.id, apiKeyRecord.id));
      }

      const permissions = apiKeyRecord.permissions as ApiKeyPermissions;
      if (requiredPermission && !permissions[requiredPermission]) {
        await logApiRequest(apiKeyRecord.id, req.path, req.method, 403, Date.now() - startTime, req, `Missing permission: ${requiredPermission}`);
        return res.status(403).json({
          error: "Forbidden",
          message: `Missing required permission: ${requiredPermission}`,
        });
      }

      req.apiKey = {
        id: apiKeyRecord.id,
        siteId: apiKeyRecord.siteId,
        permissions,
        name: apiKeyRecord.name,
      };

      res.on("finish", () => {
        logApiRequest(apiKeyRecord.id, req.path, req.method, res.statusCode, Date.now() - startTime, req);
      });

      next();
    } catch (err) {
      console.error("[Public API] Auth error:", err);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to authenticate API key",
      });
    }
  };
}

export function createPublicApiRouter(): Router {
  const router = Router();

  // CORS middleware for public API - allows cross-origin requests
  router.use((req: Request, res: Response, next: NextFunction) => {
    // Allow requests from any origin
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.header("Access-Control-Max-Age", "86400"); // 24 hours preflight cache
    
    // Handle preflight OPTIONS requests
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    
    next();
  });

  router.get("/v1/posts", apiKeyAuth("posts_read"), async (req: Request, res: Response) => {
    try {
      const { page = "1", limit = "20", tag } = req.query;
      const siteId = req.apiKey!.siteId;

      const conditions = [eq(posts.siteId, siteId)];

      // Filter by tag using PostgreSQL array containment
      if (tag && typeof tag === "string") {
        conditions.push(sql`${posts.tags} @> ARRAY[${tag}]::text[]`);
      }

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const pageNum = Math.max(parseInt(page as string) || 1, 1);
      const offsetNum = (pageNum - 1) * limitNum;

      const results = await db
        .select({
          id: posts.id,
          title: posts.title,
          slug: posts.slug,
          description: posts.metaDescription,
          content: posts.content,
          tags: posts.tags,
          imageUrl: posts.imageUrl,
          publishedAt: posts.createdAt,
          createdAt: posts.createdAt,
        })
        .from(posts)
        .where(and(...conditions))
        .orderBy(desc(posts.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      const [countResult] = await db
        .select({ total: count() })
        .from(posts)
        .where(and(...conditions));

      const total = countResult.total;
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        posts: results,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      });
    } catch (err) {
      console.error("[Public API] GET /v1/posts error:", err);
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch posts" });
    }
  });

  router.get("/v1/posts/stats", apiKeyAuth("stats_read"), async (req: Request, res: Response) => {
    try {
      const { period = "30d" } = req.query;
      const siteId = req.apiKey!.siteId;

      let days = 30;
      if (period === "7d") days = 7;
      else if (period === "90d") days = 90;
      else if (period === "365d") days = 365;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const dailyStats = await db
        .select({
          date: sql<string>`DATE(${posts.createdAt})`,
          count: count(),
        })
        .from(posts)
        .where(
          and(
            eq(posts.siteId, siteId),
            gte(posts.createdAt, startDate)
          )
        )
        .groupBy(sql`DATE(${posts.createdAt})`)
        .orderBy(sql`DATE(${posts.createdAt})`);

      const [totalCount] = await db
        .select({ total: count() })
        .from(posts)
        .where(eq(posts.siteId, siteId));

      const [manualCount] = await db
        .select({ total: count() })
        .from(posts)
        .where(and(eq(posts.siteId, siteId), eq(posts.source, "manual")));

      const [aiCount] = await db
        .select({ total: count() })
        .from(posts)
        .where(and(eq(posts.siteId, siteId), eq(posts.source, "ai")));

      res.json({
        period,
        daily: dailyStats,
        totals: {
          all: totalCount.total,
          manual: manualCount.total,
          ai: aiCount.total,
        },
      });
    } catch (err) {
      console.error("[Public API] GET /v1/posts/stats error:", err);
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch stats" });
    }
  });

  router.get("/v1/posts/:slug", apiKeyAuth("posts_read"), async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const siteId = req.apiKey!.siteId;

      const [post] = await db
        .select()
        .from(posts)
        .where(and(eq(posts.siteId, siteId), eq(posts.slug, slug)))
        .limit(1);

      if (!post) {
        return res.status(404).json({ error: "Not Found", message: "Post not found" });
      }

      res.json({ data: post });
    } catch (err) {
      console.error("[Public API] GET /v1/posts/:slug error:", err);
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch post" });
    }
  });

  router.get("/v1/pillars", apiKeyAuth("pillars_read"), async (req: Request, res: Response) => {
    try {
      const { page = "1", limit = "20", status } = req.query;
      const siteId = req.apiKey!.siteId;

      const conditions = [eq(pillars.siteId, siteId)];

      if (status && typeof status === "string") {
        conditions.push(eq(pillars.status, status));
      }

      const limitNum = Math.min(parseInt(limit as string) || 20, 50);
      const pageNum = Math.max(parseInt(page as string) || 1, 1);
      const offsetNum = (pageNum - 1) * limitNum;

      const results = await db
        .select({
          id: pillars.id,
          name: pillars.name,
          description: pillars.description,
          status: pillars.status,
          targetArticleCount: pillars.targetArticleCount,
          packType: pillars.packType,
          createdAt: pillars.createdAt,
          updatedAt: pillars.updatedAt,
          completedAt: pillars.completedAt,
        })
        .from(pillars)
        .where(and(...conditions))
        .orderBy(desc(pillars.createdAt))
        .limit(limitNum)
        .offset(offsetNum);

      const pillarIds = results.map((p) => p.id);
      
      const progressData = pillarIds.length > 0
        ? await db
            .select({
              pillarId: pillarArticles.pillarId,
              total: count(),
              completed: sql<number>`COUNT(CASE WHEN ${pillarArticles.status} = 'completed' THEN 1 END)`,
              generating: sql<number>`COUNT(CASE WHEN ${pillarArticles.status} = 'generating' THEN 1 END)`,
              pending: sql<number>`COUNT(CASE WHEN ${pillarArticles.status} = 'pending' THEN 1 END)`,
            })
            .from(pillarArticles)
            .where(sql`${pillarArticles.pillarId} IN ${pillarIds}`)
            .groupBy(pillarArticles.pillarId)
        : [];

      const progressMap = new Map(progressData.map((p) => [p.pillarId, p]));

      const enrichedResults = results.map((pillar) => {
        const progress = progressMap.get(pillar.id);
        return {
          ...pillar,
          progress: progress
            ? {
                total: progress.total,
                completed: progress.completed,
                generating: progress.generating,
                pending: progress.pending,
                percentage: progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0,
              }
            : { total: 0, completed: 0, generating: 0, pending: 0, percentage: 0 },
        };
      });

      const [countResult] = await db
        .select({ total: count() })
        .from(pillars)
        .where(and(...conditions));

      const total = countResult.total;
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        pillars: enrichedResults,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      });
    } catch (err) {
      console.error("[Public API] GET /v1/pillars error:", err);
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch pillars" });
    }
  });

  router.get("/v1/pillars/:id", apiKeyAuth("pillars_read"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const siteId = req.apiKey!.siteId;

      const [pillar] = await db
        .select()
        .from(pillars)
        .where(and(eq(pillars.siteId, siteId), eq(pillars.id, id)))
        .limit(1);

      if (!pillar) {
        return res.status(404).json({ error: "Not Found", message: "Pillar not found" });
      }

      const pillarClusters = await db
        .select()
        .from(clusters)
        .where(eq(clusters.pillarId, id))
        .orderBy(clusters.sortOrder);

      const [progress] = await db
        .select({
          total: count(),
          completed: sql<number>`COUNT(CASE WHEN ${pillarArticles.status} = 'completed' THEN 1 END)`,
          generating: sql<number>`COUNT(CASE WHEN ${pillarArticles.status} = 'generating' THEN 1 END)`,
          pending: sql<number>`COUNT(CASE WHEN ${pillarArticles.status} = 'pending' THEN 1 END)`,
          failed: sql<number>`COUNT(CASE WHEN ${pillarArticles.status} = 'failed' THEN 1 END)`,
        })
        .from(pillarArticles)
        .where(eq(pillarArticles.pillarId, id));

      res.json({
        pillar: {
          ...pillar,
          clusters: pillarClusters,
          progress: {
            total: progress.total,
            completed: progress.completed,
            generating: progress.generating,
            pending: progress.pending,
            failed: progress.failed,
            percentage: progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0,
          },
        },
      });
    } catch (err) {
      console.error("[Public API] GET /v1/pillars/:id error:", err);
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch pillar" });
    }
  });

  router.get("/v1/pillars/:id/articles", apiKeyAuth("pillars_read"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { page = "1", limit = "20", status, cluster } = req.query;
      const siteId = req.apiKey!.siteId;

      const [pillar] = await db
        .select({ id: pillars.id })
        .from(pillars)
        .where(and(eq(pillars.siteId, siteId), eq(pillars.id, id)))
        .limit(1);

      if (!pillar) {
        return res.status(404).json({ error: "Not Found", message: "Pillar not found" });
      }

      const conditions = [eq(pillarArticles.pillarId, id)];

      if (status && typeof status === "string") {
        conditions.push(eq(pillarArticles.status, status));
      }

      if (cluster && typeof cluster === "string") {
        conditions.push(eq(pillarArticles.clusterId, cluster));
      }

      const limitNum = Math.min(parseInt(limit as string) || 20, 100);
      const pageNum = Math.max(parseInt(page as string) || 1, 1);
      const offsetNum = (pageNum - 1) * limitNum;

      const results = await db
        .select({
          id: pillarArticles.id,
          title: pillarArticles.title,
          slug: pillarArticles.slug,
          status: pillarArticles.status,
          articleType: pillarArticles.articleType,
          articleRole: pillarArticles.articleRole,
          clusterId: pillarArticles.clusterId,
          postId: pillarArticles.postId,
          createdAt: pillarArticles.createdAt,
          generatedAt: pillarArticles.generatedAt,
          publishedAt: pillarArticles.publishedAt,
        })
        .from(pillarArticles)
        .where(and(...conditions))
        .orderBy(pillarArticles.sortOrder)
        .limit(limitNum)
        .offset(offsetNum);

      const [countResult] = await db
        .select({ total: count() })
        .from(pillarArticles)
        .where(and(...conditions));

      const total = countResult.total;
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        articles: results,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      });
    } catch (err) {
      console.error("[Public API] GET /v1/pillars/:id/articles error:", err);
      res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch pillar articles" });
    }
  });

  return router;
}
