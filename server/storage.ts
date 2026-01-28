// Referenced from javascript_database blueprint
import {
  sites,
  posts,
  aiAutomationConfigs,
  rssAutomationConfigs,
  users,
  userSites,
  keywordBatches,
  keywordJobs,
  pillars,
  clusters,
  pillarArticles,
  siteMenuItems,
  siteAuthors,
  siteDailyStats,
  apiKeys,
  topicSuggestions,
  type Site,
  type Post,
  type AiAutomationConfig,
  type RssAutomationConfig,
  type User,
  type UserSite,
  type KeywordBatch,
  type KeywordJob,
  type Pillar,
  type Cluster,
  type PillarArticle,
  type SiteMenuItem,
  type SiteAuthor,
  type SiteDailyStats,
  type ApiKey,
  type TopicSuggestion,
  type InsertSite,
  type InsertPost,
  type InsertAiAutomationConfig,
  type InsertRssAutomationConfig,
  type InsertUser,
  type InsertUserSite,
  type InsertKeywordBatch,
  type InsertKeywordJob,
  type InsertPillar,
  type InsertCluster,
  type InsertPillarArticle,
  type InsertSiteMenuItem,
  type InsertSiteAuthor,
  type InsertSiteDailyStats,
  type InsertApiKey,
  type InsertTopicSuggestion,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray, asc, or, isNull, lt } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  
  // Site ownership
  getSitesByOwnerId(ownerId: string): Promise<Site[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  claimFirstPaymentGeneration(userId: string): Promise<{ claimed: boolean; reason?: string }>;
  completeFirstPaymentGeneration(userId: string): Promise<void>;
  clearFirstPaymentGenerationStarted(userId: string): Promise<void>;
  deleteUser(id: string): Promise<void>;

  // User-Site permissions
  getUserSites(userId: string): Promise<UserSite[]>;
  getSiteUsers(siteId: string): Promise<UserSite[]>;
  getUserSitePermission(userId: string, siteId: string): Promise<string | undefined>;
  addUserToSite(userSite: InsertUserSite): Promise<UserSite>;
  removeUserFromSite(userId: string, siteId: string): Promise<void>;
  updateUserSitePermission(userId: string, siteId: string, permission: string): Promise<UserSite | undefined>;

  // Sites (with user permission filtering)
  getSites(): Promise<Site[]>;
  getSitesForUser(userId: string): Promise<Site[]>;
  getSitesForUserWithPermission(userId: string): Promise<Array<Site & { permission: string }>>;
  getSiteById(id: string): Promise<Site | undefined>;
  getSiteByDomain(domain: string): Promise<Site | undefined>;
  getSiteByVisitorHostname(visitorHostname: string): Promise<Site | undefined>;
  canUserAccessSite(userId: string, siteId: string): Promise<boolean>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(id: string, site: Partial<InsertSite>): Promise<Site | undefined>;
  deleteSite(id: string): Promise<void>;

  // Posts
  getPostsBySiteId(siteId: string): Promise<Post[]>;
  getPostById(id: string): Promise<Post | undefined>;
  getPostBySlug(siteId: string, slug: string): Promise<Post | undefined>;
  getPostBySourceUrl(siteId: string, sourceUrl: string): Promise<Post | undefined>;
  getPostsByTag(siteId: string, tag: string): Promise<Post[]>;
  getPostsByTags(siteId: string, tags: string[]): Promise<Post[]>;
  getRelatedPosts(postId: string, siteId: string): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  createPostWithLimitCheck(post: InsertPost): Promise<{ post?: Post; error?: string; code?: string }>;
  updatePost(id: string, post: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: string): Promise<void>;
  getTopTags(siteId: string, limit: number): Promise<string[]>;

  // AI Automation Config
  getAiConfigBySiteId(siteId: string): Promise<AiAutomationConfig | undefined>;
  createOrUpdateAiConfig(config: InsertAiAutomationConfig): Promise<AiAutomationConfig>;

  // RSS Automation Config
  getRssConfigBySiteId(siteId: string): Promise<RssAutomationConfig | undefined>;
  createOrUpdateRssConfig(config: InsertRssAutomationConfig): Promise<RssAutomationConfig>;

  // Keyword Batches
  getKeywordBatchesBySiteId(siteId: string): Promise<KeywordBatch[]>;
  getKeywordBatchById(id: string): Promise<KeywordBatch | undefined>;
  createKeywordBatch(batch: InsertKeywordBatch): Promise<KeywordBatch>;
  updateKeywordBatch(id: string, batch: Partial<InsertKeywordBatch>): Promise<KeywordBatch | undefined>;
  deleteKeywordBatch(id: string): Promise<void>;
  getPendingBatches(): Promise<KeywordBatch[]>;

  // Keyword Jobs
  getKeywordJobsByBatchId(batchId: string): Promise<KeywordJob[]>;
  getKeywordJobById(id: string): Promise<KeywordJob | undefined>;
  createKeywordJob(job: InsertKeywordJob): Promise<KeywordJob>;
  updateKeywordJob(id: string, job: Partial<InsertKeywordJob>): Promise<KeywordJob | undefined>;
  getNextPendingJob(batchId: string): Promise<KeywordJob | undefined>;
  cancelPendingJobsByBatchId(batchId: string): Promise<void>;

  // Sitemap helpers
  getPublishedPostsBySiteId(siteId: string): Promise<Post[]>;

  // Pillars (Topical Authority)
  getPillarsBySiteId(siteId: string): Promise<Pillar[]>;
  getPillarById(id: string): Promise<Pillar | undefined>;
  createPillar(pillar: InsertPillar): Promise<Pillar>;
  updatePillar(id: string, pillar: Partial<InsertPillar> & { completedAt?: Date }): Promise<Pillar | undefined>;
  deletePillar(id: string): Promise<void>;
  getActivePillars(): Promise<Pillar[]>;

  // Clusters
  getClustersByPillarId(pillarId: string): Promise<Cluster[]>;
  getClusterById(id: string): Promise<Cluster | undefined>;
  createCluster(cluster: InsertCluster): Promise<Cluster>;
  updateCluster(id: string, cluster: Partial<InsertCluster>): Promise<Cluster | undefined>;
  deleteClustersByPillarId(pillarId: string): Promise<void>;

  // Pillar Articles
  getPillarArticlesByPillarId(pillarId: string): Promise<PillarArticle[]>;
  getPillarArticlesByClusterId(clusterId: string): Promise<PillarArticle[]>;
  getPillarArticleById(id: string): Promise<PillarArticle | undefined>;
  createPillarArticle(article: InsertPillarArticle): Promise<PillarArticle>;
  createPillarArticles(articles: InsertPillarArticle[]): Promise<PillarArticle[]>;
  updatePillarArticle(id: string, article: Partial<InsertPillarArticle> & { generatedAt?: Date; publishedAt?: Date }): Promise<PillarArticle | undefined>;
  deletePillarArticlesByPillarId(pillarId: string): Promise<void>;
  getNextPendingPillarArticle(pillarId: string): Promise<PillarArticle | undefined>;
  getPillarArticleStats(pillarId: string): Promise<{ total: number; pending: number; completed: number; failed: number }>;

  // Site Menu Items
  getMenuItemsBySiteId(siteId: string): Promise<SiteMenuItem[]>;
  getMenuItemById(id: string): Promise<SiteMenuItem | undefined>;
  createMenuItem(item: InsertSiteMenuItem): Promise<SiteMenuItem>;
  updateMenuItem(id: string, item: Partial<InsertSiteMenuItem>): Promise<SiteMenuItem | undefined>;
  deleteMenuItem(id: string): Promise<void>;
  deleteMenuItemsBySiteId(siteId: string): Promise<void>;
  reorderMenuItems(siteId: string, itemIds: string[]): Promise<void>;

  // Site Authors
  getAuthorsBySiteId(siteId: string): Promise<SiteAuthor[]>;
  getAuthorById(id: string): Promise<SiteAuthor | undefined>;
  getDefaultAuthor(siteId: string): Promise<SiteAuthor | undefined>;
  createAuthor(author: InsertSiteAuthor): Promise<SiteAuthor>;
  updateAuthor(id: string, author: Partial<InsertSiteAuthor>): Promise<SiteAuthor | undefined>;
  deleteAuthor(id: string): Promise<void>;
  setDefaultAuthor(siteId: string, authorId: string): Promise<void>;

  // Analytics
  incrementPostViewCount(postId: string): Promise<void>;
  getPopularPosts(siteId: string, limit: number): Promise<Post[]>;
  getTotalSiteViews(siteId: string): Promise<number>;
  
  // Daily Analytics Stats
  getDailyStats(siteId: string, date: string): Promise<SiteDailyStats | undefined>;
  getDailyStatsRange(siteId: string, startDate: string, endDate: string): Promise<SiteDailyStats[]>;
  upsertDailyStats(siteId: string, date: string, updates: Partial<InsertSiteDailyStats>): Promise<SiteDailyStats>;
  recordPageView(siteId: string, postSlug: string, deviceType: string, browserName: string, country: string, isNewUniqueVisitor?: boolean): Promise<void>;

  // API Keys
  getApiKeysBySiteId(siteId: string): Promise<ApiKey[]>;
  getApiKeyById(id: string): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: string, apiKey: Partial<InsertApiKey>): Promise<ApiKey | undefined>;
  deleteApiKey(id: string): Promise<void>;

  // Topic Suggestions
  getTopicSuggestions(siteId: string): Promise<TopicSuggestion[]>;
  getTopicSuggestionById(id: string): Promise<TopicSuggestion | undefined>;
  createTopicSuggestions(suggestions: InsertTopicSuggestion[]): Promise<TopicSuggestion[]>;
  markSuggestionUsed(id: string): Promise<void>;
  deleteTopicSuggestions(siteId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }
  
  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }
  
  async getSitesByOwnerId(ownerId: string): Promise<Site[]> {
    return await db.select().from(sites).where(eq(sites.ownerId, ownerId)).orderBy(desc(sites.createdAt));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async claimFirstPaymentGeneration(userId: string): Promise<{ claimed: boolean; reason?: string }> {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    
    // Truly atomic claim with all conditions in the UPDATE WHERE clause
    // This prevents race conditions by only updating if:
    // 1. User exists
    // 2. Generation not already done
    // 3. Either never started OR started more than 10 minutes ago (stale lock)
    const [updated] = await db
      .update(users)
      .set({ firstPaymentGenerationStarted: now, updatedAt: now })
      .where(and(
        eq(users.id, userId), 
        eq(users.firstPaymentGenerationDone, false),
        or(
          isNull(users.firstPaymentGenerationStarted),
          lt(users.firstPaymentGenerationStarted, tenMinutesAgo)
        )
      ))
      .returning();
    
    if (updated) {
      return { claimed: true };
    }
    
    // If update failed, determine the reason
    const user = await this.getUser(userId);
    if (!user) {
      return { claimed: false, reason: "user_not_found" };
    }
    if (user.firstPaymentGenerationDone) {
      return { claimed: false, reason: "already_done" };
    }
    if (user.firstPaymentGenerationStarted) {
      return { claimed: false, reason: "in_progress" };
    }
    
    return { claimed: false, reason: "unknown" };
  }
  
  async completeFirstPaymentGeneration(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ firstPaymentGenerationDone: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
  
  async clearFirstPaymentGenerationStarted(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ firstPaymentGenerationStarted: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
  
  async setArticleAllocation(userId: string, allocation: Record<string, number>): Promise<void> {
    await db
      .update(users)
      .set({ articleAllocation: allocation, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
  
  async getArticleAllocation(userId: string): Promise<Record<string, number> | null> {
    const user = await this.getUser(userId);
    return (user?.articleAllocation as Record<string, number>) || null;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // User-Site permissions
  async getUserSites(userId: string): Promise<UserSite[]> {
    return await db.select().from(userSites).where(eq(userSites.userId, userId));
  }

  async getSiteUsers(siteId: string): Promise<UserSite[]> {
    return await db.select().from(userSites).where(eq(userSites.siteId, siteId));
  }

  async addUserToSite(userSite: InsertUserSite): Promise<UserSite> {
    const [created] = await db.insert(userSites).values(userSite).returning();
    return created;
  }

  async removeUserFromSite(userId: string, siteId: string): Promise<void> {
    await db.delete(userSites).where(
      and(eq(userSites.userId, userId), eq(userSites.siteId, siteId))
    );
  }

  async updateUserSitePermission(userId: string, siteId: string, permission: string): Promise<UserSite | undefined> {
    const [updated] = await db
      .update(userSites)
      .set({ permission })
      .where(and(eq(userSites.userId, userId), eq(userSites.siteId, siteId)))
      .returning();
    return updated || undefined;
  }

  async getUserSitePermission(userId: string, siteId: string): Promise<string | undefined> {
    const [record] = await db
      .select()
      .from(userSites)
      .where(and(eq(userSites.userId, userId), eq(userSites.siteId, siteId)));
    return record?.permission;
  }

  // Sites
  async getSites(): Promise<Site[]> {
    return await db.select().from(sites).orderBy(desc(sites.createdAt));
  }

  async getSitesForUser(userId: string): Promise<Site[]> {
    // Get site IDs the user has access to
    const userSiteRecords = await db.select().from(userSites).where(eq(userSites.userId, userId));
    const siteIds = userSiteRecords.map(us => us.siteId);
    
    if (siteIds.length === 0) {
      return [];
    }
    
    return await db
      .select()
      .from(sites)
      .where(inArray(sites.id, siteIds))
      .orderBy(desc(sites.createdAt));
  }

  async getSitesForUserWithPermission(userId: string): Promise<Array<Site & { permission: string }>> {
    // Get user site records with permissions
    const userSiteRecords = await db.select().from(userSites).where(eq(userSites.userId, userId));
    
    if (userSiteRecords.length === 0) {
      return [];
    }
    
    const siteIds = userSiteRecords.map(us => us.siteId);
    const sitesList = await db
      .select()
      .from(sites)
      .where(inArray(sites.id, siteIds))
      .orderBy(desc(sites.createdAt));
    
    // Combine sites with their permissions
    return sitesList.map(site => {
      const userSite = userSiteRecords.find(us => us.siteId === site.id);
      return {
        ...site,
        permission: userSite?.permission || 'view',
      };
    });
  }

  async getSiteById(id: string): Promise<Site | undefined> {
    const [site] = await db.select().from(sites).where(eq(sites.id, id));
    return site || undefined;
  }

  async getSiteByDomain(domain: string): Promise<Site | undefined> {
    console.log(`[getSiteByDomain] Looking up domain: "${domain}"`);
    
    // First check primary domain
    const [site] = await db.select().from(sites).where(eq(sites.domain, domain));
    if (site) {
      console.log(`[getSiteByDomain] Found by primary domain: ${site.domain}`);
      return site;
    }
    
    // Then check domain aliases using array contains
    console.log(`[getSiteByDomain] Not found by primary, checking aliases...`);
    const [aliasMatch] = await db.select().from(sites).where(
      sql`${domain} = ANY(${sites.domainAliases})`
    );
    
    if (aliasMatch) {
      console.log(`[getSiteByDomain] Found by alias! Site: ${aliasMatch.domain}, aliases: ${JSON.stringify(aliasMatch.domainAliases)}`);
    } else {
      console.log(`[getSiteByDomain] No site found for domain "${domain}"`);
    }
    
    return aliasMatch || undefined;
  }

  async getSiteByVisitorHostname(visitorHostname: string): Promise<Site | undefined> {
    console.log(`[getSiteByVisitorHostname] Looking up visitor hostname: "${visitorHostname}"`);
    
    // Look up sites in reverse_proxy mode that match this visitor hostname
    const [site] = await db.select().from(sites).where(
      and(
        eq(sites.deploymentMode, "reverse_proxy"),
        eq(sites.proxyVisitorHostname, visitorHostname)
      )
    );
    
    if (site) {
      console.log(`[getSiteByVisitorHostname] Found site: ${site.domain} for visitor hostname: ${visitorHostname}`);
    } else {
      console.log(`[getSiteByVisitorHostname] No site found for visitor hostname: "${visitorHostname}"`);
    }
    
    return site || undefined;
  }

  async canUserAccessSite(userId: string, siteId: string): Promise<boolean> {
    const [record] = await db
      .select()
      .from(userSites)
      .where(and(eq(userSites.userId, userId), eq(userSites.siteId, siteId)));
    return !!record;
  }

  async createSite(site: InsertSite): Promise<Site> {
    const [newSite] = await db.insert(sites).values(site).returning();
    return newSite;
  }

  async updateSite(id: string, site: Partial<InsertSite>): Promise<Site | undefined> {
    const [updated] = await db
      .update(sites)
      .set({ ...site, updatedAt: new Date() })
      .where(eq(sites.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteSite(id: string): Promise<void> {
    await db.delete(sites).where(eq(sites.id, id));
  }

  // Posts
  async getPostsBySiteId(siteId: string): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.siteId, siteId))
      .orderBy(desc(posts.createdAt));
  }

  async getPostsBySiteIdWithAuthors(siteId: string): Promise<(Post & { authorName?: string })[]> {
    const result = await db
      .select({
        post: posts,
        authorName: siteAuthors.name,
      })
      .from(posts)
      .leftJoin(siteAuthors, eq(posts.authorId, siteAuthors.id))
      .where(eq(posts.siteId, siteId))
      .orderBy(desc(posts.createdAt));
    
    return result.map(r => ({
      ...r.post,
      authorName: r.authorName ?? undefined,
    }));
  }

  // Get only published posts for public site display
  async getPublishedPostsBySiteIdWithAuthors(siteId: string): Promise<(Post & { authorName?: string })[]> {
    const result = await db
      .select({
        post: posts,
        authorName: siteAuthors.name,
      })
      .from(posts)
      .leftJoin(siteAuthors, eq(posts.authorId, siteAuthors.id))
      .where(and(
        eq(posts.siteId, siteId),
        sql`COALESCE(${posts.status}, 'published') = 'published'`
      ))
      .orderBy(desc(posts.createdAt));
    
    return result.map(r => ({
      ...r.post,
      authorName: r.authorName ?? undefined,
    }));
  }

  async getPostById(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post || undefined;
  }

  async getPostBySlug(siteId: string, slug: string): Promise<Post | undefined> {
    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.siteId, siteId), eq(posts.slug, slug)));
    return post || undefined;
  }

  async getPostBySlugWithAuthor(siteId: string, slug: string): Promise<(Post & { authorName?: string }) | undefined> {
    const [result] = await db
      .select({
        post: posts,
        authorName: siteAuthors.name,
      })
      .from(posts)
      .leftJoin(siteAuthors, eq(posts.authorId, siteAuthors.id))
      .where(and(eq(posts.siteId, siteId), eq(posts.slug, slug)));
    
    if (!result) return undefined;
    return {
      ...result.post,
      authorName: result.authorName ?? undefined,
    };
  }

  async getPostBySourceUrl(siteId: string, sourceUrl: string): Promise<Post | undefined> {
    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.siteId, siteId), eq(posts.sourceUrl, sourceUrl)));
    return post || undefined;
  }

  async getPostsByTag(siteId: string, tag: string): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(and(
        eq(posts.siteId, siteId), 
        sql`${tag} = ANY(${posts.tags})`,
        sql`COALESCE(${posts.status}, 'published') = 'published'`
      ))
      .orderBy(desc(posts.createdAt));
  }

  async getPostsByTags(siteId: string, tags: string[]): Promise<Post[]> {
    if (tags.length === 0) return [];
    const tagConditions = tags.map(tag => sql`${tag} = ANY(${posts.tags})`);
    const orCondition = sql`(${sql.join(tagConditions, sql` OR `)})`;
    return await db
      .select()
      .from(posts)
      .where(and(
        eq(posts.siteId, siteId), 
        orCondition,
        sql`COALESCE(${posts.status}, 'published') = 'published'`
      ))
      .orderBy(desc(posts.createdAt));
  }

  async getRelatedPosts(postId: string, siteId: string): Promise<Post[]> {
    try {
      const currentPost = await this.getPostById(postId);
      if (!currentPost) return [];
      
      // Guard against null/undefined/empty tags
      if (!currentPost.tags || !Array.isArray(currentPost.tags) || currentPost.tags.length === 0) {
        // Fall back to recent posts from same site (only published)
        const recentPosts = await db
          .select()
          .from(posts)
          .where(
            and(
              eq(posts.siteId, siteId),
              sql`${posts.id} != ${postId}`,
              sql`COALESCE(${posts.status}, 'published') = 'published'`
            )
          )
          .orderBy(desc(posts.createdAt))
          .limit(6);
        return recentPosts;
      }

      const relatedPosts = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.siteId, siteId),
            sql`${posts.id} != ${postId}`,
            sql`${posts.tags} && ${currentPost.tags}`,
            sql`COALESCE(${posts.status}, 'published') = 'published'`
          )
        )
        .orderBy(desc(posts.createdAt))
        .limit(6);

      return relatedPosts;
    } catch (error) {
      console.error(`[getRelatedPosts] Error for postId=${postId}, siteId=${siteId}:`, error);
      return []; // Return empty array instead of throwing
    }
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async createPostWithLimitCheck(post: InsertPost): Promise<{ post?: Post; error?: string; code?: string }> {
    // Get the site to check ownership
    const site = await this.getSiteById(post.siteId);
    if (!site) {
      return { error: "Site not found", code: "SITE_NOT_FOUND" };
    }
    
    // If site has an owner, enforce subscription limits
    if (site.ownerId) {
      const owner = await this.getUser(site.ownerId);
      if (!owner) {
        return { error: "Site owner not found", code: "OWNER_NOT_FOUND" };
      }
      
      // Check subscription status
      if (!owner.subscriptionPlan || owner.subscriptionStatus !== "active") {
        return { 
          error: "Active subscription required to create posts", 
          code: "SUBSCRIPTION_REQUIRED" 
        };
      }
      
      // Check post limits
      const { PLAN_LIMITS } = await import("@shared/schema");
      const planLimits = PLAN_LIMITS[owner.subscriptionPlan as keyof typeof PLAN_LIMITS];
      if (planLimits && owner.postsUsedThisMonth !== null && 
          owner.postsUsedThisMonth >= planLimits.postsPerMonth) {
        return { 
          error: `Monthly post limit of ${planLimits.postsPerMonth} reached. Please upgrade your plan.`,
          code: "POST_LIMIT_REACHED" 
        };
      }
      
      // Create the post
      const newPost = await this.createPost(post);
      
      // Increment the owner's post count
      await this.updateUser(owner.id, {
        postsUsedThisMonth: (owner.postsUsedThisMonth || 0) + 1,
      });
      
      return { post: newPost };
    }
    
    // For admin-created sites (no owner), just create the post
    const newPost = await this.createPost(post);
    return { post: newPost };
  }

  async updatePost(id: string, post: Partial<InsertPost>): Promise<Post | undefined> {
    const [updated] = await db
      .update(posts)
      .set({ ...post, updatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePost(id: string): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  async getTopTags(siteId: string, limit: number): Promise<string[]> {
    const result = await db
      .select({
        tag: sql<string>`unnest(${posts.tags})`,
        count: sql<number>`count(*)`,
      })
      .from(posts)
      .where(and(
        eq(posts.siteId, siteId),
        sql`COALESCE(${posts.status}, 'published') = 'published'`
      ))
      .groupBy(sql`unnest(${posts.tags})`)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    return result.map((r) => r.tag);
  }

  // AI Automation Config
  async getAiConfigBySiteId(siteId: string): Promise<AiAutomationConfig | undefined> {
    const [config] = await db
      .select()
      .from(aiAutomationConfigs)
      .where(eq(aiAutomationConfigs.siteId, siteId));
    return config || undefined;
  }

  async createOrUpdateAiConfig(config: InsertAiAutomationConfig): Promise<AiAutomationConfig> {
    const existing = await this.getAiConfigBySiteId(config.siteId);
    
    if (existing) {
      const [updated] = await db
        .update(aiAutomationConfigs)
        .set(config)
        .where(eq(aiAutomationConfigs.siteId, config.siteId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(aiAutomationConfigs)
        .values(config)
        .returning();
      return created;
    }
  }

  // RSS Automation Config
  async getRssConfigBySiteId(siteId: string): Promise<RssAutomationConfig | undefined> {
    const [config] = await db
      .select()
      .from(rssAutomationConfigs)
      .where(eq(rssAutomationConfigs.siteId, siteId));
    return config || undefined;
  }

  async createOrUpdateRssConfig(config: InsertRssAutomationConfig): Promise<RssAutomationConfig> {
    const existing = await this.getRssConfigBySiteId(config.siteId);
    
    if (existing) {
      const [updated] = await db
        .update(rssAutomationConfigs)
        .set(config)
        .where(eq(rssAutomationConfigs.siteId, config.siteId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(rssAutomationConfigs)
        .values(config)
        .returning();
      return created;
    }
  }

  // Keyword Batches
  async getKeywordBatchesBySiteId(siteId: string): Promise<KeywordBatch[]> {
    return await db
      .select()
      .from(keywordBatches)
      .where(eq(keywordBatches.siteId, siteId))
      .orderBy(desc(keywordBatches.createdAt));
  }

  async getKeywordBatchById(id: string): Promise<KeywordBatch | undefined> {
    const [batch] = await db
      .select()
      .from(keywordBatches)
      .where(eq(keywordBatches.id, id));
    return batch || undefined;
  }

  async createKeywordBatch(batch: InsertKeywordBatch): Promise<KeywordBatch> {
    const [created] = await db.insert(keywordBatches).values(batch).returning();
    return created;
  }

  async updateKeywordBatch(id: string, batch: Partial<InsertKeywordBatch>): Promise<KeywordBatch | undefined> {
    const [updated] = await db
      .update(keywordBatches)
      .set(batch)
      .where(eq(keywordBatches.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteKeywordBatch(id: string): Promise<void> {
    await db.delete(keywordBatches).where(eq(keywordBatches.id, id));
  }

  async getPendingBatches(): Promise<KeywordBatch[]> {
    return await db
      .select()
      .from(keywordBatches)
      .where(
        sql`${keywordBatches.status} IN ('pending', 'processing')`
      )
      .orderBy(asc(keywordBatches.createdAt));
  }

  // Keyword Jobs
  async getKeywordJobsByBatchId(batchId: string): Promise<KeywordJob[]> {
    return await db
      .select()
      .from(keywordJobs)
      .where(eq(keywordJobs.batchId, batchId))
      .orderBy(asc(keywordJobs.queuedAt));
  }

  async getKeywordJobById(id: string): Promise<KeywordJob | undefined> {
    const [job] = await db
      .select()
      .from(keywordJobs)
      .where(eq(keywordJobs.id, id));
    return job || undefined;
  }

  async createKeywordJob(job: InsertKeywordJob): Promise<KeywordJob> {
    const [created] = await db.insert(keywordJobs).values(job).returning();
    return created;
  }

  async updateKeywordJob(id: string, job: Partial<InsertKeywordJob>): Promise<KeywordJob | undefined> {
    const updateData: Record<string, unknown> = { ...job };
    if (job.status === "completed" || job.status === "failed") {
      updateData.processedAt = new Date();
    }
    const [updated] = await db
      .update(keywordJobs)
      .set(updateData)
      .where(eq(keywordJobs.id, id))
      .returning();
    return updated || undefined;
  }

  async getNextPendingJob(batchId: string): Promise<KeywordJob | undefined> {
    const [job] = await db
      .select()
      .from(keywordJobs)
      .where(
        and(
          eq(keywordJobs.batchId, batchId),
          eq(keywordJobs.status, "queued")
        )
      )
      .orderBy(asc(keywordJobs.queuedAt))
      .limit(1);
    return job || undefined;
  }

  async cancelPendingJobsByBatchId(batchId: string): Promise<void> {
    await db
      .update(keywordJobs)
      .set({ status: "cancelled", processedAt: new Date() })
      .where(
        and(
          eq(keywordJobs.batchId, batchId),
          sql`${keywordJobs.status} IN ('queued', 'processing')`
        )
      );
  }

  // Sitemap helpers
  async getPublishedPostsBySiteId(siteId: string): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.siteId, siteId),
          sql`COALESCE(${posts.noindex}, false) = false`,
          sql`COALESCE(${posts.status}, 'published') = 'published'`
        )
      )
      .orderBy(desc(posts.updatedAt));
  }

  // ========================================
  // PILLARS (Topical Authority)
  // ========================================

  async getPillarsBySiteId(siteId: string): Promise<Pillar[]> {
    return await db
      .select()
      .from(pillars)
      .where(eq(pillars.siteId, siteId))
      .orderBy(desc(pillars.createdAt));
  }

  async getPillarById(id: string): Promise<Pillar | undefined> {
    const [pillar] = await db.select().from(pillars).where(eq(pillars.id, id));
    return pillar || undefined;
  }

  async createPillar(insertPillar: InsertPillar): Promise<Pillar> {
    const [pillar] = await db.insert(pillars).values(insertPillar).returning();
    return pillar;
  }

  async updatePillar(id: string, pillar: Partial<InsertPillar> & { completedAt?: Date }): Promise<Pillar | undefined> {
    const [updated] = await db
      .update(pillars)
      .set({ ...pillar, updatedAt: new Date() })
      .where(eq(pillars.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePillar(id: string): Promise<void> {
    await db.delete(pillars).where(eq(pillars.id, id));
  }

  async getActivePillars(): Promise<Pillar[]> {
    return await db
      .select()
      .from(pillars)
      .where(sql`${pillars.status} IN ('generating', 'mapped')`)
      .orderBy(asc(pillars.nextPublishAt));
  }

  // ========================================
  // CLUSTERS
  // ========================================

  async getClustersByPillarId(pillarId: string): Promise<Cluster[]> {
    return await db
      .select()
      .from(clusters)
      .where(eq(clusters.pillarId, pillarId))
      .orderBy(asc(clusters.sortOrder));
  }

  async getClusterById(id: string): Promise<Cluster | undefined> {
    const [cluster] = await db.select().from(clusters).where(eq(clusters.id, id));
    return cluster || undefined;
  }

  async createCluster(insertCluster: InsertCluster): Promise<Cluster> {
    const [cluster] = await db.insert(clusters).values(insertCluster).returning();
    return cluster;
  }

  async updateCluster(id: string, cluster: Partial<InsertCluster>): Promise<Cluster | undefined> {
    const [updated] = await db
      .update(clusters)
      .set(cluster)
      .where(eq(clusters.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteClustersByPillarId(pillarId: string): Promise<void> {
    await db.delete(clusters).where(eq(clusters.pillarId, pillarId));
  }

  // ========================================
  // PILLAR ARTICLES
  // ========================================

  async getPillarArticlesByPillarId(pillarId: string): Promise<PillarArticle[]> {
    return await db
      .select()
      .from(pillarArticles)
      .where(eq(pillarArticles.pillarId, pillarId))
      .orderBy(asc(pillarArticles.sortOrder));
  }

  async getPillarArticlesByClusterId(clusterId: string): Promise<PillarArticle[]> {
    return await db
      .select()
      .from(pillarArticles)
      .where(eq(pillarArticles.clusterId, clusterId))
      .orderBy(asc(pillarArticles.sortOrder));
  }

  async getPillarArticleById(id: string): Promise<PillarArticle | undefined> {
    const [article] = await db.select().from(pillarArticles).where(eq(pillarArticles.id, id));
    return article || undefined;
  }

  async createPillarArticle(insertArticle: InsertPillarArticle): Promise<PillarArticle> {
    const [article] = await db.insert(pillarArticles).values(insertArticle).returning();
    return article;
  }

  async createPillarArticles(insertArticles: InsertPillarArticle[]): Promise<PillarArticle[]> {
    if (insertArticles.length === 0) return [];
    const articles = await db.insert(pillarArticles).values(insertArticles).returning();
    return articles;
  }

  async updatePillarArticle(id: string, article: Partial<InsertPillarArticle> & { generatedAt?: Date; publishedAt?: Date }): Promise<PillarArticle | undefined> {
    const [updated] = await db
      .update(pillarArticles)
      .set(article)
      .where(eq(pillarArticles.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePillarArticlesByPillarId(pillarId: string): Promise<void> {
    await db.delete(pillarArticles).where(eq(pillarArticles.pillarId, pillarId));
  }

  async getNextPendingPillarArticle(pillarId: string): Promise<PillarArticle | undefined> {
    const [article] = await db
      .select()
      .from(pillarArticles)
      .where(
        and(
          eq(pillarArticles.pillarId, pillarId),
          eq(pillarArticles.status, "pending")
        )
      )
      .orderBy(asc(pillarArticles.sortOrder))
      .limit(1);
    return article || undefined;
  }

  async getPillarArticleStats(pillarId: string): Promise<{ total: number; pending: number; completed: number; failed: number }> {
    const allArticles = await db
      .select()
      .from(pillarArticles)
      .where(eq(pillarArticles.pillarId, pillarId));
    
    return {
      total: allArticles.length,
      pending: allArticles.filter(a => a.status === "pending").length,
      completed: allArticles.filter(a => a.status === "completed").length,
      failed: allArticles.filter(a => a.status === "failed").length,
    };
  }

  // Site Menu Items
  async getMenuItemsBySiteId(siteId: string): Promise<SiteMenuItem[]> {
    return await db
      .select()
      .from(siteMenuItems)
      .where(eq(siteMenuItems.siteId, siteId))
      .orderBy(asc(siteMenuItems.sortOrder));
  }

  async getMenuItemById(id: string): Promise<SiteMenuItem | undefined> {
    const [item] = await db.select().from(siteMenuItems).where(eq(siteMenuItems.id, id));
    return item || undefined;
  }

  async createMenuItem(insertItem: InsertSiteMenuItem): Promise<SiteMenuItem> {
    const [item] = await db.insert(siteMenuItems).values(insertItem).returning();
    return item;
  }

  async updateMenuItem(id: string, item: Partial<InsertSiteMenuItem>): Promise<SiteMenuItem | undefined> {
    const [updated] = await db
      .update(siteMenuItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(siteMenuItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(siteMenuItems).where(eq(siteMenuItems.id, id));
  }

  async deleteMenuItemsBySiteId(siteId: string): Promise<void> {
    await db.delete(siteMenuItems).where(eq(siteMenuItems.siteId, siteId));
  }

  async reorderMenuItems(siteId: string, itemIds: string[]): Promise<void> {
    for (let i = 0; i < itemIds.length; i++) {
      await db
        .update(siteMenuItems)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(and(eq(siteMenuItems.id, itemIds[i]), eq(siteMenuItems.siteId, siteId)));
    }
  }

  // Site Authors
  async getAuthorsBySiteId(siteId: string): Promise<SiteAuthor[]> {
    return await db
      .select()
      .from(siteAuthors)
      .where(eq(siteAuthors.siteId, siteId))
      .orderBy(desc(siteAuthors.isDefault), asc(siteAuthors.name));
  }

  async getAuthorById(id: string): Promise<SiteAuthor | undefined> {
    const [author] = await db.select().from(siteAuthors).where(eq(siteAuthors.id, id));
    return author || undefined;
  }

  async getDefaultAuthor(siteId: string): Promise<SiteAuthor | undefined> {
    const [author] = await db
      .select()
      .from(siteAuthors)
      .where(and(eq(siteAuthors.siteId, siteId), eq(siteAuthors.isDefault, true)));
    return author || undefined;
  }

  async createAuthor(insertAuthor: InsertSiteAuthor): Promise<SiteAuthor> {
    const [author] = await db.insert(siteAuthors).values(insertAuthor).returning();
    return author;
  }

  async updateAuthor(id: string, author: Partial<InsertSiteAuthor>): Promise<SiteAuthor | undefined> {
    const [updated] = await db
      .update(siteAuthors)
      .set(author)
      .where(eq(siteAuthors.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAuthor(id: string): Promise<void> {
    await db.delete(siteAuthors).where(eq(siteAuthors.id, id));
  }

  async setDefaultAuthor(siteId: string, authorId: string): Promise<void> {
    // First, unset all authors as default for this site
    await db
      .update(siteAuthors)
      .set({ isDefault: false })
      .where(eq(siteAuthors.siteId, siteId));
    // Then set the specified author as default
    await db
      .update(siteAuthors)
      .set({ isDefault: true })
      .where(eq(siteAuthors.id, authorId));
  }

  // Analytics
  async incrementPostViewCount(postId: string): Promise<void> {
    await db
      .update(posts)
      .set({ viewCount: sql`${posts.viewCount} + 1` })
      .where(eq(posts.id, postId));
  }

  async getPopularPosts(siteId: string, limit: number): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.siteId, siteId))
      .orderBy(desc(posts.viewCount))
      .limit(limit);
  }

  async getTotalSiteViews(siteId: string): Promise<number> {
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${posts.viewCount}), 0)` })
      .from(posts)
      .where(eq(posts.siteId, siteId));
    return Number(result[0]?.total || 0);
  }

  // Daily Analytics Stats
  async getDailyStats(siteId: string, date: string): Promise<SiteDailyStats | undefined> {
    const [stats] = await db
      .select()
      .from(siteDailyStats)
      .where(and(eq(siteDailyStats.siteId, siteId), eq(siteDailyStats.date, date)));
    return stats || undefined;
  }

  async getDailyStatsRange(siteId: string, startDate: string, endDate: string): Promise<SiteDailyStats[]> {
    return await db
      .select()
      .from(siteDailyStats)
      .where(
        and(
          eq(siteDailyStats.siteId, siteId),
          sql`${siteDailyStats.date} >= ${startDate}`,
          sql`${siteDailyStats.date} <= ${endDate}`
        )
      )
      .orderBy(asc(siteDailyStats.date));
  }

  async upsertDailyStats(siteId: string, date: string, updates: Partial<InsertSiteDailyStats>): Promise<SiteDailyStats> {
    const existing = await this.getDailyStats(siteId, date);
    
    if (existing) {
      const [updated] = await db
        .update(siteDailyStats)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(siteDailyStats.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(siteDailyStats)
        .values({
          siteId,
          date,
          views: 0,
          uniqueVisitors: 0,
          deviceBreakdown: {},
          browserBreakdown: {},
          countryBreakdown: {},
          postViewBreakdown: {},
          ...updates,
        })
        .returning();
      return created;
    }
  }

  async recordPageView(siteId: string, postSlug: string, deviceType: string, browserName: string, country: string, isNewUniqueVisitor: boolean = false): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const existing = await this.getDailyStats(siteId, today);
    
    if (existing) {
      // Update existing stats with incremented values
      const newViews = existing.views + 1;
      const newUniqueVisitors = isNewUniqueVisitor ? existing.uniqueVisitors + 1 : existing.uniqueVisitors;
      const deviceBreakdown = existing.deviceBreakdown || {};
      const browserBreakdown = existing.browserBreakdown || {};
      const countryBreakdown = existing.countryBreakdown || {};
      const uniqueCountryBreakdown = existing.uniqueCountryBreakdown || {};
      const postViewBreakdown = existing.postViewBreakdown || {};
      
      deviceBreakdown[deviceType] = (deviceBreakdown[deviceType] || 0) + 1;
      browserBreakdown[browserName] = (browserBreakdown[browserName] || 0) + 1;
      countryBreakdown[country] = (countryBreakdown[country] || 0) + 1;
      postViewBreakdown[postSlug] = (postViewBreakdown[postSlug] || 0) + 1;
      
      // Only increment unique country breakdown for new unique visitors
      if (isNewUniqueVisitor) {
        uniqueCountryBreakdown[country] = (uniqueCountryBreakdown[country] || 0) + 1;
      }
      
      await db
        .update(siteDailyStats)
        .set({
          views: newViews,
          uniqueVisitors: newUniqueVisitors,
          deviceBreakdown,
          browserBreakdown,
          countryBreakdown,
          uniqueCountryBreakdown,
          postViewBreakdown,
          updatedAt: new Date(),
        })
        .where(eq(siteDailyStats.id, existing.id));
    } else {
      // Create new stats for today - first visitor is always unique
      await db.insert(siteDailyStats).values({
        siteId,
        date: today,
        views: 1,
        uniqueVisitors: 1,
        deviceBreakdown: { [deviceType]: 1 },
        browserBreakdown: { [browserName]: 1 },
        countryBreakdown: { [country]: 1 },
        uniqueCountryBreakdown: { [country]: 1 },
        postViewBreakdown: { [postSlug]: 1 },
      });
    }
  }

  // API Keys
  async getApiKeysBySiteId(siteId: string): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.siteId, siteId)).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKeyById(id: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return apiKey || undefined;
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const [apiKey] = await db.insert(apiKeys).values(insertApiKey).returning();
    return apiKey;
  }

  async updateApiKey(id: string, updates: Partial<InsertApiKey>): Promise<ApiKey | undefined> {
    const [apiKey] = await db.update(apiKeys).set(updates).where(eq(apiKeys.id, id)).returning();
    return apiKey || undefined;
  }

  async deleteApiKey(id: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  // Topic Suggestions
  async getTopicSuggestions(siteId: string): Promise<TopicSuggestion[]> {
    return db.select().from(topicSuggestions).where(eq(topicSuggestions.siteId, siteId)).orderBy(topicSuggestions.createdAt);
  }

  async getTopicSuggestionById(id: string): Promise<TopicSuggestion | undefined> {
    const [suggestion] = await db.select().from(topicSuggestions).where(eq(topicSuggestions.id, id));
    return suggestion;
  }

  async createTopicSuggestions(suggestions: InsertTopicSuggestion[]): Promise<TopicSuggestion[]> {
    if (suggestions.length === 0) return [];
    return db.insert(topicSuggestions).values(suggestions).returning();
  }

  async markSuggestionUsed(id: string): Promise<void> {
    await db.update(topicSuggestions).set({ used: true }).where(eq(topicSuggestions.id, id));
  }

  async deleteTopicSuggestions(siteId: string): Promise<void> {
    await db.delete(topicSuggestions).where(eq(topicSuggestions.siteId, siteId));
  }
}

export const storage = new DatabaseStorage();
