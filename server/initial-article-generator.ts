import OpenAI from "openai";
import { storage } from "./storage";
import { searchPexelsImage } from "./pexels";
import { buildLanguageDirective, getLanguageForPrompt } from "./language-utils";
import { generateInitialPillars, calculatePublishSchedule } from "./monthly-content-engine";
import type { Site, Pillar } from "@shared/schema";

let openai: OpenAI | null = null;

// In-memory lock to prevent concurrent generation for the same site
const generationLocks = new Set<string>();

export function isGenerating(siteId: string): boolean {
  return generationLocks.has(siteId);
}

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
      throw new Error("OpenAI AI Integrations not configured. Please set up AI Integrations in your Replit project.");
    }
    openai = new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    });
  }
  return openai;
}

interface InitialArticle {
  title: string;
  content: string;
  slug: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  imageQuery: string;
}

interface ArticlePlan {
  pillarTopic: string;
  articles: {
    title: string;
    description: string;
    keywords: string[];
    isPillar: boolean;
  }[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 100);
}

export async function generateInitialArticlePlan(site: Site): Promise<ArticlePlan> {
  const lang = getLanguageForPrompt(site.displayLanguage || "en");
  const languageDirective = buildLanguageDirective(lang);
  
  const businessContext = [
    site.businessDescription ? `Business: ${site.businessDescription}` : "",
    site.targetAudience ? `Target Audience: ${site.targetAudience}` : "",
    site.brandVoice ? `Brand Voice: ${site.brandVoice}` : "",
    site.industry ? `Industry: ${site.industry}` : "",
    site.valuePropositions ? `Value Propositions: ${site.valuePropositions}` : "",
  ].filter(Boolean).join("\n");

  const prompt = `You are an SEO content strategist. Create a mini content plan for a new site.

${languageDirective}

BUSINESS CONTEXT:
${businessContext || "General business blog"}

Create a focused "mini-pillar" content cluster with exactly 4 articles:
1. ONE pillar article (comprehensive overview, 2000+ words potential)
2. THREE supporting articles (more specific topics, link back to pillar)

The articles should:
- Be highly relevant to the business and target audience
- Target keywords with good search potential
- Form a logical internal linking structure
- Provide immediate value to readers

Respond with valid JSON:
{
  "pillarTopic": "The main topic/theme these articles cover",
  "articles": [
    {
      "title": "Pillar article title (comprehensive guide)",
      "description": "Brief description of what this article covers",
      "keywords": ["primary keyword", "secondary keyword"],
      "isPillar": true
    },
    {
      "title": "Supporting article 1 title",
      "description": "Brief description",
      "keywords": ["keyword1", "keyword2"],
      "isPillar": false
    },
    {
      "title": "Supporting article 2 title",
      "description": "Brief description",
      "keywords": ["keyword1", "keyword2"],
      "isPillar": false
    },
    {
      "title": "Supporting article 3 title",
      "description": "Brief description",
      "keywords": ["keyword1", "keyword2"],
      "isPillar": false
    }
  ]
}`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function generateInitialArticleContent(
  article: ArticlePlan["articles"][0],
  site: Site,
  siblingTitles: string[]
): Promise<InitialArticle> {
  const lang = getLanguageForPrompt(site.displayLanguage || "en");
  const languageDirective = buildLanguageDirective(lang);
  
  const businessContext = [
    site.businessDescription ? `Business: ${site.businessDescription}` : "",
    site.targetAudience ? `Target Audience: ${site.targetAudience}` : "",
    site.brandVoice ? `Brand Voice: ${site.brandVoice}` : "",
    site.industry ? `Industry: ${site.industry}` : "",
  ].filter(Boolean).join("\n");

  const linkingSuggestion = siblingTitles.length > 0 
    ? `\n\nINTERNAL LINKING:
Include natural links to these related articles (use semantic anchor text):
${siblingTitles.map(t => `- "${t}"`).join("\n")}`
    : "";

  const articleType = article.isPillar ? "comprehensive pillar" : "focused supporting";
  const wordCount = article.isPillar ? "1800-2500" : "1000-1500";

  const prompt = `Write a ${articleType} article.

${languageDirective}

BUSINESS CONTEXT:
${businessContext || "General business blog"}

ARTICLE DETAILS:
Title: ${article.title}
Description: ${article.description}
Target Keywords: ${article.keywords.join(", ")}
${linkingSuggestion}

Write a ${wordCount} word article that:
- Is SEO-optimized for the target keywords
- Provides genuine value to readers
- Uses proper heading hierarchy (H2, H3)
- Includes actionable insights
- Has an engaging introduction and strong conclusion
- Uses markdown formatting

Respond with valid JSON:
{
  "title": "The final article title (can refine the suggested title)",
  "content": "The full article content in markdown format",
  "tags": ["tag1", "tag2", "tag3"],
  "metaTitle": "SEO meta title (50-60 chars)",
  "metaDescription": "SEO meta description (150-160 chars)",
  "imageQuery": "Best search term for finding a relevant featured image"
}`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 16384,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  
  return {
    title: result.title || article.title,
    content: result.content || "",
    slug: slugify(result.title || article.title),
    tags: Array.isArray(result.tags) ? result.tags : article.keywords,
    metaTitle: result.metaTitle || result.title || article.title,
    metaDescription: result.metaDescription || article.description || "",
    imageQuery: result.imageQuery || article.keywords[0] || article.title,
  };
}

export async function generateInitialArticlesForSite(siteId: string): Promise<{
  success: boolean;
  articlesCreated: number;
  error?: string;
}> {
  // Check if generation is already in progress
  if (generationLocks.has(siteId)) {
    console.log(`[Initial Articles] Generation already in progress for site ${siteId}, skipping`);
    return { success: true, articlesCreated: 0, error: "Generation already in progress" };
  }
  
  // Acquire lock
  generationLocks.add(siteId);
  
  try {
    const site = await storage.getSiteById(siteId);
    if (!site) {
      generationLocks.delete(siteId);
      return { success: false, articlesCreated: 0, error: "Site not found" };
    }

    if (site.initialArticlesGenerated) {
      console.log(`[Initial Articles] Site ${siteId} already has initial articles generated`);
      generationLocks.delete(siteId);
      return { success: true, articlesCreated: 0 };
    }

    // Check for existing onboarding articles to avoid duplicates
    const existingPosts = await storage.getPostsBySiteId(siteId);
    const existingOnboardingPosts = existingPosts.filter(p => p.source === "onboarding");
    const existingTitles = new Set(existingOnboardingPosts.map(p => p.title.toLowerCase()));
    
    console.log(`[Initial Articles] Generating initial articles for site ${siteId} (${existingOnboardingPosts.length} existing onboarding posts)`);

    // Check for existing automation pillars to avoid duplicates
    const existingPillars = await storage.getPillarsBySiteId(siteId);
    const automationPillars = existingPillars.filter(p => p.isAutomation);
    
    let createdPillars: Pillar[] = [];
    
    if (automationPillars.length >= 4) {
      console.log(`[Initial Articles] Using ${automationPillars.length} existing automation pillars`);
      createdPillars = automationPillars;
    } else {
      console.log(`[Initial Articles] Creating automation pillars for future monthly content`);
      const pillarPlans = await generateInitialPillars(site);
      
      for (const pillarPlan of pillarPlans) {
        // Check if a pillar with similar name already exists
        const existingPillar = automationPillars.find(
          p => p.name.toLowerCase() === pillarPlan.name.toLowerCase()
        );
        if (existingPillar) {
          createdPillars.push(existingPillar);
          console.log(`[Initial Articles] Reusing existing automation pillar: "${existingPillar.name}"`);
          continue;
        }
        
        try {
          const pillar = await storage.createPillar({
            siteId,
            name: pillarPlan.name,
            description: pillarPlan.description,
            status: "generating",
            packType: "authority",
            targetArticleCount: 100,
            targetLanguage: site.displayLanguage || "en",
            defaultPostStatus: "draft",
            isAutomation: true,
            maxArticles: 100,
          });
          createdPillars.push(pillar);
          console.log(`[Initial Articles] Created automation pillar: "${pillar.name}"`);
        } catch (pillarError) {
          console.error(`[Initial Articles] Failed to create pillar:`, pillarError);
        }
      }
    }

    // Generate 2 real articles + 2 placeholder locked posts
    const TARGET_REAL_ARTICLES = 2;
    const TARGET_PLACEHOLDER_ARTICLES = 2;
    
    // Separate existing real articles from locked placeholders
    const existingRealArticles = existingOnboardingPosts.filter(p => !p.isLocked);
    const existingLockedPlaceholders = existingOnboardingPosts.filter(p => p.isLocked);
    
    // Check if we already have all articles
    if (existingRealArticles.length >= TARGET_REAL_ARTICLES && existingLockedPlaceholders.length >= TARGET_PLACEHOLDER_ARTICLES) {
      console.log(`[Initial Articles] Site ${siteId} already has ${existingRealArticles.length} real + ${existingLockedPlaceholders.length} locked articles, marking as complete`);
      await storage.updateSite(siteId, { initialArticlesGenerated: true });
      return { success: true, articlesCreated: 0 };
    }

    const realArticlesToCreate = Math.max(0, TARGET_REAL_ARTICLES - existingRealArticles.length);
    const placeholdersToCreate = Math.max(0, TARGET_PLACEHOLDER_ARTICLES - existingLockedPlaceholders.length);
    console.log(`[Initial Articles] Need to create ${realArticlesToCreate} real articles + ${placeholdersToCreate} placeholder locked posts`);

    const plan = await generateInitialArticlePlan(site);
    
    if (!plan.articles || plan.articles.length === 0) {
      return { success: false, articlesCreated: 0, error: "Failed to generate article plan" };
    }

    const defaultAuthor = await storage.getDefaultAuthor(siteId);
    const createdPosts: string[] = [];
    const articleTitles = plan.articles.map(a => a.title);
    
    // Calculate scheduled publish dates for new articles (spread over 2 weeks for initial content)
    const publishDates = calculatePublishSchedule(realArticlesToCreate, new Date());

    const pillarCounts: Record<string, number> = {};
    
    // Skip articles we already have (by checking titles)
    let articlesCreatedCount = 0;
    for (let i = 0; i < plan.articles.length && articlesCreatedCount < realArticlesToCreate; i++) {
      const articlePlan = plan.articles[i];
      
      // Skip if we already have an article with a similar title
      if (existingTitles.has(articlePlan.title.toLowerCase())) {
        console.log(`[Initial Articles] Skipping article "${articlePlan.title}" - already exists`);
        continue;
      }
      
      const siblingTitles = articleTitles.filter((_, idx) => idx !== i);
      
      try {
        const article = await generateInitialArticleContent(articlePlan, site, siblingTitles);
        
        // Double-check the generated title isn't a duplicate
        if (existingTitles.has(article.title.toLowerCase())) {
          console.log(`[Initial Articles] Skipping generated article "${article.title}" - already exists`);
          continue;
        }
        
        // Attempt to fetch feature photo with retry logic
        let imageUrl = await searchPexelsImage(
          article.imageQuery,
          [article.tags[0], article.title].filter(Boolean)
        );

        // If no image found, retry with different fallback queries
        if (!imageUrl) {
          console.log(`[Initial Articles] No image for "${article.title}", retrying with fallbacks...`);
          const fallbackQueries = [
            article.tags[0] || "",
            article.title.split(" ").slice(0, 3).join(" "),
            site.industry || "business professional",
            "professional modern blog"
          ].filter(q => q && q.length > 2);
          
          for (const fallbackQuery of fallbackQueries) {
            imageUrl = await searchPexelsImage(fallbackQuery);
            if (imageUrl) {
              console.log(`[Initial Articles] Found image using fallback: "${fallbackQuery}"`);
              break;
            }
          }
        }

        // Real articles are never locked - they're the unlocked ones
        const pillarIndex = createdPillars.length > 0 ? articlesCreatedCount % createdPillars.length : -1;
        const pillarId = pillarIndex >= 0 ? createdPillars[pillarIndex].id : undefined;
        
        const post = await storage.createPost({
          siteId,
          authorId: defaultAuthor?.id || null,
          title: article.title,
          slug: article.slug,
          content: article.content,
          imageUrl: imageUrl || undefined,
          tags: article.tags,
          source: "onboarding",
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
          articleRole: articlePlan.isPillar ? "pillar" : "support",
          status: "draft",
          isLocked: false, // Real articles are always unlocked
          pillarId,
          scheduledPublishDate: publishDates[articlesCreatedCount],
        });

        // Post-creation photo check: if still no image, schedule a retry update
        if (!imageUrl) {
          console.log(`[Initial Articles] Article "${article.title}" created without image, will retry...`);
          // Attempt one final generic search and update the post
          setTimeout(async () => {
            try {
              const finalImageUrl = await searchPexelsImage(
                site.industry || site.title || "professional business",
                ["modern office", "professional team", "business success"]
              );
              if (finalImageUrl) {
                await storage.updatePost(post.id, { imageUrl: finalImageUrl });
                console.log(`[Initial Articles] Updated "${article.title}" with fallback image`);
              }
            } catch (updateError) {
              console.error(`[Initial Articles] Failed to update image for "${article.title}":`, updateError);
            }
          }, 2000);
        }

        createdPosts.push(post.id);
        existingTitles.add(article.title.toLowerCase());
        articlesCreatedCount++;
        
        if (pillarId) {
          pillarCounts[pillarId] = (pillarCounts[pillarId] || 0) + 1;
        }
        console.log(`[Initial Articles] Created real article ${articlesCreatedCount}/${TARGET_REAL_ARTICLES}: "${article.title}"${imageUrl ? "" : " (no image)"}`);

      } catch (articleError) {
        console.error(`[Initial Articles] Failed to generate article ${i + 1}:`, articleError);
      }
    }

    // Create placeholder locked posts (quick, no AI generation needed)
    const placeholderData = [
      { title: "Premium: Advanced Strategies for Your Business", imageQuery: "business strategy planning" },
      { title: "Premium: Expert Tips You Need to Know", imageQuery: "professional expertise tips" },
    ];
    const placeholderContent = `<p>This premium article is available to subscribers.</p><p>Upgrade your plan to unlock exclusive content, advanced strategies, and expert insights tailored to your business needs.</p>`;
    
    let placeholderCreatedCount = 0;
    for (let i = 0; i < placeholdersToCreate; i++) {
      const placeholderIndex = existingLockedPlaceholders.length + i;
      const data = placeholderData[placeholderIndex] || { title: `Premium Article ${placeholderIndex + 1}`, imageQuery: "premium content" };
      const slug = slugify(data.title + "-" + siteId.slice(0, 8) + "-" + placeholderIndex);
      
      try {
        // Get a stock image for the placeholder
        let imageUrl: string | null = null;
        try {
          imageUrl = await searchPexelsImage(data.imageQuery);
        } catch (imgError) {
          console.log(`[Initial Articles] Could not fetch image for placeholder, continuing without`);
        }
        
        const post = await storage.createPost({
          siteId,
          authorId: defaultAuthor?.id || null,
          title: data.title,
          slug,
          content: placeholderContent,
          imageUrl,
          tags: ["premium"],
          source: "onboarding",
          metaTitle: data.title,
          metaDescription: "Subscribe to unlock this premium content.",
          articleRole: "support",
          status: "draft",
          isLocked: true,
          // No scheduled publish date - won't show in calendar
        });
        createdPosts.push(post.id);
        placeholderCreatedCount++;
        console.log(`[Initial Articles] Created placeholder locked post: "${data.title}"`);
      } catch (placeholderError) {
        console.error(`[Initial Articles] Failed to create placeholder post:`, placeholderError);
      }
    }

    for (const [pillarId, count] of Object.entries(pillarCounts)) {
      await storage.updatePillar(pillarId, {
        generatedCount: count,
      });
    }

    const finalRealCount = existingRealArticles.length + articlesCreatedCount;
    const finalLockedCount = existingLockedPlaceholders.length + placeholderCreatedCount;
    const initialComplete = finalRealCount >= TARGET_REAL_ARTICLES && finalLockedCount >= TARGET_PLACEHOLDER_ARTICLES;

    if (initialComplete) {
      await storage.updateSite(siteId, {
        initialArticlesGenerated: true,
      });
    } else {
      console.log(
        `[Initial Articles] Incomplete for site ${siteId}: ` +
          `${finalRealCount}/${TARGET_REAL_ARTICLES} real, ` +
          `${finalLockedCount}/${TARGET_PLACEHOLDER_ARTICLES} locked.`
      );
    }

    console.log(`[Initial Articles] Completed for site ${siteId}. Created ${createdPillars.length} pillars and ${createdPosts.length} articles.`);

    // Clean up duplicate images after generating all articles
    try {
      const { cleanDuplicateImagesForSite } = await import("./duplicate-image-cleaner");
      const cleanupResult = await cleanDuplicateImagesForSite(siteId);
      if (cleanupResult.updated > 0) {
        console.log(`[Initial Articles] Cleaned up ${cleanupResult.updated} duplicate images for site ${siteId}`);
      }
    } catch (cleanupError) {
      console.error(`[Initial Articles] Failed to clean duplicate images:`, cleanupError);
    }

    // Release lock
    generationLocks.delete(siteId);
    
    return {
      success: true,
      articlesCreated: createdPosts.length,
    };
  } catch (error) {
    console.error("[Initial Articles] Error generating initial articles:", error);
    // Release lock on error
    generationLocks.delete(siteId);
    return {
      success: false,
      articlesCreated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
