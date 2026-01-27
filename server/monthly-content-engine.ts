import OpenAI from "openai";
import { storage } from "./storage";
import { searchPexelsImage } from "./pexels";
import { buildLanguageDirective, getLanguageForPrompt } from "./language-utils";
import { buildRoleSpecificPrompt, type LinkTarget } from "./role-prompts";
import type { BusinessContext } from "./openai";
import type { Site, Post, ArticleRole, User, Pillar } from "@shared/schema";
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

interface PillarPlan {
  name: string;
  description: string;
}

interface ArticlePlan {
  title: string;
  keywords: string[];
  role: ArticleRole;
  pillarId: string;
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

const MAX_ARTICLES_PER_PILLAR = 100;
const INITIAL_PILLAR_COUNT = 4;

export async function generateInitialPillars(site: Site): Promise<PillarPlan[]> {
  const lang = getLanguageForPrompt(site.displayLanguage || "en");
  const languageDirective = buildLanguageDirective(lang);
  
  const businessContext = [
    site.businessDescription ? `Business: ${site.businessDescription}` : "",
    site.targetAudience ? `Target Audience: ${site.targetAudience}` : "",
    site.brandVoice ? `Brand Voice: ${site.brandVoice}` : "",
    site.industry ? `Industry: ${site.industry}` : "",
    site.valuePropositions ? `Value Propositions: ${site.valuePropositions}` : "",
  ].filter(Boolean).join("\n");

  const prompt = `You are an SEO content strategist creating a long-term content strategy.

${languageDirective}

BUSINESS CONTEXT:
${businessContext || "General business blog"}

Create exactly ${INITIAL_PILLAR_COUNT} distinct content pillars (major topic themes) for this business.
Each pillar should:
- Cover a major aspect of the business's expertise
- Be broad enough to support 50-100 articles
- Target different keyword clusters
- Together form a comprehensive content strategy

Respond with valid JSON:
{
  "pillars": [
    {
      "name": "Short pillar name (3-5 words)",
      "description": "Brief description of what this pillar covers and its SEO value"
    }
  ]
}`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 4096,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  
  if (!result.pillars || result.pillars.length < INITIAL_PILLAR_COUNT) {
    const defaultPillars: PillarPlan[] = [];
    const industry = site.industry || "business";
    const suggestions = [
      { name: `${industry} Fundamentals`, description: "Core concepts and best practices" },
      { name: `${industry} Strategies`, description: "Advanced tactics and approaches" },
      { name: `${industry} Tools & Resources`, description: "Reviews, comparisons, and guides" },
      { name: `${industry} Case Studies`, description: "Real-world examples and success stories" },
    ];
    
    for (let i = result.pillars?.length || 0; i < INITIAL_PILLAR_COUNT; i++) {
      defaultPillars.push(suggestions[i] || suggestions[0]);
    }
    result.pillars = [...(result.pillars || []), ...defaultPillars];
  }
  
  return result.pillars;
}

export async function generateArticlesForPillars(
  pillars: Pillar[],
  site: Site,
  articlesPerPillar: number
): Promise<ArticlePlan[]> {
  const lang = getLanguageForPrompt(site.displayLanguage || "en");
  const languageDirective = buildLanguageDirective(lang);
  
  const businessContext = [
    site.businessDescription ? `Business: ${site.businessDescription}` : "",
    site.targetAudience ? `Target Audience: ${site.targetAudience}` : "",
    site.industry ? `Industry: ${site.industry}` : "",
  ].filter(Boolean).join("\n");

  const pillarInfo = pillars.map((p, i) => 
    `${i + 1}. "${p.name}" (ID: ${p.id}) - ${p.description || "Main topic pillar"} - Already has ${p.generatedCount} articles`
  ).join("\n");

  const packType: PackType = "authority";
  const packDef = PACK_DEFINITIONS[packType];
  const roleDistribution = getPackRoleDistribution(packDef.defaultRoleDistribution);

  const prompt = `You are an SEO content strategist creating monthly article assignments.

${languageDirective}

BUSINESS CONTEXT:
${businessContext || "General business blog"}

EXISTING CONTENT PILLARS:
${pillarInfo}

Generate exactly ${articlesPerPillar * pillars.length} article ideas, distributing them evenly across all pillars (${articlesPerPillar} per pillar).

For each article:
- Choose the most relevant pillar
- Create a compelling, SEO-friendly title
- Include 2-3 target keywords
- Assign an article role from: ${Object.keys(roleDistribution).slice(0, 8).join(", ")}

Respond with valid JSON:
{
  "articles": [
    {
      "title": "Article title",
      "keywords": ["keyword1", "keyword2"],
      "role": "support",
      "pillarId": "pillar-uuid-here"
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
  
  if (!result.articles || result.articles.length === 0) {
    const defaultArticles: ArticlePlan[] = [];
    for (let i = 0; i < pillars.length * articlesPerPillar; i++) {
      const pillarIndex = i % pillars.length;
      const role = selectRoleForArticle(roleDistribution, i);
      defaultArticles.push({
        title: `${pillars[pillarIndex].name} Guide ${i + 1}`,
        keywords: [site.industry || "business", "guide"],
        role,
        pillarId: pillars[pillarIndex].id,
      });
    }
    return defaultArticles;
  }
  
  const validPillarIds = new Set(pillars.map(p => p.id));
  
  return result.articles.map((a: ArticlePlan, i: number) => {
    let pillarId = a.pillarId;
    
    if (!pillarId || !validPillarIds.has(pillarId)) {
      pillarId = pillars[i % pillars.length].id;
      if (a.pillarId) {
        console.log(`[Monthly Content] Invalid pillarId "${a.pillarId}" from AI, assigning to "${pillars[i % pillars.length].name}" instead`);
      }
    }
    
    return {
      ...a,
      pillarId,
    };
  });
}

export async function generateArticleContent(
  articlePlan: ArticlePlan,
  site: Site,
  pillar: Pillar,
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

  const pillarContext = `This article belongs to the "${pillar.name}" content pillar. ${pillar.description || ""}`;

  const prompt = buildRoleSpecificPrompt(
    articlePlan.role,
    "authority",
    articlePlan.title,
    articlePlan.keywords,
    linkTargets,
    languageDirective,
    pillarContext,
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

async function getOrCreateAutomationPillars(site: Site): Promise<Pillar[]> {
  const existingPillars = await storage.getPillarsBySiteId(site.id);
  
  const automationPillars = existingPillars.filter(
    p => p.isAutomation && p.status !== "completed" && (p.generatedCount || 0) < (p.maxArticles || MAX_ARTICLES_PER_PILLAR)
  );
  
  if (automationPillars.length > 0) {
    console.log(`[Monthly Content] Found ${automationPillars.length} active automation pillars for site ${site.id}`);
    return automationPillars;
  }
  
  console.log(`[Monthly Content] No active automation pillars found, creating ${INITIAL_PILLAR_COUNT} new ones`);
  
  const pillarPlans = await generateInitialPillars(site);
  const newPillars: Pillar[] = [];
  
  for (const plan of pillarPlans) {
    const pillar = await storage.createPillar({
      siteId: site.id,
      name: plan.name,
      description: plan.description,
      status: "generating",
      packType: "authority",
      targetArticleCount: MAX_ARTICLES_PER_PILLAR,
      targetLanguage: site.displayLanguage || "en",
      defaultPostStatus: "draft",
      isAutomation: true,
      maxArticles: MAX_ARTICLES_PER_PILLAR,
    });
    newPillars.push(pillar);
  }
  
  console.log(`[Monthly Content] Created ${newPillars.length} automation pillars for site ${site.id}`);
  return newPillars;
}

async function generateReplacementPillars(
  site: Site,
  existingPillarNames: Set<string>,
  count: number
): Promise<PillarPlan[]> {
  const lang = getLanguageForPrompt(site.displayLanguage || "en");
  const languageDirective = buildLanguageDirective(lang);
  
  const businessContext = [
    site.businessDescription ? `Business: ${site.businessDescription}` : "",
    site.targetAudience ? `Target Audience: ${site.targetAudience}` : "",
    site.industry ? `Industry: ${site.industry}` : "",
  ].filter(Boolean).join("\n");

  const existingList = Array.from(existingPillarNames).join(", ");

  const prompt = `You are an SEO content strategist creating new content pillars to replace completed ones.

${languageDirective}

BUSINESS CONTEXT:
${businessContext || "General business blog"}

EXISTING/COMPLETED PILLARS (do NOT repeat these themes):
${existingList || "None yet"}

Create exactly ${count} NEW and DISTINCT content pillars. Each should:
- Cover a different aspect of the business than existing pillars
- Be broad enough to support 50-100 articles
- NOT duplicate or overlap with existing pillar themes

Respond with valid JSON:
{
  "pillars": [
    {
      "name": "Short pillar name (3-5 words)",
      "description": "Brief description of what this pillar covers"
    }
  ]
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    if (result.pillars && Array.isArray(result.pillars)) {
      return result.pillars.filter((p: PillarPlan) => 
        !existingPillarNames.has(p.name.toLowerCase())
      ).slice(0, count);
    }
  } catch (error) {
    console.error("[Monthly Content] Error generating replacement pillars:", error);
  }
  
  const fallbackPillars: PillarPlan[] = [];
  const industry = site.industry || "business";
  const timestamp = Date.now();
  for (let i = 0; i < count; i++) {
    fallbackPillars.push({
      name: `${industry} Insights ${i + 1} (${timestamp})`,
      description: `Fresh perspectives on ${industry}`,
    });
  }
  return fallbackPillars;
}

async function checkAndRotatePillars(site: Site, pillars: Pillar[]): Promise<Pillar[]> {
  const activePillars: Pillar[] = [];
  
  const allPillars = await storage.getPillarsBySiteId(site.id);
  const existingPillarNames = new Set(allPillars.map(p => p.name.toLowerCase()));
  
  for (const pillar of pillars) {
    const articleCount = pillar.generatedCount || 0;
    const maxArticles = pillar.maxArticles || MAX_ARTICLES_PER_PILLAR;
    
    if (articleCount >= maxArticles) {
      await storage.updatePillar(pillar.id, {
        status: "completed",
        completedAt: new Date(),
      });
      console.log(`[Monthly Content] Pillar "${pillar.name}" reached ${maxArticles} articles, marking as complete`);
    } else {
      activePillars.push(pillar);
    }
  }
  
  const pillarsNeeded = INITIAL_PILLAR_COUNT - activePillars.length;
  
  if (pillarsNeeded > 0) {
    console.log(`[Monthly Content] Creating ${pillarsNeeded} replacement pillar(s) for completed ones`);
    const newPillarPlans = await generateReplacementPillars(site, existingPillarNames, pillarsNeeded);
    
    for (const plan of newPillarPlans) {
      if (existingPillarNames.has(plan.name.toLowerCase())) {
        plan.name = `${plan.name} (new)`;
      }
      
      const pillar = await storage.createPillar({
        siteId: site.id,
        name: plan.name,
        description: plan.description,
        status: "generating",
        packType: "authority",
        targetArticleCount: MAX_ARTICLES_PER_PILLAR,
        targetLanguage: site.displayLanguage || "en",
        defaultPostStatus: "draft",
        isAutomation: true,
        maxArticles: MAX_ARTICLES_PER_PILLAR,
      });
      activePillars.push(pillar);
      existingPillarNames.add(plan.name.toLowerCase());
      console.log(`[Monthly Content] Created replacement pillar: "${pillar.name}"`);
    }
  }
  
  return activePillars;
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
    
    const totalArticleCount = Math.max(4, Math.min(postsPerSite, 40));

    let pillars = await getOrCreateAutomationPillars(site);
    
    pillars = await checkAndRotatePillars(site, pillars);
    
    if (pillars.length === 0) {
      return { success: false, articlesCreated: 0, error: "No active pillars available" };
    }

    const articlesPerPillar = Math.ceil(totalArticleCount / pillars.length);
    
    console.log(`[Monthly Content] Generating ${totalArticleCount} articles across ${pillars.length} pillars for site ${siteId}`);

    const articlePlans = await generateArticlesForPillars(pillars, site, articlesPerPillar);
    
    if (!articlePlans || articlePlans.length === 0) {
      return { success: false, articlesCreated: 0, error: "Failed to generate article plans" };
    }

    const limitedPlans = articlePlans.slice(0, totalArticleCount);
    
    const defaultAuthor = await storage.getDefaultAuthor(siteId);
    const publishDates = calculatePublishSchedule(limitedPlans.length);
    const articleTitles = limitedPlans.map(a => a.title);
    
    let createdCount = 0;
    const pillarCounts: Record<string, number> = {};

    for (let i = 0; i < limitedPlans.length; i++) {
      const articlePlan = limitedPlans[i];
      const pillar = pillars.find(p => p.id === articlePlan.pillarId) || pillars[0];
      const siblingTitles = articleTitles.filter((_, idx) => idx !== i);
      
      try {
        const article = await generateArticleContent(articlePlan, site, pillar, siblingTitles);
        
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
          pillarId: pillar.id,
        });

        createdCount++;
        pillarCounts[pillar.id] = (pillarCounts[pillar.id] || 0) + 1;
        
        console.log(`[Monthly Content] Created article ${i + 1}/${limitedPlans.length}: "${article.title}" (Pillar: ${pillar.name})`);
        
        await storage.updateUser(owner.id, {
          postsUsedThisMonth: (owner.postsUsedThisMonth || 0) + 1,
        });
      } catch (articleError) {
        console.error(`[Monthly Content] Failed to generate article ${i + 1}:`, articleError);
      }
    }

    for (const [pillarId, count] of Object.entries(pillarCounts)) {
      const pillar = pillars.find(p => p.id === pillarId);
      if (pillar) {
        await storage.updatePillar(pillarId, {
          generatedCount: (pillar.generatedCount || 0) + count,
        });
      }
    }

    console.log(`[Monthly Content] Completed for site ${siteId}. Created ${createdCount}/${limitedPlans.length} articles across ${pillars.length} pillars.`);

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
