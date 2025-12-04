import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles
export const userRoleEnum = z.enum(["admin", "editor"]);
export type UserRole = z.infer<typeof userRoleEnum>;

// User status
export const userStatusEnum = z.enum(["active", "inactive", "pending"]);
export type UserStatus = z.infer<typeof userStatusEnum>;

// Site permission levels for editors
export const sitePermissionEnum = z.enum(["view", "posts_only", "edit", "manage"]);
export type SitePermission = z.infer<typeof sitePermissionEnum>;

// Admin Users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("editor"), // 'admin' or 'editor'
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'pending'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// User-Site permissions (which users can access which sites)
export const userSites = pgTable("user_sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  siteId: varchar("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  permission: text("permission").notNull().default("posts_only"), // 'view', 'posts_only', 'edit', 'manage'
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userSiteUnique: unique().on(table.userId, table.siteId),
}));

// Template Settings Type
export const templateSettingsSchema = z.object({
  logoSize: z.enum(["small", "medium", "large", "custom"]).default("medium"),
  logoSizeCustom: z.number().min(20).max(200).default(48),
  hideLogoText: z.boolean().default(false),
  primaryColor: z.string().default("#3b82f6"),
  secondaryColor: z.string().default("#8b5cf6"),
  backgroundColor: z.string().default("#ffffff"),
  textColor: z.string().default("#1f2937"),
  headerBackgroundColor: z.string().default("").optional(), // Empty = use card color, or custom hex
  headerTextColor: z.string().default("").optional(), // Empty = use foreground, or custom hex
  headingFont: z.enum(["modern", "classic", "editorial", "tech", "elegant"]).default("modern"),
  bodyFont: z.enum(["modern", "classic", "editorial", "tech", "elegant"]).default("modern"),
  fontScale: z.enum(["compact", "normal", "spacious"]).default("normal"),
  headerStyle: z.enum(["minimal", "standard", "full"]).default("standard"),
  cardStyle: z.enum(["rounded", "sharp", "borderless"]).default("rounded"),
  contentWidth: z.enum(["narrow", "medium", "wide"]).default("medium"),
  showFeaturedHero: z.boolean().default(true),
  showSearch: z.boolean().default(true),
  maxNavItems: z.number().min(3).max(10).default(7),
  menuActiveStyle: z.enum(["underline", "background", "pill", "bold"]).default("underline"),
  footerText: z.string().default(""),
  socialTwitter: z.string().default(""),
  socialFacebook: z.string().default(""),
  socialInstagram: z.string().default(""),
  socialLinkedin: z.string().default(""),
  // Top announcement banner
  topBannerEnabled: z.boolean().default(false),
  topBannerMessage: z.string().default(""),
  topBannerBackgroundColor: z.string().default("#3b82f6"),
  topBannerTextColor: z.string().default("#ffffff"),
  topBannerLink: z.string().default("").optional(),
  topBannerDismissible: z.boolean().default(true),
  // GDPR cookie consent banner
  gdprBannerEnabled: z.boolean().default(false),
  gdprBannerMessage: z.string().default("We use cookies to improve your experience and for analytics. By continuing to use this site, you consent to our use of cookies."),
  gdprBannerButtonText: z.string().default("Accept"),
  gdprBannerDeclineText: z.string().default("Decline"),
  gdprBannerBackgroundColor: z.string().default("#1f2937"),
  gdprBannerTextColor: z.string().default("#ffffff"),
  // Footer settings
  footerLayout: z.enum(["simple", "columns", "centered"]).default("columns"),
  footerBackgroundColor: z.string().default("#1f2937"),
  footerTextColor: z.string().default("#9ca3af"),
  footerLinkColor: z.string().default("#ffffff"),
  footerShowLogo: z.boolean().default(true),
  footerLogoUrl: z.string().default(""), // Custom logo URL for footer (empty = use site logo)
  footerLogoInvertColors: z.boolean().default(false), // Invert/flip logo colors for dark backgrounds
  footerAboutText: z.string().default(""),
  footerShowNavLinks: z.boolean().default(true),
  footerShowSocialIcons: z.boolean().default(true),
  footerShowPoweredBy: z.boolean().default(true), // Show "Powered by Blog Virality" text
  footerCopyrightText: z.string().default(""),
  // Additional social links for footer
  socialYoutube: z.string().default(""),
  socialTiktok: z.string().default(""),
  socialPinterest: z.string().default(""),
  socialGithub: z.string().default(""),
});

export type TemplateSettings = z.infer<typeof templateSettingsSchema>;

