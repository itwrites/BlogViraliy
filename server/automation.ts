import cron from "node-cron";
import Parser from "rss-parser";
import { storage } from "./storage";
import { generateAIPost, rewriteArticle, generateFromPrompt, type BusinessContext } from "./openai";
import { processNextPillarArticle } from "./topical-authority";
import { buildRoleSpecificPrompt, detectRoleFromKeyword } from "./role-prompts";
import type { Site, ArticleRole } from "@shared/schema";

const parser = new Parser();

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
      const targetLanguage = aiConfig.targetLanguage || "en";

      const businessContext: BusinessContext = {
        businessDescription: site.businessDescription,
        targetAudience: site.targetAudience,
        brandVoice: site.brandVoice,
        valuePropositions: site.valuePropositions,
        industry: site.industry,
        competitors: site.competitors,
      };

      console.log(`[AI] Generating post for ${site.domain} with keyword: ${keyword} (language: ${targetLanguage})`);
      
      const { title, content, tags, imageUrl, metaTitle, metaDescription } = await generateAIPost(aiConfig.masterPrompt, keyword, targetLanguage, businessContext);
      const slug = createSlug(title);

      // Get default author for this site
      const defaultAuthor = await storage.getDefaultAuthor(site.id);

      await storage.createPost({
        siteId: site.id,
        authorId: defaultAuthor?.id || null,
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
            const sourceUrl = item.link || item.guid || "";
            
            if (!sourceUrl) {
              console.log(`[RSS] Skipping article without URL: ${item.title}`);
              continue;
            }
            
            // Check database for existing post with this source URL (persistent duplicate detection)
            const existingPost = await storage.getPostBySourceUrl(site.id, sourceUrl);
            if (existingPost) {
              console.log(`[RSS] Skipping already processed article: ${item.title}`);
              continue;
            }

            const originalTitle = item.title || "Untitled";
            const originalContent = item.contentSnippet || item.content || "";
            const targetLanguage = rssConfig.targetLanguage || "en";
            const masterPrompt = rssConfig.masterPrompt || undefined;
            
            // Determine article role for internal linking graph
            let articleRole: ArticleRole = "news"; // Default role for RSS content
            
            // If RSS config is linked to a pillar, use pack-based role determination
            if ((rssConfig as any).pillarId) {
              const pillar = await storage.getPillarById((rssConfig as any).pillarId);
              if (pillar) {
                // Use configured role, or auto-detect from title keywords
                articleRole = ((rssConfig as any).articleRole as ArticleRole) || 
                              detectRoleFromKeyword(originalTitle) || 
                              "news";
                console.log(`[RSS] Using pillar "${pillar.name}" with role "${articleRole}"`);
              }
            } else if ((rssConfig as any).articleRole) {
              // No pillar but role specified
              articleRole = (rssConfig as any).articleRole as ArticleRole;
            } else {
              // Auto-detect from title
              articleRole = detectRoleFromKeyword(originalTitle) || "news";
            }

            console.log(`[RSS] Rewriting article: ${originalTitle} (target language: ${targetLanguage}, role: ${articleRole})`);
            
            let result: { title: string; content: string; tags: string[]; imageUrl?: string; metaTitle?: string; metaDescription?: string };
            
            // If RSS config is linked to a pillar, use role-specific prompts with internal linking
            if ((rssConfig as any).pillarId) {
              const pillar = await storage.getPillarById((rssConfig as any).pillarId);
              if (pillar) {
                // Get existing posts for the site to use as internal link targets
                const sitePosts = await storage.getPostsBySiteId(site.id);
                let linkTargets = sitePosts
                  .filter((p: { articleRole?: string | null; pillarId?: string | null }) => 
                    p.articleRole && (p.pillarId === pillar.id || !p.pillarId))
                  .slice(0, 10)
                  .map((p: { title: string; slug: string; articleRole?: string | null }) => ({
                    title: p.title,
                    slug: p.slug,
                    role: p.articleRole as ArticleRole,
                    anchorPattern: "semantic" as const,
                  }));
                
                // If no link targets exist, create a placeholder for the pillar itself
                if (linkTargets.length === 0) {
                  // Use pillar name as a link target placeholder to encourage internal linking
                  linkTargets = [{
                    title: pillar.name,
                    slug: pillar.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
                    role: "pillar" as ArticleRole,
                    anchorPattern: "semantic" as const,
                  }];
                }
                
                // Build role-specific prompt that incorporates original content
                const { buildLanguageDirective, getLanguageForPrompt } = await import("./language-utils");
                const lang = getLanguageForPrompt(targetLanguage);
                const languageDirective = buildLanguageDirective(lang);
                
                // Create a rewrite-focused prompt that uses role structure
                const rewriteContext = masterPrompt 
                  ? `${masterPrompt}\n\nRewrite the following article with a fresh perspective:\n\n${originalContent.slice(0, 2000)}`
                  : `Rewrite the following article with a fresh perspective and unique content:\n\n${originalContent.slice(0, 2000)}`;
                
                const rolePrompt = buildRoleSpecificPrompt(
                  articleRole,
                  pillar.packType as any || "full_coverage",
                  originalTitle,
                  [originalTitle.split(' ').slice(0, 3).join(' ')], // Use title words as keywords
                  linkTargets,
                  languageDirective,
                  rewriteContext
                );
                
                result = await generateFromPrompt(rolePrompt, originalTitle);
                console.log(`[RSS] Using role-specific prompt for "${articleRole}" role with internal linking (pillar: ${pillar.name})`);
              } else {
                // Pillar not found, fall back to standard rewriting
                const businessContext: BusinessContext = {
                  businessDescription: site.businessDescription,
                  targetAudience: site.targetAudience,
                  brandVoice: site.brandVoice,
                  valuePropositions: site.valuePropositions,
                  industry: site.industry,
                  competitors: site.competitors,
                };
                result = await rewriteArticle(originalContent, originalTitle, targetLanguage, masterPrompt, businessContext);
              }
            } else {
              // No pillar linked, use standard rewriting
              const businessContext: BusinessContext = {
                businessDescription: site.businessDescription,
                targetAudience: site.targetAudience,
                brandVoice: site.brandVoice,
                valuePropositions: site.valuePropositions,
                industry: site.industry,
                competitors: site.competitors,
              };
              result = await rewriteArticle(originalContent, originalTitle, targetLanguage, masterPrompt, businessContext);
            }
            
            const { title, content, tags, imageUrl, metaTitle, metaDescription } = result;
            const slug = createSlug(title);

            // Get default author for this site
            const defaultAuthor = await storage.getDefaultAuthor(site.id);

            await storage.createPost({
              siteId: site.id,
              authorId: defaultAuthor?.id || null,
              title,
              content,
              slug,
              tags,
              imageUrl,
              metaTitle,
              metaDescription,
              source: "rss",
              sourceUrl, // Store original URL for future duplicate detection
              articleRole, // Link to internal linking graph
              pillarId: (rssConfig as any).pillarId || null,
            });

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
      const targetLanguage = batch.targetLanguage || aiConfig?.targetLanguage || "en";

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
        console.log(`[Bulk] Generating post for keyword: "${nextJob.keyword}" (site: ${site.domain}, language: ${targetLanguage})`);
        
        // Mark job as processing
        await storage.updateKeywordJob(nextJob.id, { status: "processing" });

        let result: { title: string; content: string; tags: string[]; imageUrl?: string; metaTitle?: string; metaDescription?: string };
        let articleRole: ArticleRole = "general";
        
        // Check if batch is linked to a pillar for role-specific generation
        if (batch.pillarId) {
          const pillar = await storage.getPillarById(batch.pillarId);
          if (pillar) {
            // Determine article role: use batch-specified role, auto-detect from keyword, or default
            articleRole = (batch.articleRole as ArticleRole) || detectRoleFromKeyword(nextJob.keyword) || "support";
            
            // Get existing posts for the site to use as internal link targets
            const sitePosts = await storage.getPostsBySiteId(site.id);
            const linkTargets = sitePosts
              .filter((p: { articleRole?: string | null }) => p.articleRole)
              .slice(0, 10)
              .map((p: { title: string; slug: string; articleRole?: string | null }) => ({
                title: p.title,
                slug: p.slug,
                role: p.articleRole as ArticleRole,
                anchorPattern: "semantic" as const,
              }));
            
            // Build role-specific prompt
            const { buildLanguageDirective, getLanguageForPrompt } = await import("./language-utils");
            const lang = getLanguageForPrompt(targetLanguage);
            const languageDirective = buildLanguageDirective(lang);
            
            const rolePrompt = buildRoleSpecificPrompt(
              articleRole,
              pillar.packType as any || "full_coverage",
              nextJob.keyword,
              [nextJob.keyword],
              linkTargets,
              languageDirective,
              masterPrompt
            );
            
            result = await generateFromPrompt(rolePrompt, nextJob.keyword);
            console.log(`[Bulk] Using role-specific prompt for "${articleRole}" role (pillar: ${pillar.name})`);
          } else {
            // Pillar not found, fall back to standard generation
            const businessContext: BusinessContext = {
              businessDescription: site.businessDescription,
              targetAudience: site.targetAudience,
              brandVoice: site.brandVoice,
              valuePropositions: site.valuePropositions,
              industry: site.industry,
              competitors: site.competitors,
            };
            result = await generateAIPost(masterPrompt, nextJob.keyword, targetLanguage, businessContext);
          }
        } else {
          // No pillar linked, use standard generation with auto-detected role
          articleRole = (batch.articleRole as ArticleRole) || detectRoleFromKeyword(nextJob.keyword);
          const businessContext: BusinessContext = {
            businessDescription: site.businessDescription,
            targetAudience: site.targetAudience,
            brandVoice: site.brandVoice,
            valuePropositions: site.valuePropositions,
            industry: site.industry,
            competitors: site.competitors,
          };
          result = await generateAIPost(masterPrompt, nextJob.keyword, targetLanguage, businessContext);
        }
        
        const { title, content, tags, imageUrl, metaTitle, metaDescription } = result;
        const slug = createSlug(title);

        // Get default author for this site
        const defaultAuthor = await storage.getDefaultAuthor(site.id);

        // Create the post with article role
        const post = await storage.createPost({
          siteId: site.id,
          authorId: defaultAuthor?.id || null,
          title,
          content,
          slug,
          tags,
          imageUrl,
          metaTitle,
          metaDescription,
          source: "ai-bulk",
          articleRole,
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

// Lock to prevent concurrent processing of the same pillar
const pillarProcessingLocks = new Set<string>();
let isPillarGenerationRunning = false;

async function processPillarGeneration() {
  // Prevent concurrent runs of the entire scheduler
  if (isPillarGenerationRunning) {
    console.log("[Pillar] Previous run still in progress, skipping...");
    return;
  }
  
  isPillarGenerationRunning = true;
  
  try {
    const activePillars = await storage.getActivePillars();
    
    for (const pillar of activePillars) {
      if (pillar.status !== "generating") {
        continue;
      }

      // Check if this pillar is already being processed
      if (pillarProcessingLocks.has(pillar.id)) {
        console.log(`[Pillar] Pillar "${pillar.name}" is already being processed, skipping...`);
        continue;
      }

      // Acquire lock for this pillar
      pillarProcessingLocks.add(pillar.id);

      try {
        console.log(`[Pillar] Processing next article for pillar: ${pillar.name}`);
        const result = await processNextPillarArticle(pillar);
        
        if (result.success && result.postId) {
          console.log(`[Pillar] Generated article for pillar "${pillar.name}"`);
        } else if (result.success && !result.postId) {
          console.log(`[Pillar] Pillar "${pillar.name}" completed - all articles generated`);
        } else {
          console.error(`[Pillar] Error generating article for pillar "${pillar.name}": ${result.error}`);
        }
      } catch (error) {
        console.error(`[Pillar] Error processing pillar ${pillar.name}:`, error);
      } finally {
        // Release lock for this pillar
        pillarProcessingLocks.delete(pillar.id);
      }
    }
  } finally {
    isPillarGenerationRunning = false;
  }
}

export function startAutomationSchedulers() {
  // AI Content Generation - runs multiple times per day based on site configs
  cron.schedule("0 */8 * * *", processAIAutomation);
  
  // RSS Feed Processing - runs every 6 hours
  cron.schedule("0 */6 * * *", processRSSAutomation);

  // Keyword Batch Processing - runs every minute to process queued jobs
  cron.schedule("* * * * *", processKeywordBatches);

  // Pillar Content Generation - runs every minute to process generating pillars
  cron.schedule("* * * * *", processPillarGeneration);

  console.log("[Automation] Schedulers started");
}
