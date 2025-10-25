import cron from "node-cron";
import Parser from "rss-parser";
import { storage } from "./storage";
import { generateAIPost, rewriteArticle } from "./openai";
import type { Site } from "@shared/schema";

const parser = new Parser();
const processedArticles = new Set<string>();

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function processAIAutomation() {
  console.log("[Automation] Running AI content generation...");
  
  const sites = await storage.getSites();
  
  for (const site of sites) {
    try {
      const aiConfig = await storage.getAiConfigBySiteId(site.id);
      
      if (!aiConfig || !aiConfig.enabled || aiConfig.keywords.length === 0) {
        continue;
      }

      const keyword = aiConfig.keywords[aiConfig.lastKeywordIndex % aiConfig.keywords.length];
      const nextKeywordIndex = (aiConfig.lastKeywordIndex + 1) % aiConfig.keywords.length;

      console.log(`[AI] Generating post for ${site.domain} with keyword: ${keyword}`);
      
      const { title, content, tags } = await generateAIPost(aiConfig.masterPrompt, keyword);
      const slug = createSlug(title);

      await storage.createPost({
        siteId: site.id,
        title,
        content,
        slug,
        tags,
        source: "ai",
      });

      await storage.createOrUpdateAiConfig({
        ...aiConfig,
        lastKeywordIndex: nextKeywordIndex,
      });

      console.log(`[AI] Created post "${title}" for ${site.domain}`);
    } catch (error) {
      console.error(`[AI] Error processing site ${site.domain}:`, error);
    }
  }
}

export async function processRSSAutomation() {
  console.log("[Automation] Running RSS feed processing...");
  
  const sites = await storage.getSites();
  
  for (const site of sites) {
    try {
      const rssConfig = await storage.getRssConfigBySiteId(site.id);
      
      if (!rssConfig || !rssConfig.enabled || rssConfig.feedUrls.length === 0) {
        continue;
      }

      for (const feedUrl of rssConfig.feedUrls) {
        try {
          console.log(`[RSS] Fetching feed: ${feedUrl} for ${site.domain}`);
          const feed = await parser.parseURL(feedUrl);
          const items = feed.items.slice(0, rssConfig.articlesToFetch);

          for (const item of items) {
            const articleId = `${site.id}-${item.link || item.guid}`;
            
            if (processedArticles.has(articleId)) {
              continue;
            }

            const originalTitle = item.title || "Untitled";
            const originalContent = item.contentSnippet || item.content || "";

            console.log(`[RSS] Rewriting article: ${originalTitle}`);
            const { title, content, tags } = await rewriteArticle(originalContent, originalTitle);
            const slug = createSlug(title);

            await storage.createPost({
              siteId: site.id,
              title,
              content,
              slug,
              tags,
              source: "rss",
            });

            processedArticles.add(articleId);
            console.log(`[RSS] Created post "${title}" for ${site.domain}`);
          }
        } catch (error) {
          console.error(`[RSS] Error processing feed ${feedUrl}:`, error);
        }
      }
    } catch (error) {
      console.error(`[RSS] Error processing site ${site.domain}:`, error);
    }
  }
}

export function startAutomationSchedulers() {
  // AI Content Generation - runs multiple times per day based on site configs
  cron.schedule("0 */8 * * *", processAIAutomation);
  
  // RSS Feed Processing - runs every 6 hours
  cron.schedule("0 */6 * * *", processRSSAutomation);

  console.log("[Automation] Schedulers started");
}
