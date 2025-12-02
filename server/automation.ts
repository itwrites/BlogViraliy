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
      
      const { title, content, tags, imageUrl, metaTitle, metaDescription } = await generateAIPost(aiConfig.masterPrompt, keyword);
      const slug = createSlug(title);

      await storage.createPost({
        siteId: site.id,
        title,
        content,
        slug,
        tags,
        imageUrl,
        metaTitle,
        metaDescription,
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
            const { title, content, tags, imageUrl, metaTitle, metaDescription } = await rewriteArticle(originalContent, originalTitle);
            const slug = createSlug(title);

            await storage.createPost({
              siteId: site.id,
              title,
              content,
              slug,
              tags,
              imageUrl,
              metaTitle,
              metaDescription,
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

// Process keyword batches (bulk AI post generation)
export async function processKeywordBatches() {
  const pendingBatches = await storage.getPendingBatches();
  
  if (pendingBatches.length === 0) {
    return;
  }

  console.log(`[Bulk] Processing ${pendingBatches.length} pending batch(es)...`);

  for (const batch of pendingBatches) {
    try {
      // Mark batch as processing if it's pending
      if (batch.status === "pending") {
        await storage.updateKeywordBatch(batch.id, { status: "processing" });
      }

      // Get site for this batch
      const site = await storage.getSiteById(batch.siteId);
      if (!site) {
        console.error(`[Bulk] Site not found for batch ${batch.id}`);
        await storage.updateKeywordBatch(batch.id, { status: "failed" });
        continue;
      }

      // Get the AI config for master prompt fallback
      const aiConfig = await storage.getAiConfigBySiteId(site.id);
      const masterPrompt = batch.masterPrompt || aiConfig?.masterPrompt || "";

      // Process one job at a time to avoid rate limiting
      const nextJob = await storage.getNextPendingJob(batch.id);
      
      if (!nextJob) {
        // All jobs processed, mark batch as completed
        const jobs = await storage.getKeywordJobsByBatchId(batch.id);
        const successCount = jobs.filter(j => j.status === "completed").length;
        const failedCount = jobs.filter(j => j.status === "failed").length;
        
        await storage.updateKeywordBatch(batch.id, {
          status: "completed",
          processedCount: successCount + failedCount,
          successCount,
          failedCount,
        });
        
        console.log(`[Bulk] Batch ${batch.id} completed: ${successCount} success, ${failedCount} failed`);
        continue;
      }

      // Process the job
      try {
        console.log(`[Bulk] Generating post for keyword: "${nextJob.keyword}" (site: ${site.domain})`);
        
        // Mark job as processing
        await storage.updateKeywordJob(nextJob.id, { status: "processing" });

        // Generate AI post
        const { title, content, tags, imageUrl, metaTitle, metaDescription } = await generateAIPost(
          masterPrompt,
          nextJob.keyword
        );
        const slug = createSlug(title);

        // Create the post
        const post = await storage.createPost({
          siteId: site.id,
          title,
          content,
          slug,
          tags,
          imageUrl,
          metaTitle,
          metaDescription,
          source: "ai-bulk",
        });

        // Mark job as completed
        await storage.updateKeywordJob(nextJob.id, {
          status: "completed",
          postId: post.id,
        });

        // Update batch progress
        const currentBatch = await storage.getKeywordBatchById(batch.id);
        if (currentBatch) {
          await storage.updateKeywordBatch(batch.id, {
            processedCount: currentBatch.processedCount + 1,
            successCount: currentBatch.successCount + 1,
          });
        }

        console.log(`[Bulk] Created post "${title}" for keyword "${nextJob.keyword}"`);
      } catch (jobError) {
        console.error(`[Bulk] Error processing keyword "${nextJob.keyword}":`, jobError);
        
        // Mark job as failed
        await storage.updateKeywordJob(nextJob.id, {
          status: "failed",
          error: jobError instanceof Error ? jobError.message : "Unknown error",
        });

        // Update batch progress
        const currentBatch = await storage.getKeywordBatchById(batch.id);
        if (currentBatch) {
          await storage.updateKeywordBatch(batch.id, {
            processedCount: currentBatch.processedCount + 1,
            failedCount: currentBatch.failedCount + 1,
          });
        }
      }
    } catch (batchError) {
      console.error(`[Bulk] Error processing batch ${batch.id}:`, batchError);
    }
  }
}

export function startAutomationSchedulers() {
  // AI Content Generation - runs multiple times per day based on site configs
  cron.schedule("0 */8 * * *", processAIAutomation);
  
  // RSS Feed Processing - runs every 6 hours
  cron.schedule("0 */6 * * *", processRSSAutomation);

  // Keyword Batch Processing - runs every minute to process queued jobs
  cron.schedule("* * * * *", processKeywordBatches);

  console.log("[Automation] Schedulers started");
}
