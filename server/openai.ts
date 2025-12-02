// Referenced from javascript_openai_ai_integrations blueprint
import OpenAI from "openai";
import { searchPexelsImage } from "./pexels";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export async function generateAIPost(masterPrompt: string, keyword: string): Promise<{ title: string; content: string; tags: string[]; imageUrl?: string }> {
  const prompt = `${masterPrompt}\n\nWrite a compelling blog post about: ${keyword}\n\nProvide the response in JSON format with the following structure:\n{\n  "title": "The post title",\n  "content": "The full post content",\n  "tags": ["tag1", "tag2", "tag3"]\n}`;

  const response = await openai.chat.completions.create({
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
  };
}

export async function rewriteArticle(originalContent: string, originalTitle: string): Promise<{ title: string; content: string; tags: string[]; imageUrl?: string }> {
  const prompt = `Rewrite the following article to make it completely unique while preserving the key information. Make it engaging and well-written.\n\nOriginal Title: ${originalTitle}\n\nOriginal Content:\n${originalContent}\n\nProvide the response in JSON format with the following structure:\n{\n  "title": "The rewritten title",\n  "content": "The rewritten content",\n  "tags": ["tag1", "tag2", "tag3"]\n}`;

  const response = await openai.chat.completions.create({
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
  };
}
