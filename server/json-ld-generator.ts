import type { Post, Site, ArticleRole } from "@shared/schema";
import { getJsonLdSchemaConfig } from "@shared/pack-definitions";

interface JsonLdGeneratorContext {
  post: Post;
  site: Site;
  canonicalUrl: string;
  description: string;
  language: string;
}

export function generateRoleBasedJsonLd(ctx: JsonLdGeneratorContext): Record<string, unknown> {
  const { post, site, canonicalUrl, description, language } = ctx;
  const articleRole = (post.articleRole as ArticleRole) || "general";
  const schemaConfig = getJsonLdSchemaConfig(articleRole);
  
  const baseData = {
    "@context": "https://schema.org",
    "inLanguage": language,
  };
  
  switch (schemaConfig.schemaType) {
    case "Review":
      return generateReviewSchema(ctx, baseData);
    case "HowTo":
      return generateHowToSchema(ctx, baseData);
    case "FAQPage":
      return generateFAQSchema(ctx, baseData);
    case "ItemList":
      return generateItemListSchema(ctx, baseData);
    case "Product":
      return generateProductSchema(ctx, baseData);
    case "NewsArticle":
      return generateNewsArticleSchema(ctx, baseData);
    case "TechArticle":
      return generateTechArticleSchema(ctx, baseData);
    default:
      return generateArticleSchema(ctx, baseData);
  }
}

function generateArticleSchema(ctx: JsonLdGeneratorContext, baseData: Record<string, unknown>): Record<string, unknown> {
  const { post, site, canonicalUrl, description } = ctx;
  
  return {
    ...baseData,
    "@type": "Article",
    "headline": post.title,
    "description": description,
    "url": canonicalUrl,
    "datePublished": post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
    "dateModified": post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
    "image": post.ogImage || post.imageUrl || undefined,
    "author": {
      "@type": "Organization",
      "name": site.title
    },
    "publisher": {
      "@type": "Organization",
      "name": site.title,
      "logo": site.logoUrl ? {
        "@type": "ImageObject",
        "url": site.logoUrl
      } : undefined
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    "keywords": post.tags?.join(", ")
  };
}

function generateReviewSchema(ctx: JsonLdGeneratorContext, baseData: Record<string, unknown>): Record<string, unknown> {
  const { post, site, canonicalUrl, description } = ctx;
  
  const ratingInfo = extractRatingFromContent(post.content);
  
  return {
    ...baseData,
    "@type": "Review",
    "name": post.title,
    "reviewBody": description,
    "url": canonicalUrl,
    "datePublished": post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
    "author": {
      "@type": "Organization",
      "name": site.title
    },
    "publisher": {
      "@type": "Organization",
      "name": site.title
    },
    "itemReviewed": {
      "@type": "Thing",
      "name": extractReviewSubject(post.title)
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": ratingInfo.rating,
      "bestRating": "5",
      "worstRating": "1"
    }
  };
}

function generateHowToSchema(ctx: JsonLdGeneratorContext, baseData: Record<string, unknown>): Record<string, unknown> {
  const { post, site, canonicalUrl, description } = ctx;
  
  const steps = extractHowToSteps(post.content);
  
  return {
    ...baseData,
    "@type": "HowTo",
    "name": post.title,
    "description": description,
    "url": canonicalUrl,
    "datePublished": post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
    "image": post.ogImage || post.imageUrl || undefined,
    "author": {
      "@type": "Organization",
      "name": site.title
    },
    "step": steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name || `Step ${index + 1}`,
      "text": step.text
    }))
  };
}

function generateFAQSchema(ctx: JsonLdGeneratorContext, baseData: Record<string, unknown>): Record<string, unknown> {
  const { post, canonicalUrl, description } = ctx;
  
  const faqs = extractFAQs(post.content);
  
  return {
    ...baseData,
    "@type": "FAQPage",
    "name": post.title,
    "description": description,
    "url": canonicalUrl,
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

function generateItemListSchema(ctx: JsonLdGeneratorContext, baseData: Record<string, unknown>): Record<string, unknown> {
  const { post, site, canonicalUrl, description } = ctx;
  
  const items = extractListItems(post.content);
  
  return {
    ...baseData,
    "@type": "ItemList",
    "name": post.title,
    "description": description,
    "url": canonicalUrl,
    "numberOfItems": items.length,
    "itemListOrder": "https://schema.org/ItemListOrderDescending",
    "author": {
      "@type": "Organization",
      "name": site.title
    },
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "url": item.url || undefined
    }))
  };
}

function generateProductSchema(ctx: JsonLdGeneratorContext, baseData: Record<string, unknown>): Record<string, unknown> {
  const { post, site, canonicalUrl, description } = ctx;
  
  return {
    ...baseData,
    "@type": "Product",
    "name": post.title,
    "description": description,
    "url": canonicalUrl,
    "image": post.ogImage || post.imageUrl || undefined,
    "brand": {
      "@type": "Organization",
      "name": site.title
    }
  };
}

