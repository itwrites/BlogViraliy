import { useEffect, useRef } from "react";
import type { Site, Post } from "@shared/schema";

interface SeoHeadProps {
  site: Site;
  post?: Post;
  pagePath?: string;
}

interface TrackedElement {
  element: Element;
  wasNew: boolean;
  originalContent?: string;
  attr?: 'name' | 'property';
  attrValue?: string;
}

export function SeoHead({ site, post, pagePath = "/" }: SeoHeadProps) {
  const trackedElements = useRef<TrackedElement[]>([]);
  const originalTitle = useRef<string>("");
  const analyticsLoaded = useRef<string | null>(null);

  useEffect(() => {
    originalTitle.current = document.title;

    const title = post?.metaTitle || post?.title || site.metaTitle || site.title;

    const generateDescription = (): string => {
      if (post?.metaDescription) return post.metaDescription;
      if (post) {
        const text = post.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (text.length <= 160) return text;
        const truncated = text.substring(0, 157);
        const lastSpace = truncated.lastIndexOf(' ');
        return (lastSpace > 100 ? truncated.substring(0, lastSpace) : truncated) + '...';
      }
      return site.metaDescription || `Welcome to ${site.title}`;
    };

    const description = generateDescription();
    const ogImage = post?.ogImage || post?.imageUrl || site.ogImage || null;
    const canonicalUrl = post?.canonicalUrl || null;
    const noindex = post?.noindex || false;
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

    document.title = title;

    const setMeta = (attr: 'name' | 'property', attrValue: string, content: string | null) => {
      if (!content) return;
      let meta = document.querySelector(`meta[${attr}="${attrValue}"]`) as HTMLMetaElement;
      const wasNew = !meta;
      const originalContent = meta?.content;

      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, attrValue);
        document.head.appendChild(meta);
      }
      meta.content = content;

      trackedElements.current.push({
        element: meta,
        wasNew,
        originalContent,
        attr,
        attrValue
      });
    };

    const setLink = (rel: string, href: string | null) => {
      if (!href) return;
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      const wasNew = !link;
      const originalContent = link?.href;

      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;

      trackedElements.current.push({
        element: link,
        wasNew,
        originalContent
      });
    };

    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', post ? 'article' : 'website');
    setMeta('property', 'og:site_name', site.title);
    setMeta('property', 'og:url', currentUrl);

    if (ogImage) {
      setMeta('property', 'og:image', ogImage);
      setMeta('name', 'twitter:image', ogImage);
    }

    setMeta('name', 'twitter:card', ogImage ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);

    if (canonicalUrl) {
      setLink('canonical', canonicalUrl);
    }

    if (noindex) {
      setMeta('name', 'robots', 'noindex, nofollow');
    }

    if (site.favicon) {
      setLink('icon', site.favicon);
    }

    if (site.analyticsId && analyticsLoaded.current !== site.analyticsId) {
      const existingScript = document.querySelector(`script[data-ga-id="${site.analyticsId}"]`);
      if (!existingScript) {
        const script = document.createElement('script');
        script.setAttribute('data-ga-id', site.analyticsId);
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${site.analyticsId}`;
        document.head.appendChild(script);

        const inlineScript = document.createElement('script');
        inlineScript.setAttribute('data-ga-inline', site.analyticsId);
        inlineScript.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${site.analyticsId}');
        `;
        document.head.appendChild(inlineScript);

        trackedElements.current.push({ element: script, wasNew: true });
        trackedElements.current.push({ element: inlineScript, wasNew: true });
      }
      analyticsLoaded.current = site.analyticsId;
    }

    return () => {
      document.title = originalTitle.current;

      trackedElements.current.forEach(tracked => {
        if (tracked.wasNew) {
          tracked.element.parentNode?.removeChild(tracked.element);
        } else if (tracked.originalContent !== undefined) {
          if (tracked.element instanceof HTMLMetaElement) {
            tracked.element.content = tracked.originalContent;
          } else if (tracked.element instanceof HTMLLinkElement) {
            tracked.element.href = tracked.originalContent;
          }
        }
      });

      trackedElements.current = [];
    };
  }, [site.id, site.title, site.metaTitle, site.metaDescription, site.ogImage, site.favicon, site.analyticsId, post?.id, post?.title, post?.metaTitle, post?.metaDescription, post?.ogImage, post?.canonicalUrl, post?.noindex, pagePath]);

  return null;
}