export const defaultTemplateSettings: TemplateSettings = {
  logoSize: "medium",
  logoSizeCustom: 48,
  hideLogoText: false,
  primaryColor: "#3b82f6",
  secondaryColor: "#8b5cf6",
  backgroundColor: "#ffffff",
  textColor: "#1f2937",
  headerBackgroundColor: "",
  headerTextColor: "",
  headingFont: "modern",
  bodyFont: "modern",
  fontScale: "normal",
  headerStyle: "standard",
  cardStyle: "rounded",
  contentWidth: "medium",
  showFeaturedHero: true,
  showSearch: true,
  maxNavItems: 7,
  menuActiveStyle: "underline",
  footerText: "",
  socialTwitter: "",
  socialFacebook: "",
  socialInstagram: "",
  socialLinkedin: "",
  // Top announcement banner
  topBannerEnabled: false,
  topBannerMessage: "",
  topBannerBackgroundColor: "#3b82f6",
  topBannerTextColor: "#ffffff",
  topBannerLink: "",
  topBannerDismissible: true,
  // GDPR cookie consent banner
  gdprBannerEnabled: false,
  gdprBannerMessage: "We use cookies to improve your experience and for analytics. By continuing to use this site, you consent to our use of cookies.",
  gdprBannerButtonText: "Accept",
  gdprBannerDeclineText: "Decline",
  gdprBannerBackgroundColor: "#1f2937",
  gdprBannerTextColor: "#ffffff",
  // Footer settings
  footerLayout: "columns",
  footerBackgroundColor: "#1f2937",
  footerTextColor: "#9ca3af",
  footerLinkColor: "#ffffff",
  footerShowLogo: true,
  footerLogoUrl: "",
  footerLogoInvertColors: false,
  footerAboutText: "",
  footerShowNavLinks: true,
  footerShowSocialIcons: true,
  footerShowPoweredBy: true,
  footerCopyrightText: "",
  // Additional social links
  socialYoutube: "",
  socialTiktok: "",
  socialPinterest: "",
  socialGithub: "",
};

// Sites (multi-tenant websites)
export const sites = pgTable("sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domain: text("domain").notNull().unique(),
  domainAliases: text("domain_aliases").array().notNull().default(sql`ARRAY[]::text[]`), // Additional domains that point to this site
  title: text("title").notNull(),
  logoUrl: text("logo_url"),
  siteType: text("site_type").notNull().default("blog"),
  // Template customization settings
  templateSettings: jsonb("template_settings").$type<TemplateSettings>().default(defaultTemplateSettings),
  // SEO settings
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),
  favicon: text("favicon"),
  analyticsId: text("analytics_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AI Automation Configuration
export const aiAutomationConfigs = pgTable("ai_automation_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  schedule: text("schedule").notNull().default("1_per_day"),
  masterPrompt: text("master_prompt").notNull().default(""),
  keywords: text("keywords").array().notNull().default(sql`ARRAY[]::text[]`),
  lastKeywordIndex: integer("last_keyword_index").notNull().default(0),
});

// RSS Automation Configuration
export const rssAutomationConfigs = pgTable("rss_automation_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  schedule: text("schedule").notNull().default("every_6_hours"),
  feedUrls: text("feed_urls").array().notNull().default(sql`ARRAY[]::text[]`),
  articlesToFetch: integer("articles_to_fetch").notNull().default(3),
});

// Posts
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  source: text("source").notNull().default("manual"),
  sourceUrl: text("source_url"), // Original article URL for RSS posts (used for duplicate detection)
  // SEO settings for individual posts
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  ogImage: text("og_image"),
  canonicalUrl: text("canonical_url"),
  noindex: boolean("noindex").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Sessions table for connect-pg-simple
export const sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

// Keyword batch status enum
export const batchStatusEnum = z.enum(["pending", "processing", "completed", "cancelled", "failed"]);
export type BatchStatus = z.infer<typeof batchStatusEnum>;

// Job status enum
export const jobStatusEnum = z.enum(["queued", "processing", "completed", "failed", "cancelled"]);
export type JobStatus = z.infer<typeof jobStatusEnum>;

