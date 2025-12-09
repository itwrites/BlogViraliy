import type { Site } from "@shared/schema";

/**
 * Generate the URL path for a post based on the site's postUrlFormat setting.
 * 
 * @param slug - The post slug
 * @param site - The site object containing the postUrlFormat setting
 * @returns The URL path for the post (e.g., "/post/my-article" or "/my-article")
 */
export function getPostUrl(slug: string, site: Site): string {
  const format = site.postUrlFormat || "with-prefix";
  
  if (format === "root") {
    return `/${slug}`;
  }
  
  return `/post/${slug}`;
}

/**
 * Get the canonical post URL pattern for a site.
 * Useful for determining which format is the "correct" one for redirects.
 * 
 * @param site - The site object
 * @returns "with-prefix" or "root"
 */
export function getPostUrlFormat(site: Site): "with-prefix" | "root" {
  return (site.postUrlFormat as "with-prefix" | "root") || "with-prefix";
}

/**
 * Check if a given path matches a post URL in either format.
 * Returns the slug if it matches, or null if not.
 * 
 * @param path - The URL path to check
 * @returns The post slug or null
 */
export function extractPostSlug(path: string): string | null {
  // Remove leading slash and any query string
  const cleanPath = path.replace(/^\//, "").split("?")[0].split("#")[0];
  
  // Check for /post/slug format
  if (cleanPath.startsWith("post/")) {
    return cleanPath.slice(5) || null;
  }
  
  // For root format, the entire path (minus leading slash) is the slug
  // But we need to exclude known routes like /tag/, /topics/, /admin, /editor, etc.
  const reservedPaths = ["tag", "topics", "admin", "editor", "api", "bv_api"];
  const firstSegment = cleanPath.split("/")[0];
  
  if (!firstSegment || reservedPaths.includes(firstSegment)) {
    return null;
  }
  
  // Check if there are no additional path segments (single-level path)
  if (!cleanPath.includes("/")) {
    return cleanPath;
  }
  
  return null;
}
