import OpenAI from "openai";
import { storage } from "./storage";
import { searchPexelsImage } from "./pexels";
import { buildLanguageDirective, getLanguageForPrompt } from "./language-utils";
import type { Pillar, PillarArticle, InsertPillarArticle, InsertCluster } from "@shared/schema";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

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

  const prompt = `You are an SEO expert creating a topical authority map for the topic: "${pillar.name}"

${languageDirective}

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
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 16384,
    });

    const result: TopicalMapResult = JSON.parse(response.choices[0].message.content || "{}");

    // Clear any existing clusters and articles for this pillar
    await storage.deletePillarArticlesByPillarId(pillar.id);
    await storage.deleteClustersByPillarId(pillar.id);

    // Create pillar article first
    const pillarArticle: InsertPillarArticle = {
      pillarId: pillar.id,
      clusterId: null,
      title: result.pillarArticle.title,
      slug: slugify(result.pillarArticle.title),
      keywords: result.pillarArticle.keywords,
      articleType: "pillar",
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

      // Create category article
      const categoryArticle: InsertPillarArticle = {
        pillarId: pillar.id,
        clusterId: createdCluster.id,
        title: `${category.name}: A Complete Guide`,
        slug: slugify(category.name),
        keywords: [category.name.toLowerCase()],
        articleType: "category",
        status: "pending",
        sortOrder: sortOrder++,
      };
      await storage.createPillarArticle(categoryArticle);
      totalArticles++;

      // Create subtopic articles
      const subtopicArticles: InsertPillarArticle[] = category.articles.map((article, j) => ({
        pillarId: pillar.id,
        clusterId: createdCluster.id,
        title: article.title,
        slug: slugify(article.title),
        keywords: article.keywords,
        articleType: "subtopic" as const,
        status: "pending" as const,
        sortOrder: sortOrder++,
      }));

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
  parentArticle?: PillarArticle
): Promise<GeneratedArticle> {
  // Build context about related articles for internal linking
  // Use /post/ prefix for canonical URLs (basePath is added at runtime)
  const relatedArticlesInfo = siblingArticles
    .filter(a => a.id !== article.id && a.status === "completed" && a.postId)
    .slice(0, 5)
    .map(a => `- "${a.title}" (/post/${a.slug})`)
    .join("\n");

  const parentInfo = parentArticle
    ? `Parent topic: "${parentArticle.title}" (/post/${parentArticle.slug})`
    : "";

  let articleTypeContext = "";
  if (article.articleType === "pillar") {
    articleTypeContext = "This is the main PILLAR article - it should provide a comprehensive overview of the entire topic and link to category pages.";
  } else if (article.articleType === "category") {
    articleTypeContext = "This is a CATEGORY article - it should cover this subtopic comprehensively and link to both the pillar article and related subtopic articles.";
  } else {
    articleTypeContext = "This is a SUBTOPIC article - it should be detailed and focused on this specific long-tail topic, linking to the parent category and pillar.";
  }

  const lang = getLanguageForPrompt(pillar.targetLanguage);
  const languageDirective = buildLanguageDirective(lang);

  const prompt = `${pillar.masterPrompt || ""}

${languageDirective}

Write a comprehensive, SEO-optimized blog post.

Topic: ${article.title}
Target keywords: ${article.keywords.join(", ")}

${articleTypeContext}

${parentInfo}

${relatedArticlesInfo ? `Related articles to consider linking to:\n${relatedArticlesInfo}` : ""}

IMPORTANT FORMATTING RULES:
1. Write in Markdown format with proper structure:
   - Use # for the main title
   - Use ## for major sections
   - Use ### for subsections
   - Use bullet points and numbered lists
   - Use **bold** and *italics* for emphasis

2. INTERNAL LINKING:
   - Naturally incorporate internal links to related articles
   - Use descriptive anchor text (not "click here")
   - Format links as: [anchor text](/post/slug)
   ${parentArticle ? `- Link back to the parent article: [${parentArticle.title}](/post/${parentArticle.slug})` : ""}

3. Make the content:
   - 1500-2500 words for pillar/category articles
   - 800-1500 words for subtopic articles
   - Informative and valuable to readers
   - Naturally incorporate target keywords

Respond with valid JSON:
{
  "title": "The optimized article title",
  "content": "The full article content in Markdown",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "metaTitle": "SEO title (50-60 chars)",
  "metaDescription": "Meta description (150-160 chars)"
}`;

  const response = await openai.chat.completions.create({
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

    // Generate content
    const generated = await generatePillarArticleContent(article, pillar, siblingArticles, parentArticle);

    // Fetch image
    const imageUrl = await searchPexelsImage(article.keywords[0] || article.title);

    // Get default author for this site
    const defaultAuthor = await storage.getDefaultAuthor(pillar.siteId);

    // Create post
    const post = await storage.createPost({
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
    });

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
