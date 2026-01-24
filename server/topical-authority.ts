import OpenAI from "openai";
import { storage } from "./storage";
import { searchPexelsImage } from "./pexels";
import { buildLanguageDirective, getLanguageForPrompt } from "./language-utils";
import { buildRoleSpecificPrompt, type LinkTarget } from "./role-prompts";
import type { BusinessContext } from "./openai";
import type { Pillar, PillarArticle, InsertPillarArticle, InsertCluster, ArticleRole, Site } from "@shared/schema";
import { PACK_DEFINITIONS, type PackType, getPackRoleDistribution, selectRoleForArticle, getPackDefinition } from "@shared/pack-definitions";

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

function buildBusinessContextForMap(context: BusinessContext): string {
  const lines: string[] = [];
  
  if (context.businessDescription) {
    lines.push(`Business: ${context.businessDescription}`);
  }
  if (context.targetAudience) {
    lines.push(`Target Audience: ${context.targetAudience}`);
  }
  if (context.brandVoice) {
    lines.push(`Brand Voice: ${context.brandVoice}`);
  }
  if (context.valuePropositions) {
    lines.push(`Value Propositions: ${context.valuePropositions}`);
  }
  if (context.industry) {
    lines.push(`Industry: ${context.industry}`);
  }
  if (context.competitors) {
    lines.push(`Competitors: ${context.competitors}`);
  }
  
  if (lines.length === 0) return "";
  
  return `
BUSINESS CONTEXT (use this to align content with brand and audience):
${lines.join("\n")}
`;
}

let openai: OpenAI | null = null;

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

interface TopicalMapCategory {
  name: string;
  description: string;
  articles: {
    title: string;
    keywords: string[];
  }[];
}

interface TopicalMapResult {
  pillarArticle: {
    title: string;
    keywords: string[];
  };
  categories: TopicalMapCategory[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 100);
}

