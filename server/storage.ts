// Referenced from javascript_database blueprint
import {
  sites,
  posts,
  aiAutomationConfigs,
  rssAutomationConfigs,
  users,
  userSites,
  type Site,
  type Post,
  type AiAutomationConfig,
  type RssAutomationConfig,
  type User,
  type UserSite,
  type InsertSite,
  type InsertPost,
  type InsertAiAutomationConfig,
  type InsertRssAutomationConfig,
  type InsertUser,
  type InsertUserSite,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  // User-Site permissions
  getUserSites(userId: string): Promise<UserSite[]>;
  getSiteUsers(siteId: string): Promise<UserSite[]>;
  addUserToSite(userSite: InsertUserSite): Promise<UserSite>;
  removeUserFromSite(userId: string, siteId: string): Promise<void>;
  updateUserSitePermission(userId: string, siteId: string, permission: string): Promise<UserSite | undefined>;

  // Sites (with user permission filtering)
  getSites(): Promise<Site[]>;
  getSitesForUser(userId: string): Promise<Site[]>;
  getSiteById(id: string): Promise<Site | undefined>;
  getSiteByDomain(domain: string): Promise<Site | undefined>;
  canUserAccessSite(userId: string, siteId: string): Promise<boolean>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(id: string, site: Partial<InsertSite>): Promise<Site | undefined>;
  deleteSite(id: string): Promise<void>;

  // Posts
  getPostsBySiteId(siteId: string): Promise<Post[]>;
  getPostById(id: string): Promise<Post | undefined>;
  getPostBySlug(siteId: string, slug: string): Promise<Post | undefined>;
  getPostsByTag(siteId: string, tag: string): Promise<Post[]>;
  getRelatedPosts(postId: string, siteId: string): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, post: Partial<InsertPost>): Promise<Post | undefined>;
  deletePost(id: string): Promise<void>;
  getTopTags(siteId: string, limit: number): Promise<string[]>;

  // AI Automation Config
  getAiConfigBySiteId(siteId: string): Promise<AiAutomationConfig | undefined>;
  createOrUpdateAiConfig(config: InsertAiAutomationConfig): Promise<AiAutomationConfig>;

  // RSS Automation Config
  getRssConfigBySiteId(siteId: string): Promise<RssAutomationConfig | undefined>;
  createOrUpdateRssConfig(config: InsertRssAutomationConfig): Promise<RssAutomationConfig>;
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

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
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

  async getSiteById(id: string): Promise<Site | undefined> {
    const [site] = await db.select().from(sites).where(eq(sites.id, id));
    return site || undefined;
  }

  async getSiteByDomain(domain: string): Promise<Site | undefined> {
    const [site] = await db.select().from(sites).where(eq(sites.domain, domain));
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

  async getPostsByTag(siteId: string, tag: string): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(and(eq(posts.siteId, siteId), sql`${tag} = ANY(${posts.tags})`))
      .orderBy(desc(posts.createdAt));
  }

  async getRelatedPosts(postId: string, siteId: string): Promise<Post[]> {
    const currentPost = await this.getPostById(postId);
    if (!currentPost) return [];

    const relatedPosts = await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.siteId, siteId),
          sql`${posts.id} != ${postId}`,
          sql`${posts.tags} && ${currentPost.tags}`
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(6);

    return relatedPosts;
  }

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
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
      .where(eq(posts.siteId, siteId))
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
}

export const storage = new DatabaseStorage();
