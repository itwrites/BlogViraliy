import { parseDocument } from "htmlparser2";
import { Element } from "domhandler";
import render from "dom-serializer";

export interface SiteUrlConfig {
  basePath: string;
  postUrlFormat: "with-prefix" | "root";
  validSlugs?: Set<string>; // Optional set of valid slugs for validation
}

/**
 * Rewrites internal post links in content (Markdown/HTML) based on site URL configuration.
 * Transforms /post/slug to the correct format based on postUrlFormat and basePath.
 * 
 * If validSlugs is provided, links to non-existent posts are converted to plain text
 * (the anchor text is kept, but the link is removed).
 * 
 * Examples:
 * - postUrlFormat="root", basePath="" -> /slug
 * - postUrlFormat="root", basePath="/blog" -> /blog/slug
 * - postUrlFormat="with-prefix", basePath="" -> /post/slug
 * - postUrlFormat="with-prefix", basePath="/blog" -> /blog/post/slug
 */
export function rewriteInternalPostLinks(content: string, config: SiteUrlConfig): string {
  if (!content) return content;
  
  const { basePath, postUrlFormat, validSlugs } = config;
  
  // Pattern to match Markdown internal post links: [text](/post/slug)
  const markdownLinkPattern = /\[([^\]]+)\]\(\/post\/([a-z0-9-]+)\)/gi;
  
  // First pass: handle Markdown links
  let result = content.replace(markdownLinkPattern, (match, linkText, slug) => {
    // If validSlugs provided and slug is not valid, convert to plain text
    if (validSlugs && !validSlugs.has(slug)) {
      return linkText; // Just return the anchor text without the link
    }
    
    let newUrl: string;
    if (postUrlFormat === "root") {
      newUrl = basePath ? `${basePath}/${slug}` : `/${slug}`;
    } else {
      newUrl = basePath ? `${basePath}/post/${slug}` : `/post/${slug}`;
    }
    
    return `[${linkText}](${newUrl})`;
  });
  
  // Pattern to match HTML internal post links: href="/post/slug"
  const htmlLinkPattern = /(<a[^>]*href=["'])\/post\/([a-z0-9-]+)(["'][^>]*>)([^<]*)<\/a>/gi;
  
  // Second pass: handle HTML links
  result = result.replace(htmlLinkPattern, (match, prefix, slug, middle, linkText) => {
    // If validSlugs provided and slug is not valid, convert to plain text
    if (validSlugs && !validSlugs.has(slug)) {
      return linkText; // Just return the text without the link
    }
    
    let newUrl: string;
    if (postUrlFormat === "root") {
      newUrl = basePath ? `${basePath}/${slug}` : `/${slug}`;
    } else {
      newUrl = basePath ? `${basePath}/post/${slug}` : `/post/${slug}`;
    }
    
    return `${prefix}${newUrl}${middle}${linkText}</a>`;
  });
  
  // Also handle simple href attributes without full anchor context
  const simpleHrefPattern = /(\bhref=["'])\/post\/([a-z0-9-]+)(["'])/gi;
  result = result.replace(simpleHrefPattern, (match, prefix, slug, suffix) => {
    // If validSlugs provided and slug is not valid, keep original (can't easily remove in this context)
    if (validSlugs && !validSlugs.has(slug)) {
      return match; // Keep original - will result in 404 which is acceptable
    }
    
    let newUrl: string;
    if (postUrlFormat === "root") {
      newUrl = basePath ? `${basePath}/${slug}` : `/${slug}`;
    } else {
      newUrl = basePath ? `${basePath}/post/${slug}` : `/post/${slug}`;
    }
    
    return `${prefix}${newUrl}${suffix}`;
  });
  
  return result;
}

/**
 * Rewrites HTML content to prefix root-relative URLs with the given basePath.
 * This handles both attribute URLs (href, src, etc.) and inline script content.
 */
export function rewriteHtmlForBasePath(html: string, basePath: string): string {
  if (!basePath || basePath === "/") {
    return html;
  }

  // Parse the HTML
  const document = parseDocument(html);

  // URL attributes to check
  const urlAttributes = ["href", "src", "data-src", "action", "poster", "srcset"];

  // Walk all elements
  const walkNodes = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.type === "tag" || node.type === "script" || node.type === "style") {
        const element = node as Element;
        const attribs = element.attribs || {};

        // Rewrite URL attributes
        for (const attr of urlAttributes) {
          const value = attribs[attr];
          if (value && shouldRewriteUrl(value)) {
            attribs[attr] = rewriteUrl(value, basePath);
          }
        }

        // Handle srcset specially (comma-separated list of URLs)
        if (attribs["srcset"]) {
          attribs["srcset"] = rewriteSrcset(attribs["srcset"], basePath);
        }

        // Handle modulepreload links
        if (element.name === "link" && attribs["rel"]?.includes("modulepreload")) {
          const href = attribs["href"];
          if (href && shouldRewriteUrl(href)) {
            attribs["href"] = rewriteUrl(href, basePath);
          }
        }

        // Rewrite inline script content
        if (element.name === "script" && element.children) {
          for (const child of element.children) {
            if (child.type === "text" && child.data) {
              child.data = rewriteScriptContent(child.data, basePath);
            }
          }
        }

        // Recurse into children
        if (element.children) {
          walkNodes(element.children);
        }
      }
    }
  };

  walkNodes(document.children);

  // Serialize back to HTML
  return render(document, {
    decodeEntities: false,
    selfClosingTags: true,
  });
}

