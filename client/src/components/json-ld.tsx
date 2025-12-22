import { useMemo } from "react";
import type { Site, Post, SiteAuthor } from "@shared/schema";

interface JsonLdProps {
  site: Site;
  post?: Post;
  author?: SiteAuthor | null;
  pagePath?: string;
  currentTag?: string;
}

function getBaseUrl(site: Site): string {
  const protocol = "https";
  const basePath = site.basePath || "";
  return `${protocol}://${site.domain}${basePath}`;
}

function getPostUrl(site: Site, post: Post): string {
  const baseUrl = getBaseUrl(site);
  const postUrlFormat = site.postUrlFormat || "with-prefix";
  if (postUrlFormat === "root") {
    return `${baseUrl}/${post.slug}`;
  }
  return `${baseUrl}/post/${post.slug}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxLength / 2 ? truncated.substring(0, lastSpace) : truncated) + "...";
}

function escapeJsonLdString(str: string): string {
  return str.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function JsonLd({ site, post, author, currentTag }: JsonLdProps) {
  const jsonLdContent = useMemo(() => {
    const baseUrl = getBaseUrl(site);
    const schemas: object[] = [];

    if (post) {
      const postUrl = getPostUrl(site, post);
      const description = post.metaDescription || truncateText(stripHtml(post.content), 160);
      const datePublished = post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString();
      const dateModified = post.updatedAt ? new Date(post.updatedAt).toISOString() : datePublished;

      const articleSchema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Article",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": postUrl,
        },
        "headline": truncateText(post.metaTitle || post.title, 110),
        "description": description,
        "datePublished": datePublished,
        "dateModified": dateModified,
        "publisher": {
          "@type": "Organization",
          "name": site.title,
          "url": baseUrl,
        },
      };

      if (post.imageUrl) {
        articleSchema["image"] = {
          "@type": "ImageObject",
          "url": post.imageUrl,
        };
      }

      if (author) {
        articleSchema["author"] = {
          "@type": "Person",
          "name": author.name,
          "url": `${baseUrl}/author/${author.slug}`,
        };
        if (author.avatarUrl) {
          (articleSchema["author"] as Record<string, unknown>)["image"] = author.avatarUrl;
        }
      } else {
        articleSchema["author"] = {
          "@type": "Organization",
          "name": site.title,
          "url": baseUrl,
        };
      }

      if (site.logoUrl) {
        (articleSchema["publisher"] as Record<string, unknown>)["logo"] = {
          "@type": "ImageObject",
          "url": site.logoUrl,
        };
      }

      if (post.tags && post.tags.length > 0) {
        articleSchema["keywords"] = post.tags.join(", ");
      }

      schemas.push(articleSchema);

      const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": baseUrl,
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": post.title,
            "item": postUrl,
          },
        ],
      };
      schemas.push(breadcrumbSchema);

    } else if (currentTag) {
      const tagUrl = `${baseUrl}/tag/${encodeURIComponent(currentTag)}`;
      
      const collectionSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `${currentTag} - ${site.title}`,
        "description": `Articles tagged with ${currentTag} on ${site.title}`,
        "url": tagUrl,
        "isPartOf": {
          "@type": "WebSite",
          "name": site.title,
          "url": baseUrl,
        },
      };
      schemas.push(collectionSchema);

      const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": baseUrl,
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": currentTag,
            "item": tagUrl,
          },
        ],
      };
      schemas.push(breadcrumbSchema);

    } else {
      const websiteSchema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": site.metaTitle || site.title,
        "description": site.metaDescription || `Welcome to ${site.title}`,
        "url": baseUrl,
      };

      if (site.logoUrl) {
        websiteSchema["logo"] = site.logoUrl;
      }

      const templateSettings = site.templateSettings as Record<string, string> | null;
      const socialLinks: string[] = [];
      if (templateSettings?.socialTwitter) {
        socialLinks.push(`https://twitter.com/${templateSettings.socialTwitter.replace("@", "")}`);
      }
      if (templateSettings?.socialFacebook) {
        socialLinks.push(templateSettings.socialFacebook.startsWith("http") 
          ? templateSettings.socialFacebook 
          : `https://facebook.com/${templateSettings.socialFacebook}`);
      }
      if (templateSettings?.socialInstagram) {
        socialLinks.push(`https://instagram.com/${templateSettings.socialInstagram.replace("@", "")}`);
      }
      if (templateSettings?.socialLinkedin) {
        socialLinks.push(templateSettings.socialLinkedin.startsWith("http")
          ? templateSettings.socialLinkedin
          : `https://linkedin.com/company/${templateSettings.socialLinkedin}`);
      }
      if (socialLinks.length > 0) {
        websiteSchema["sameAs"] = socialLinks;
      }

      schemas.push(websiteSchema);

      const orgSchema: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": site.title,
        "url": baseUrl,
      };
      if (site.logoUrl) {
        orgSchema["logo"] = site.logoUrl;
      }
      if (socialLinks.length > 0) {
        orgSchema["sameAs"] = socialLinks;
      }
      schemas.push(orgSchema);
    }

    if (schemas.length === 0) {
      return null;
    }

    const jsonString = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
    return escapeJsonLdString(jsonString);
  }, [
    site.id, 
    site.domain, 
    site.basePath, 
    site.title, 
    site.metaTitle, 
    site.metaDescription, 
    site.logoUrl, 
    site.postUrlFormat, 
    site.templateSettings, 
    post?.id, 
    post?.slug, 
    post?.title, 
    post?.content, 
    post?.imageUrl, 
    post?.tags, 
    post?.createdAt, 
    post?.updatedAt, 
    post?.metaTitle, 
    post?.metaDescription, 
    author?.id, 
    author?.name, 
    author?.slug, 
    author?.avatarUrl, 
    currentTag
  ]);

  if (!jsonLdContent) {
    return null;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdContent }}
    />
  );
}
