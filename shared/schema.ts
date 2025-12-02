import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles
export const userRoleEnum = z.enum(["admin", "editor"]);
export type UserRole = z.infer<typeof userRoleEnum>;

// User status
export const userStatusEnum = z.enum(["active", "inactive", "pending"]);
export type UserStatus = z.infer<typeof userStatusEnum>;

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
  permission: text("permission").notNull().default("edit"), // 'view', 'edit', 'manage'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Template Settings Type
export const templateSettingsSchema = z.object({
  logoSize: z.enum(["small", "medium", "large"]).default("medium"),
  hideLogoText: z.boolean().default(false),
  primaryColor: z.string().default("#3b82f6"),
  secondaryColor: z.string().default("#8b5cf6"),
  backgroundColor: z.string().default("#ffffff"),
  textColor: z.string().default("#1f2937"),
  headingFont: z.enum(["modern", "classic", "editorial", "tech", "elegant"]).default("modern"),
  bodyFont: z.enum(["modern", "classic", "editorial", "tech", "elegant"]).default("modern"),
  fontScale: z.enum(["compact", "normal", "spacious"]).default("normal"),
  headerStyle: z.enum(["minimal", "standard", "full"]).default("standard"),
  cardStyle: z.enum(["rounded", "sharp", "borderless"]).default("rounded"),
  contentWidth: z.enum(["narrow", "medium", "wide"]).default("medium"),
  showFeaturedHero: z.boolean().default(true),
  showSearch: z.boolean().default(true),
  maxNavItems: z.number().min(3).max(10).default(7),
  footerText: z.string().default(""),
  socialTwitter: z.string().default(""),
  socialFacebook: z.string().default(""),
  socialInstagram: z.string().default(""),
  socialLinkedin: z.string().default(""),
});

export type TemplateSettings = z.infer<typeof templateSettingsSchema>;

export const defaultTemplateSettings: TemplateSettings = {
  logoSize: "medium",
  hideLogoText: false,
  primaryColor: "#3b82f6",
  secondaryColor: "#8b5cf6",
  backgroundColor: "#ffffff",
  textColor: "#1f2937",
  headingFont: "modern",
  bodyFont: "modern",
  fontScale: "normal",
  headerStyle: "standard",
  cardStyle: "rounded",
  contentWidth: "medium",
  showFeaturedHero: true,
  showSearch: true,
  maxNavItems: 7,
  footerText: "",
  socialTwitter: "",
  socialFacebook: "",
  socialInstagram: "",
  socialLinkedin: "",
};

// Sites (multi-tenant websites)
export const sites = pgTable("sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  domain: text("domain").notNull().unique(),
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
  permission: z.enum(["view", "edit", "manage"]).optional().default("edit"),
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
