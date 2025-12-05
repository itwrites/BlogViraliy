import { storage } from "./storage";
import type { Site, Post } from "@shared/schema";

interface SitemapCache {
  xml: string;
  generatedAt: Date;
}

const sitemapCache = new Map<string, SitemapCache>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function generateSitemap(site: Site, baseUrl: string): Promise<string> {
  // Use site.id + baseUrl as cache key so different domains/aliases get their own cached sitemap
  const cacheKey = `${site.id}:${baseUrl}`;
  const cached = sitemapCache.get(cacheKey);
  
  // Return cached version if still valid
  if (cached && Date.now() - cached.generatedAt.getTime() < CACHE_TTL_MS) {
    return cached.xml;
  }

  // Get all published posts for this site
  const posts = await storage.getPublishedPostsBySiteId(site.id);
  
  // Get top tags for tag archive pages
  const topTags = await storage.getTopTags(site.id, 20);

  // Build the sitemap XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Add homepage
  const homepageDate = posts.length > 0 
    ? formatDate(posts[0].updatedAt) 
    : formatDate(new Date());
  
  xml += `  <url>
    <loc>${escapeXml(baseUrl)}/</loc>
    <lastmod>${homepageDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

  // Add all published posts
  for (const post of posts) {
    const postUrl = post.canonicalUrl || `${baseUrl}/post/${post.slug}`;
    xml += `  <url>
    <loc>${escapeXml(postUrl)}</loc>
    <lastmod>${formatDate(post.updatedAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  }

  // Add tag archive pages
  for (const tag of topTags) {
    const tagUrl = `${baseUrl}/tag/${encodeURIComponent(tag)}`;
    xml += `  <url>
    <loc>${escapeXml(tagUrl)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
  }

  xml += `</urlset>`;

  // Cache the result
  sitemapCache.set(cacheKey, {
    xml,
    generatedAt: new Date(),
  });

  return xml;
}

export function invalidateSitemapCache(siteId: string): void {
  // Clear all cache entries for this site (includes all domain variants)
  const keysToDelete: string[] = [];
  sitemapCache.forEach((_, key) => {
    if (key.startsWith(`${siteId}:`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => sitemapCache.delete(key));
}

export function clearAllSitemapCache(): void {
  sitemapCache.clear();
}

// Get sitemap stats for a site
export async function getSitemapStats(siteId: string): Promise<{
  postCount: number;
  tagCount: number;
  lastGenerated: Date | null;
}> {
  const posts = await storage.getPublishedPostsBySiteId(siteId);
  const tags = await storage.getTopTags(siteId, 20);
  
  // Find the most recent cache entry for this site (across all domain variants)
  let lastGenerated: Date | null = null;
  sitemapCache.forEach((cached, key) => {
    if (key.startsWith(`${siteId}:`)) {
      if (!lastGenerated || cached.generatedAt > lastGenerated) {
        lastGenerated = cached.generatedAt;
      }
    }
  });

  return {
    postCount: posts.length,
    tagCount: tags.length,
    lastGenerated,
  };
}