export async function generateTopicalMap(pillar: Pillar): Promise<{
  success: boolean;
  pillar: Pillar;
  totalArticles: number;
  categories: number;
}> {
  const targetCount = pillar.targetArticleCount;
  const categoriesCount = Math.min(8, Math.max(3, Math.ceil(targetCount / 20)));
  const articlesPerCategory = Math.ceil((targetCount - 1 - categoriesCount) / categoriesCount);
  const lang = getLanguageForPrompt(pillar.targetLanguage);
  const languageDirective = buildLanguageDirective(lang);

  // Get business context from site
  const site = await storage.getSiteById(pillar.siteId);
  const businessContext = site ? extractBusinessContext(site) : {};
  const businessContextPrompt = buildBusinessContextForMap(businessContext);

  const prompt = `You are an SEO expert creating a topical authority map for the topic: "${pillar.name}"

${languageDirective}
${businessContextPrompt}
${pillar.description ? `Topic description: ${pillar.description}` : ""}
${pillar.masterPrompt ? `Additional context: ${pillar.masterPrompt}` : ""}

Create a comprehensive topical map with:
1. ONE pillar article (broad overview covering the entire topic)
2. ${categoriesCount} category pages (major subtopics)
3. Approximately ${articlesPerCategory} subtopic articles per category (targeting long-tail keywords)

For each article, provide:
- A compelling, SEO-friendly title
- 2-3 target keywords

The total should be around ${targetCount} articles.

Focus on:
- High search volume keywords
- Long-tail keywords with ranking potential
- Comprehensive topic coverage
- Logical hierarchy for internal linking

Respond with valid JSON in this exact structure:
{
  "pillarArticle": {
    "title": "The Ultimate Guide to [Topic]",
    "keywords": ["main keyword", "secondary keyword"]
  },
  "categories": [
    {
      "name": "Category Name",
      "description": "Brief description of this category",
      "articles": [
        {
          "title": "Article Title",
          "keywords": ["keyword1", "keyword2"]
        }
      ]
    }
  ]
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 16384,
    });

    const result: TopicalMapResult = JSON.parse(response.choices[0].message.content || "{}");

    // Clear any existing clusters and articles for this pillar
    await storage.deletePillarArticlesByPillarId(pillar.id);
    await storage.deleteClustersByPillarId(pillar.id);

    // Get pack configuration for role assignment
    const packType = (pillar.packType as PackType) || "authority";
    const packDef = PACK_DEFINITIONS[packType];
    const roleDistribution = getPackRoleDistribution(packDef.defaultRoleDistribution);
    let roleIndex = 0;

    // Create pillar article first - pillar role for the main pillar article
    const pillarRole: ArticleRole = "pillar";
    
    const pillarArticle: InsertPillarArticle = {
      pillarId: pillar.id,
      clusterId: null,
      title: result.pillarArticle.title,
      slug: slugify(result.pillarArticle.title),
      keywords: result.pillarArticle.keywords,
      articleType: "pillar",
      articleRole: pillarRole,
      status: "pending",
      sortOrder: 0,
    };
    await storage.createPillarArticle(pillarArticle);

    let totalArticles = 1;
    let sortOrder = 1;

    // Create clusters and their articles
    for (let i = 0; i < result.categories.length; i++) {
      const category = result.categories[i];

      // Create cluster
      const cluster: InsertCluster = {
        pillarId: pillar.id,
        name: category.name,
        description: category.description,
        sortOrder: i,
        articleCount: category.articles.length + 1, // +1 for category article
        generatedCount: 0,
      };
      const createdCluster = await storage.createCluster(cluster);

      // Create category article - assign a role from the pack distribution
      const categoryRole = selectRoleForArticle(roleDistribution, roleIndex++);
      const categoryArticle: InsertPillarArticle = {
        pillarId: pillar.id,
        clusterId: createdCluster.id,
        title: `${category.name}: A Complete Guide`,
        slug: slugify(category.name),
        keywords: [category.name.toLowerCase()],
        articleType: "category",
        articleRole: categoryRole,
        status: "pending",
        sortOrder: sortOrder++,
      };
      await storage.createPillarArticle(categoryArticle);
      totalArticles++;

      // Create subtopic articles - assign roles from the pack distribution
      const subtopicArticles: InsertPillarArticle[] = category.articles.map((article, j) => {
        const articleRole = selectRoleForArticle(roleDistribution, roleIndex++);
        return {
          pillarId: pillar.id,
          clusterId: createdCluster.id,
          title: article.title,
          slug: slugify(article.title),
          keywords: article.keywords,
          articleType: "subtopic" as const,
          articleRole: articleRole,
          status: "pending" as const,
          sortOrder: sortOrder++,
        };
      });

      await storage.createPillarArticles(subtopicArticles);
      totalArticles += subtopicArticles.length;
    }

    // Update pillar status to mapped
    const updatedPillar = await storage.updatePillar(pillar.id, {
      status: "mapped",
      targetArticleCount: totalArticles,
    });

    return {
      success: true,
      pillar: updatedPillar!,
      totalArticles,
      categories: result.categories.length,
    };
  } catch (error) {
    console.error("Error generating topical map:", error);
    await storage.updatePillar(pillar.id, { status: "failed" });
    throw error;
  }
}

interface GeneratedArticle {
  title: string;
  content: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
}

export async function generatePillarArticleContent(
  article: PillarArticle,
  pillar: Pillar,
  siblingArticles: PillarArticle[],
  parentArticle?: PillarArticle,
  businessContext?: BusinessContext
): Promise<GeneratedArticle> {
  const lang = getLanguageForPrompt(pillar.targetLanguage);
  const languageDirective = buildLanguageDirective(lang);
  
  // Get pack configuration
  const packType = (pillar.packType as PackType) || "authority";
  const packDef = getPackDefinition(packType);
  
  // Get the article's role
  const articleRole = (article.articleRole as ArticleRole) || "general";
  
  // Build link targets based on pack linking rules
  // Since we have the full topical map with all slugs defined upfront,
  // we link to ALL articles regardless of their generation status.
  // Links to pending articles will work once those articles are generated.
  const relevantRule = packDef.linkingRules.find(r => r.fromRole === articleRole);
  const targetRoles = relevantRule?.toRoles || [];
  
  // Get articles that match target roles for linking (any status - slugs are predefined)
  let linkTargets: LinkTarget[] = siblingArticles
    .filter(a => 
      a.id !== article.id && 
      targetRoles.includes(a.articleRole as ArticleRole)
    )
    .slice(0, 5)
    .map(a => ({
      title: a.title,
      slug: a.slug,
      role: (a.articleRole as ArticleRole) || "general",
      anchorPattern: relevantRule?.anchorPattern || "semantic",
    }));
  
  // If no articles match target roles, fall back to any articles in the pillar
  // This ensures internal linking even when pack rules can't be satisfied
  if (linkTargets.length === 0) {
    linkTargets = siblingArticles
      .filter(a => a.id !== article.id)
      .slice(0, 5)
      .map(a => ({
        title: a.title,
        slug: a.slug,
        role: (a.articleRole as ArticleRole) || "general",
        anchorPattern: "semantic",
      }));
  }
  
  // Add parent article as link target if applicable (regardless of completion status)
  if (parentArticle) {
    // Avoid duplicates
    if (!linkTargets.some(t => t.slug === parentArticle.slug)) {
      linkTargets.unshift({
        title: parentArticle.title,
        slug: parentArticle.slug,
        role: (parentArticle.articleRole as ArticleRole) || "pillar",
        anchorPattern: relevantRule?.anchorPattern || "semantic",
      });
    }
  }
  
  // Build the role-specific prompt with business context
  const prompt = buildRoleSpecificPrompt(
    articleRole,
    packType,
    article.title,
    article.keywords,
    linkTargets,
    languageDirective,
    pillar.masterPrompt || "",
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
    title: result.title || article.title,
    content: result.content || "",
    tags: Array.isArray(result.tags) ? result.tags : article.keywords,
    metaTitle: result.metaTitle || result.title || article.title,
    metaDescription: result.metaDescription || "",
  };
}

export async function processNextPillarArticle(pillar: Pillar): Promise<{
  success: boolean;
  article?: PillarArticle;
  postId?: string;
  error?: string;
}> {
  let articleId: string | null = null;
  
  try {
    // Get next pending article
    const article = await storage.getNextPendingPillarArticle(pillar.id);
    if (!article) {
      // No more articles, mark pillar as completed
      await storage.updatePillar(pillar.id, {
        status: "completed",
        completedAt: new Date(),
      });
      return { success: true };
    }

    // Track article ID for error recovery
    articleId = article.id;

    // Update article status to generating
    await storage.updatePillarArticle(article.id, { status: "generating" });

    // Get related articles for context
    const allArticles = await storage.getPillarArticlesByPillarId(pillar.id);
    const siblingArticles = article.clusterId
      ? allArticles.filter(a => a.clusterId === article.clusterId)
      : allArticles.filter(a => a.articleType === "category" || a.articleType === "pillar");

    // Get parent article
    let parentArticle: PillarArticle | undefined;
    if (article.articleType === "subtopic" && article.clusterId) {
      parentArticle = allArticles.find(a => a.clusterId === article.clusterId && a.articleType === "category");
    } else if (article.articleType === "category") {
      parentArticle = allArticles.find(a => a.articleType === "pillar");
    }

    // Get business context from site
    const site = await storage.getSiteById(pillar.siteId);
    const businessContext = site ? extractBusinessContext(site) : undefined;

    // Generate content with business context
    const generated = await generatePillarArticleContent(article, pillar, siblingArticles, parentArticle, businessContext);

    // Fetch image with fallback queries for variety
    // Use all keywords and title as fallback options
    const fallbackQueries = [
      ...article.keywords.slice(1), // Additional keywords after the first
      article.title,
      pillar.name, // Pillar name as final fallback
    ].filter(Boolean);
    const imageUrl = await searchPexelsImage(article.keywords[0] || article.title, fallbackQueries);

    // Get default author for this site
    const defaultAuthor = await storage.getDefaultAuthor(pillar.siteId);

    // Create post with article role for role-specific JSON-LD generation
    const createResult = await storage.createPostWithLimitCheck({
      siteId: pillar.siteId,
      authorId: defaultAuthor?.id || null,
      title: generated.title,
      slug: article.slug,
      content: generated.content,
      imageUrl: imageUrl || undefined,
      tags: generated.tags,
      source: "topical-authority",
      metaTitle: generated.metaTitle,
      metaDescription: generated.metaDescription,
      articleRole: article.articleRole || "general",
      status: pillar.defaultPostStatus || "published",
    });

    if (createResult.error) {
      console.log(`[Topical Authority] Skipped article ${article.id}: ${createResult.error} (${createResult.code})`);
      // Mark article as failed due to limit
      await storage.updatePillarArticle(article.id, {
        status: "failed",
      });
      return null;
    }

    const post = createResult.post!;

    // Update article with post reference
    await storage.updatePillarArticle(article.id, {
      status: "completed",
      postId: post.id,
      generatedAt: new Date(),
      publishedAt: new Date(),
    });

    // Update pillar stats
    const currentPillar = await storage.getPillarById(pillar.id);
    if (currentPillar) {
      await storage.updatePillar(pillar.id, {
        generatedCount: currentPillar.generatedCount + 1,
      });
    }

    // Update cluster stats if applicable
    if (article.clusterId) {
      const cluster = await storage.getClusterById(article.clusterId);
      if (cluster) {
        await storage.updateCluster(cluster.id, {
          generatedCount: cluster.generatedCount + 1,
        });
      }
    }

    return {
      success: true,
      article,
      postId: post.id,
    };
  } catch (error) {
    console.error("Error processing pillar article:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Handle retry logic for failed articles
    if (articleId) {
      try {
        const article = await storage.getPillarArticleById(articleId);
        if (article) {
          const newRetryCount = (article.retryCount || 0) + 1;
          const maxRetries = 3;
          
          if (newRetryCount >= maxRetries) {
            // Mark as permanently failed after max retries
            await storage.updatePillarArticle(articleId, {
              status: "failed",
              error: errorMessage,
              retryCount: newRetryCount,
            });
            console.log(`[Pillar] Article ${articleId} marked as failed after ${newRetryCount} attempts`);
            
            // Update pillar failed count
            const currentPillar = await storage.getPillarById(pillar.id);
            if (currentPillar) {
              await storage.updatePillar(pillar.id, {
                failedCount: currentPillar.failedCount + 1,
              });
            }
          } else {
            // Reset to pending for retry on next scheduler tick
            await storage.updatePillarArticle(articleId, {
              status: "pending",
              error: errorMessage,
              retryCount: newRetryCount,
            });
            console.log(`[Pillar] Article ${articleId} reset to pending (attempt ${newRetryCount}/${maxRetries})`);
          }
        }
      } catch (resetError) {
        console.error(`[Pillar] Failed to update article status:`, resetError);
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