// Keyword Batches (for bulk AI post generation)
export const keywordBatches = pgTable("keyword_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending, processing, completed, cancelled, failed
  totalKeywords: integer("total_keywords").notNull().default(0),
  processedCount: integer("processed_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  masterPrompt: text("master_prompt"), // Optional override for this batch
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Keyword Jobs (individual keywords within a batch)
export const keywordJobs = pgTable("keyword_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").notNull().references(() => keywordBatches.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  status: text("status").notNull().default("queued"), // queued, processing, completed, failed, cancelled
  postId: varchar("post_id").references(() => posts.id, { onDelete: "set null" }),
  error: text("error"),
  queuedAt: timestamp("queued_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

// ========================================
// TOPICAL AUTHORITY SYSTEM
// ========================================

// Pillar status enum
export const pillarStatusEnum = z.enum(["draft", "mapping", "mapped", "generating", "completed", "paused", "failed"]);
export type PillarStatus = z.infer<typeof pillarStatusEnum>;

// Article generation status enum
export const articleStatusEnum = z.enum(["pending", "generating", "completed", "failed", "skipped"]);
export type ArticleStatus = z.infer<typeof articleStatusEnum>;

// Pillars (main topics for topical authority)
export const pillars = pgTable("pillars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Hospitality", "Real Estate"
  description: text("description"), // Optional description of the pillar topic
  status: text("status").notNull().default("draft"), // draft, mapping, mapped, generating, completed, paused, failed
  masterPrompt: text("master_prompt"), // Custom AI prompt for this pillar's content
  targetArticleCount: integer("target_article_count").notNull().default(50), // Target number of articles (50-200)
  generatedCount: integer("generated_count").notNull().default(0), // Articles successfully generated
  failedCount: integer("failed_count").notNull().default(0), // Articles that failed generation
  publishSchedule: text("publish_schedule").default("1_per_day"), // Publishing frequency
  nextPublishAt: timestamp("next_publish_at"), // Next scheduled publish time
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Clusters (categories under pillars, e.g., "Hotel Marketing", "Restaurant Operations")
export const clusters = pgTable("clusters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pillarId: varchar("pillar_id").notNull().references(() => pillars.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Hotel SEO", "Guest Experience"
  description: text("description"), // Brief description of this cluster
  sortOrder: integer("sort_order").notNull().default(0), // Order within the pillar
  articleCount: integer("article_count").notNull().default(0), // Number of articles in this cluster
  generatedCount: integer("generated_count").notNull().default(0), // Articles successfully generated
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Pillar Articles (articles in the topical authority hierarchy)
export const pillarArticles = pgTable("pillar_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pillarId: varchar("pillar_id").notNull().references(() => pillars.id, { onDelete: "cascade" }),
  clusterId: varchar("cluster_id").references(() => clusters.id, { onDelete: "cascade" }), // null for pillar article itself
  title: text("title").notNull(), // Article title / long-tail keyword
  slug: text("slug").notNull(), // URL slug
  keywords: text("keywords").array().notNull().default(sql`ARRAY[]::text[]`), // Target keywords
  articleType: text("article_type").notNull().default("subtopic"), // "pillar", "category", "subtopic"
  status: text("status").notNull().default("pending"), // pending, generating, completed, failed, skipped
  sortOrder: integer("sort_order").notNull().default(0), // Order within cluster
  postId: varchar("post_id").references(() => posts.id, { onDelete: "set null" }), // Link to generated post
  internalLinks: text("internal_links").array().default(sql`ARRAY[]::text[]`), // IDs of articles to link to
  error: text("error"), // Error message if generation failed
  retryCount: integer("retry_count").notNull().default(0), // Number of generation retry attempts
  generatedAt: timestamp("generated_at"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userSites: many(userSites),
}));

export const userSitesRelations = relations(userSites, ({ one }) => ({
  user: one(users, {
    fields: [userSites.userId],
    references: [users.id],
  }),
  site: one(sites, {
    fields: [userSites.siteId],
    references: [sites.id],
  }),
}));

export const sitesRelations = relations(sites, ({ many, one }) => ({
  posts: many(posts),
  aiAutomationConfig: one(aiAutomationConfigs),
  rssAutomationConfig: one(rssAutomationConfigs),
  userSites: many(userSites),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  site: one(sites, {
    fields: [posts.siteId],
    references: [sites.id],
  }),
}));

export const aiAutomationConfigsRelations = relations(aiAutomationConfigs, ({ one }) => ({
  site: one(sites, {
    fields: [aiAutomationConfigs.siteId],
    references: [sites.id],
  }),
}));

export const rssAutomationConfigsRelations = relations(rssAutomationConfigs, ({ one }) => ({
  site: one(sites, {
    fields: [rssAutomationConfigs.siteId],
    references: [sites.id],
  }),
}));

export const keywordBatchesRelations = relations(keywordBatches, ({ one, many }) => ({
  site: one(sites, {
    fields: [keywordBatches.siteId],
    references: [sites.id],
  }),
  jobs: many(keywordJobs),
}));

export const keywordJobsRelations = relations(keywordJobs, ({ one }) => ({
  batch: one(keywordBatches, {
    fields: [keywordJobs.batchId],
    references: [keywordBatches.id],
  }),
  post: one(posts, {
    fields: [keywordJobs.postId],
    references: [posts.id],
  }),
}));

// Pillar Relations
export const pillarsRelations = relations(pillars, ({ one, many }) => ({
  site: one(sites, {
    fields: [pillars.siteId],
    references: [sites.id],
  }),
  clusters: many(clusters),
  articles: many(pillarArticles),
}));

export const clustersRelations = relations(clusters, ({ one, many }) => ({
  pillar: one(pillars, {
    fields: [clusters.pillarId],
    references: [pillars.id],
  }),
  articles: many(pillarArticles),
}));

export const pillarArticlesRelations = relations(pillarArticles, ({ one }) => ({
  pillar: one(pillars, {
    fields: [pillarArticles.pillarId],
    references: [pillars.id],
  }),
  cluster: one(clusters, {
    fields: [pillarArticles.clusterId],
    references: [clusters.id],
  }),
  post: one(posts, {
    fields: [pillarArticles.postId],
    references: [posts.id],
  }),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  role: userRoleEnum.optional().default("editor"),
  status: userStatusEnum.optional().default("active"),
});

export const insertUserSiteSchema = createInsertSchema(userSites).omit({
  id: true,
  createdAt: true,
}).extend({
  permission: sitePermissionEnum.optional().default("posts_only"),
});

export const insertSiteSchema = createInsertSchema(sites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  siteType: z.enum(["blog", "news", "magazine", "portfolio", "restaurant", "crypto"]),
  templateSettings: templateSettingsSchema.optional(),
});

export const insertAiAutomationConfigSchema = createInsertSchema(aiAutomationConfigs).omit({
  id: true,
});

export const insertRssAutomationConfigSchema = createInsertSchema(rssAutomationConfigs).omit({
  id: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKeywordBatchSchema = createInsertSchema(keywordBatches).omit({
  id: true,
  createdAt: true,
  completedAt: true,
}).extend({
  status: batchStatusEnum.optional().default("pending"),
});

export const insertKeywordJobSchema = createInsertSchema(keywordJobs).omit({
  id: true,
  queuedAt: true,
  processedAt: true,
}).extend({
  status: jobStatusEnum.optional().default("queued"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertUserSite = z.infer<typeof insertUserSiteSchema>;
export type UserSite = typeof userSites.$inferSelect;

export type InsertSite = z.infer<typeof insertSiteSchema>;
export type Site = typeof sites.$inferSelect;

export type InsertAiAutomationConfig = z.infer<typeof insertAiAutomationConfigSchema>;
export type AiAutomationConfig = typeof aiAutomationConfigs.$inferSelect;

export type InsertRssAutomationConfig = z.infer<typeof insertRssAutomationConfigSchema>;
export type RssAutomationConfig = typeof rssAutomationConfigs.$inferSelect;

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export type InsertKeywordBatch = z.infer<typeof insertKeywordBatchSchema>;
export type KeywordBatch = typeof keywordBatches.$inferSelect;

export type InsertKeywordJob = z.infer<typeof insertKeywordJobSchema>;
export type KeywordJob = typeof keywordJobs.$inferSelect;

// Topical Authority Insert Schemas
export const insertPillarSchema = createInsertSchema(pillars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
}).extend({
  status: pillarStatusEnum.optional().default("draft"),
  targetArticleCount: z.number().min(10).max(500).optional().default(50),
});

export const insertClusterSchema = createInsertSchema(clusters).omit({
  id: true,
  createdAt: true,
});

export const insertPillarArticleSchema = createInsertSchema(pillarArticles).omit({
  id: true,
  createdAt: true,
  generatedAt: true,
  publishedAt: true,
}).extend({
  status: articleStatusEnum.optional().default("pending"),
  articleType: z.enum(["pillar", "category", "subtopic"]).optional().default("subtopic"),
});

// Topical Authority Types
export type InsertPillar = z.infer<typeof insertPillarSchema>;
export type Pillar = typeof pillars.$inferSelect;

export type InsertCluster = z.infer<typeof insertClusterSchema>;
export type Cluster = typeof clusters.$inferSelect;

export type InsertPillarArticle = z.infer<typeof insertPillarArticleSchema>;
export type PillarArticle = typeof pillarArticles.$inferSelect;
