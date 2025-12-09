// Referenced from javascript_openai_ai_integrations blueprint
import OpenAI from "openai";
import { searchPexelsImage } from "./pexels";
import { buildLanguageDirective, getLanguageForPrompt } from "./language-utils";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
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

interface AIPostResult {
  title: string;
  content: string;
  tags: string[];
  imageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export async function generateAIPost(masterPrompt: string, keyword: string, targetLanguage?: string): Promise<AIPostResult> {
  const lang = getLanguageForPrompt(targetLanguage);
  const languageDirective = buildLanguageDirective(lang);
  
  const prompt = `${masterPrompt}

${languageDirective}

Write a compelling blog post about: ${keyword}

IMPORTANT: Write the content in Markdown format with proper formatting:
- Use # for main headings, ## for subheadings, ### for smaller sections
- Use **bold** for emphasis and *italics* where appropriate
- Use bullet points (-) or numbered lists (1.) for lists
- Use > for blockquotes
- Use \`code\` for inline code if relevant
- Use paragraphs with blank lines between them

Also generate SEO-optimized metadata for this post.

Provide the response in JSON format with the following structure:
{
  "title": "The post title (compelling and SEO-friendly)",
  "content": "The full post content in Markdown format",
  "tags": ["tag1", "tag2", "tag3"],
  "metaTitle": "SEO title (50-60 characters, keyword-rich)",
  "metaDescription": "SEO description (150-160 characters, compelling call-to-action)"
}`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 8192,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  const title = result.title || `Post about ${keyword}`;
  
  // Fetch image from Pexels
  const imageUrl = await searchPexelsImage(keyword);
  
  return {
    title,
    content: result.content || "",
    tags: Array.isArray(result.tags) ? result.tags : [keyword],
    imageUrl: imageUrl || undefined,
    metaTitle: result.metaTitle || title,
    metaDescription: result.metaDescription || undefined,
  };
}

export async function rewriteArticle(originalContent: string, originalTitle: string, targetLanguage?: string): Promise<AIPostResult> {
  const lang = getLanguageForPrompt(targetLanguage);
  const { buildTranslationDirective } = await import("./language-utils");
  const translationDirective = buildTranslationDirective(lang);
  
  const prompt = `Rewrite the following article to make it completely unique while preserving the key information. Make it engaging and well-written.

${translationDirective}

Original Title: ${originalTitle}

Original Content:
${originalContent}

IMPORTANT: Write the rewritten content in Markdown format with proper formatting:
- Use # for main headings, ## for subheadings, ### for smaller sections
- Use **bold** for emphasis and *italics* where appropriate
- Use bullet points (-) or numbered lists (1.) for lists
- Use > for blockquotes
- Use \`code\` for inline code if relevant
- Use paragraphs with blank lines between them

Also generate SEO-optimized metadata for this rewritten post.

Provide the response in JSON format with the following structure:
{
  "title": "The rewritten title (compelling and SEO-friendly)",
  "content": "The rewritten content in Markdown format",
  "tags": ["tag1", "tag2", "tag3"],
  "metaTitle": "SEO title (50-60 characters, keyword-rich)",
  "metaDescription": "SEO description (150-160 characters, compelling call-to-action)"
}`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 8192,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  const title = result.title || originalTitle;
  
  // Fetch image from Pexels using title keywords
  const imageUrl = await searchPexelsImage(title);
  
  return {
    title,
    content: result.content || originalContent,
    tags: Array.isArray(result.tags) ? result.tags : [],
    imageUrl: imageUrl || undefined,
    metaTitle: result.metaTitle || title,
    metaDescription: result.metaDescription || undefined,
  };
}
