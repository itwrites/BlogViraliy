import OpenAI from "openai";
import { storage } from "./storage";
import { searchPexelsImage } from "./pexels";
import { buildLanguageDirective, getLanguageForPrompt } from "./language-utils";
import { buildRoleSpecificPrompt, type LinkTarget } from "./role-prompts";
import type { BusinessContext } from "./openai";
import type { Site, Post, ArticleRole, User } from "@shared/schema";
import { PLAN_LIMITS } from "@shared/schema";
import { PACK_DEFINITIONS, type PackType, getPackRoleDistribution, selectRoleForArticle } from "@shared/pack-definitions";

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
      throw new Error("OpenAI AI Integrations not configured.");
    }
    openai = new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    });
  }
  return openai;
}

function extractBusinessContext(site: Site): BusinessContext {
  return {
    businessDescription: site.businessDescription,
    targetAudience: site.targetAudience,
    brandVoice: site.brandVoice,
    valuePropositions: site.valuePropositions,
    industry: site.industry,
    competitors: site.competitors,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 100);
}

interface TopicPlan {
  pillarTopic: string;
  articles: {
    title: string;
    keywords: string[];
    role: ArticleRole;
    isPillar: boolean;
  }[];
}

interface GeneratedArticle {
  title: string;
  content: string;
  slug: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  articleRole: ArticleRole;
}

export async function generateMonthlyTopicPlan(
  site: Site,
  articleCount: number,
  topicIndex: number
): Promise<TopicPlan> {
  const lang = getLanguageForPrompt(site.displayLanguage || "en");
  const languageDirective = buildLanguageDirective(lang);
  
  const businessContext = [
    site.businessDescription ? `Business: ${site.businessDescription}` : "",
    site.targetAudience ? `Target Audience: ${site.targetAudience}` : "",
    site.brandVoice ? `Brand Voice: ${site.brandVoice}` : "",
    site.industry ? `Industry: ${site.industry}` : "",
    site.valuePropositions ? `Value Propositions: ${site.valuePropositions}` : "",
  ].filter(Boolean).join("\n");

  const packType: PackType = "authority";
  const packDef = PACK_DEFINITIONS[packType];
  const roleDistribution = getPackRoleDistribution(packDef.defaultRoleDistribution);

  const prompt = `You are an SEO content strategist creating a monthly content plan.

${languageDirective}

BUSINESS CONTEXT:
${businessContext || "General business blog"}

MONTH INDEX: ${topicIndex} (use this to vary the topic focus - each month should cover a different aspect)

Create a focused content cluster with exactly ${articleCount} articles:
- 1 pillar article (comprehensive overview, cornerstone content)
- ${articleCount - 1} supporting articles (more specific topics, varied roles)

The articles should:
- Be highly relevant to the business and target audience
- Target keywords with good search potential
- Form a logical internal linking structure
- Be different from typical month ${topicIndex % 12} content (vary the angle)

Available article roles: ${Object.keys(roleDistribution).slice(0, 8).join(", ")}

Respond with valid JSON:
{
  "pillarTopic": "The main theme for this month's content",
  "articles": [
    {
      "title": "Pillar article title",
      "keywords": ["primary keyword", "secondary keyword"],
      "role": "pillar",
      "isPillar": true
    },
    {
      "title": "Supporting article title",
      "keywords": ["keyword1", "keyword2"],
      "role": "support",
      "isPillar": false
    }
  ]
}`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 8192,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  
  if (!result.articles || result.articles.length < articleCount) {
    const defaultArticles = [];
    for (let i = result.articles?.length || 0; i < articleCount; i++) {
      const role = selectRoleForArticle(roleDistribution, i);
      defaultArticles.push({
        title: `Article ${i + 1} about ${site.industry || "your business"}`,
        keywords: [site.industry || "business", "guide"],
        role,
        isPillar: i === 0,
      });
    }
    result.articles = [...(result.articles || []), ...defaultArticles];
  }
  
  return result;
}

export async function generateArticleContent(
  articlePlan: TopicPlan["articles"][0],
  site: Site,
  siblingTitles: string[]
): Promise<GeneratedArticle> {
  const lang = getLanguageForPrompt(site.displayLanguage || "en");
  const languageDirective = buildLanguageDirective(lang);
  const businessContext = extractBusinessContext(site);
  
  const linkTargets: LinkTarget[] = siblingTitles.map(title => ({
    title,
    slug: slugify(title),
    role: "support" as ArticleRole,
    anchorPattern: "semantic",
  }));

  const prompt = buildRoleSpecificPrompt(
    articlePlan.role,
    "authority",
    articlePlan.title,
    articlePlan.keywords,
    linkTargets,
    languageDirective,
    "",
    businessContext
  );

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 16384,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  
  return {
    title: result.title || articlePlan.title,
    content: result.content || "",
    slug: slugify(result.title || articlePlan.title),
    tags: Array.isArray(result.tags) ? result.tags : articlePlan.keywords,
    metaTitle: result.metaTitle || result.title || articlePlan.title,
    metaDescription: result.metaDescription || "",
    articleRole: articlePlan.role,
  };
}