/**
 * Checks if a URL should be rewritten (root-relative paths for assets)
 */
function shouldRewriteUrl(url: string): boolean {
  if (!url) return false;
  
  // Skip absolute URLs, data URIs, and protocol-relative URLs
  if (url.startsWith("http://") || url.startsWith("https://") || 
      url.startsWith("data:") || url.startsWith("//") ||
      url.startsWith("mailto:") || url.startsWith("tel:") ||
      url.startsWith("#") || url.startsWith("javascript:")) {
    return false;
  }

  // Must be root-relative
  if (!url.startsWith("/")) {
    return false;
  }

  // Explicitly skip API and auth paths - these should NOT be rewritten
  if (url.startsWith("/api/") || url.startsWith("/auth/")) {
    return false;
  }

  // Rewrite Vite-generated paths
  if (url.startsWith("/assets/") ||
      url.startsWith("/src/") ||
      url.startsWith("/@") ||
      url.startsWith("/node_modules/") ||
      url.startsWith("/.vite/")) {
    return true;
  }

  // Rewrite common static files from client/public
  const staticFilePatterns = [
    /^\/favicon/,        // /favicon.ico, /favicon.png, /favicon.svg
    /^\/manifest/,       // /manifest.webmanifest, /manifest.json
    /^\/robots\.txt$/,   // /robots.txt
    /^\/sitemap/,        // /sitemap.xml
    /^\/apple-touch/,    // /apple-touch-icon.png
    /^\/og-/,            // /og-image.png, /og-card.png
    /^\/open-graph/,     // /open-graph.png
    /\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot)$/i,  // Static asset extensions
  ];

  for (const pattern of staticFilePatterns) {
    if (pattern.test(url)) {
      return true;
    }
  }

  return false;
}

/**
 * Rewrites a single URL to include the basePath
 */
function rewriteUrl(url: string, basePath: string): string {
  if (!url.startsWith("/")) {
    return url;
  }
  return basePath + url;
}

/**
 * Rewrites srcset attribute which contains comma-separated URLs
 */
function rewriteSrcset(srcset: string, basePath: string): string {
  return srcset.split(",").map(entry => {
    const parts = entry.trim().split(/\s+/);
    if (parts[0] && shouldRewriteUrl(parts[0])) {
      parts[0] = rewriteUrl(parts[0], basePath);
    }
    return parts.join(" ");
  }).join(", ");
}

/**
 * Rewrites URLs in inline script content
 * Targets: import statements, fetch calls, URL strings in quotes and template literals
 */
function rewriteScriptContent(script: string, basePath: string): string {
  // Rewrite quoted URL paths in script content
  // Matches: "/assets/...", '/src/...', "/@vite/...", etc.
  
  // Pattern for URLs in single/double quotes
  let result = script.replace(/(["'])\/(assets\/[^"']*)/g, `$1${basePath}/$2`);
  result = result.replace(/(["'])\/(src\/[^"']*)/g, `$1${basePath}/$2`);
  result = result.replace(/(["'])\/(@[^"']*)/g, `$1${basePath}/$2`);
  result = result.replace(/(["'])\/node_modules\/([^"']*)/g, `$1${basePath}/node_modules/$2`);
  result = result.replace(/(["'])\/(\.vite\/[^"']*)/g, `$1${basePath}/$2`);
  
  // Pattern for URLs in template literals (backticks)
  // Matches: `/${basePath}/assets/...`, `/@vite/client`, etc.
  result = result.replace(/(`)\/(assets\/[^`]*)/g, `$1${basePath}/$2`);
  result = result.replace(/(`)\/(src\/[^`]*)/g, `$1${basePath}/$2`);
  result = result.replace(/(`)\/([@][^`]*)/g, `$1${basePath}/$2`);
  result = result.replace(/(`)\/(node_modules\/[^`]*)/g, `$1${basePath}/$2`);
  result = result.replace(/(`)\/(\.vite\/[^`]*)/g, `$1${basePath}/$2`);
  
  // Handle __BASE__ and similar Vite variables that might reference root
  result = result.replace(/__BASE__\s*\+\s*["'`]\//g, `"${basePath}/`);
  
  return result;
}