function generateNewsArticleSchema(ctx: JsonLdGeneratorContext, baseData: Record<string, unknown>): Record<string, unknown> {
  const { post, site, canonicalUrl, description } = ctx;
  
  return {
    ...baseData,
    "@type": "NewsArticle",
    "headline": post.title,
    "description": description,
    "url": canonicalUrl,
    "datePublished": post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
    "dateModified": post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
    "image": post.ogImage || post.imageUrl || undefined,
    "author": {
      "@type": "Organization",
      "name": site.title
    },
    "publisher": {
      "@type": "Organization",
      "name": site.title,
      "logo": site.logoUrl ? {
        "@type": "ImageObject",
        "url": site.logoUrl
      } : undefined
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    "articleSection": post.tags?.[0] || undefined
  };
}

function generateTechArticleSchema(ctx: JsonLdGeneratorContext, baseData: Record<string, unknown>): Record<string, unknown> {
  const { post, site, canonicalUrl, description } = ctx;
  
  return {
    ...baseData,
    "@type": "TechArticle",
    "headline": post.title,
    "description": description,
    "url": canonicalUrl,
    "datePublished": post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
    "dateModified": post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
    "image": post.ogImage || post.imageUrl || undefined,
    "author": {
      "@type": "Organization",
      "name": site.title
    },
    "publisher": {
      "@type": "Organization",
      "name": site.title,
      "logo": site.logoUrl ? {
        "@type": "ImageObject",
        "url": site.logoUrl
      } : undefined
    },
    "proficiencyLevel": "Beginner",
    "keywords": post.tags?.join(", ")
  };
}

function extractRatingFromContent(content: string): { rating: string } {
  const ratingPatterns = [
    /(\d(?:\.\d)?)\s*(?:out of|\/)\s*5/i,
    /rating[:\s]+(\d(?:\.\d)?)/i,
    /(\d(?:\.\d)?)\s*stars?/i,
    /score[:\s]+(\d(?:\.\d)?)/i,
  ];
  
  const plainText = content.replace(/<[^>]*>/g, ' ');
  
  for (const pattern of ratingPatterns) {
    const match = plainText.match(pattern);
    if (match && match[1]) {
      const rating = parseFloat(match[1]);
      if (rating >= 1 && rating <= 5) {
        return { rating: rating.toFixed(1) };
      }
    }
  }
  
  return { rating: "4.0" };
}

function extractReviewSubject(title: string): string {
  const patterns = [
    /^(.+?)\s+review$/i,
    /^review[:\s]+(.+)$/i,
    /^(.+?)\s+[-–—]\s+review$/i,
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return title.replace(/review/gi, '').trim() || title;
}

function extractHowToSteps(content: string): { name?: string; text: string }[] {
  const steps: { name?: string; text: string }[] = [];
  
  const stepPatterns = [
    /<h[2-4][^>]*>(?:Step\s*\d+[:\.\s]*)?([^<]+)<\/h[2-4]>\s*<p[^>]*>([^<]+)<\/p>/gi,
    /<li[^>]*>([^<]+)<\/li>/gi,
  ];
  
  let match;
  for (const pattern of stepPatterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null) {
      if (match[2]) {
        steps.push({ name: match[1].trim(), text: match[2].trim() });
      } else if (match[1]) {
        steps.push({ text: match[1].trim() });
      }
    }
    if (steps.length > 0) break;
  }
  
  if (steps.length === 0) {
    const paragraphs = content.match(/<p[^>]*>([^<]+)<\/p>/gi) || [];
    paragraphs.slice(0, 5).forEach((p, i) => {
      const text = p.replace(/<[^>]*>/g, '').trim();
      if (text.length > 20) {
        steps.push({ name: `Step ${i + 1}`, text });
      }
    });
  }
  
  return steps.length > 0 ? steps : [{ name: "Step 1", text: "Follow the instructions in this guide." }];
}

function extractFAQs(content: string): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];
  
  const patterns = [
    /<h[2-4][^>]*>([^<]*\?[^<]*)<\/h[2-4]>\s*<p[^>]*>([^<]+)<\/p>/gi,
    /<strong>([^<]*\?[^<]*)<\/strong>\s*<p[^>]*>([^<]+)<\/p>/gi,
    /<dt[^>]*>([^<]+)<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/gi,
  ];
  
  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(content)) !== null && faqs.length < 10) {
      if (match[1] && match[2]) {
        faqs.push({
          question: match[1].replace(/<[^>]*>/g, '').trim(),
          answer: match[2].replace(/<[^>]*>/g, '').trim()
        });
      }
    }
    if (faqs.length > 0) break;
  }
  
  if (faqs.length === 0) {
    const headings = content.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/gi) || [];
    headings.slice(0, 5).forEach((h) => {
      const question = h.replace(/<[^>]*>/g, '').trim();
      faqs.push({
        question: question.endsWith('?') ? question : `What is ${question}?`,
        answer: `Learn more about ${question} in this article.`
      });
    });
  }
  
  return faqs;
}

function extractListItems(content: string): { name: string; url?: string }[] {
  const items: { name: string; url?: string }[] = [];
  
  const h2Pattern = /<h2[^>]*>(?:\d+[\.\)\s]+)?([^<]+)<\/h2>/gi;
  let match;
  while ((match = h2Pattern.exec(content)) !== null && items.length < 20) {
    const name = match[1].trim();
    if (name && !name.toLowerCase().includes('conclusion') && !name.toLowerCase().includes('introduction')) {
      items.push({ name });
    }
  }
  
  if (items.length === 0) {
    const liPattern = /<li[^>]*>([^<]+)<\/li>/gi;
    while ((match = liPattern.exec(content)) !== null && items.length < 20) {
      items.push({ name: match[1].trim() });
    }
  }
  
  if (items.length === 0) {
    items.push({ name: "Item 1" });
  }
  
  return items;
}