function calculatePublishSchedule(
  articleCount: number,
  startDate: Date = new Date()
): Date[] {
  const daysInMonth = 30;
  const interval = Math.max(1, Math.floor(daysInMonth / articleCount));
  
  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  
  for (let i = 0; i < articleCount; i++) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + interval);
  }
  
  return dates;
}

export async function generateMonthlyContentForSite(
  siteId: string,
  owner: User
): Promise<{
  success: boolean;
  articlesCreated: number;
  error?: string;
}> {
  try {
    const site = await storage.getSiteById(siteId);
    if (!site) {
      return { success: false, articlesCreated: 0, error: "Site not found" };
    }

    if (!owner.subscriptionPlan || owner.subscriptionStatus !== "active") {
      return { success: false, articlesCreated: 0, error: "No active subscription" };
    }

    const planLimits = PLAN_LIMITS[owner.subscriptionPlan as keyof typeof PLAN_LIMITS];
    if (!planLimits) {
      return { success: false, articlesCreated: 0, error: "Invalid subscription plan" };
    }

    const ownerSites = await storage.getSitesByOwnerId(owner.id);
    const sitesCount = ownerSites.length;
    const postsPerSite = Math.floor(planLimits.postsPerMonth / sitesCount);
    
    const articleCount = Math.max(4, Math.min(postsPerSite, 30));
    const currentTopicIndex = site.currentTopicIndex || 0;

    console.log(`[Monthly Content] Generating ${articleCount} articles for site ${siteId} (topic index: ${currentTopicIndex})`);

    const plan = await generateMonthlyTopicPlan(site, articleCount, currentTopicIndex);
    
    if (!plan.articles || plan.articles.length === 0) {
      return { success: false, articlesCreated: 0, error: "Failed to generate topic plan" };
    }

    const defaultAuthor = await storage.getDefaultAuthor(siteId);
    const publishDates = calculatePublishSchedule(plan.articles.length);
    const articleTitles = plan.articles.map(a => a.title);
    
    let createdCount = 0;

    for (let i = 0; i < plan.articles.length; i++) {
      const articlePlan = plan.articles[i];
      const siblingTitles = articleTitles.filter((_, idx) => idx !== i);
      
      try {
        const article = await generateArticleContent(articlePlan, site, siblingTitles);
        
        const imageUrl = await searchPexelsImage(
          articlePlan.keywords[0] || article.title,
          [article.tags[0], article.title].filter(Boolean)
        );

        await storage.createPost({
          siteId,
          authorId: defaultAuthor?.id || null,
          title: article.title,
          slug: article.slug,
          content: article.content,
          imageUrl: imageUrl || undefined,
          tags: article.tags,
          source: "monthly-automation",
          metaTitle: article.metaTitle,
          metaDescription: article.metaDescription,
          articleRole: article.articleRole,
          status: "draft",
          isLocked: false,
          scheduledPublishDate: publishDates[i],
        });

        createdCount++;
        console.log(`[Monthly Content] Created article ${i + 1}/${plan.articles.length}: "${article.title}"`);
        
        await storage.updateUser(owner.id, {
          postsUsedThisMonth: (owner.postsUsedThisMonth || 0) + 1,
        });
      } catch (articleError) {
        console.error(`[Monthly Content] Failed to generate article ${i + 1}:`, articleError);
      }
    }

    await storage.updateSite(siteId, {
      currentTopicIndex: currentTopicIndex + 1,
    });

    console.log(`[Monthly Content] Completed for site ${siteId}. Created ${createdCount}/${plan.articles.length} articles.`);

    return {
      success: true,
      articlesCreated: createdCount,
    };
  } catch (error) {
    console.error("[Monthly Content] Error generating monthly content:", error);
    return {
      success: false,
      articlesCreated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function triggerMonthlyContentGeneration(userId: string): Promise<{
  success: boolean;
  totalArticles: number;
  sitesProcessed: number;
  errors: string[];
}> {
  try {
    const owner = await storage.getUser(userId);
    if (!owner || owner.role !== "owner") {
      return { success: false, totalArticles: 0, sitesProcessed: 0, errors: ["User not found or not an owner"] };
    }

    if (!owner.subscriptionPlan || owner.subscriptionStatus !== "active") {
      return { success: false, totalArticles: 0, sitesProcessed: 0, errors: ["No active subscription"] };
    }

    const sites = await storage.getSitesByOwnerId(userId);
    const errors: string[] = [];
    let totalArticles = 0;
    let sitesProcessed = 0;

    for (const site of sites) {
      if (!site.businessDescription) {
        errors.push(`Site "${site.title}" skipped: no business profile`);
        continue;
      }

      const result = await generateMonthlyContentForSite(site.id, owner);
      
      if (result.success) {
        totalArticles += result.articlesCreated;
        sitesProcessed++;
      } else {
        errors.push(`Site "${site.title}": ${result.error}`);
      }
    }

    return {
      success: sitesProcessed > 0,
      totalArticles,
      sitesProcessed,
      errors,
    };
  } catch (error) {
    console.error("[Monthly Content] Error in trigger:", error);
    return {
      success: false,
      totalArticles: 0,
      sitesProcessed: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}
