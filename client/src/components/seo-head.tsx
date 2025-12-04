import { useEffect, useRef } from "react";
import type { Site, Post } from "@shared/schema";
import { normalizeBasePath } from "./base-path-provider";

interface SeoHeadProps {
  site: Site;
  post?: Post;
  pagePath?: string;
}

interface TrackedMeta {
  type: 'meta';
  attr: 'name' | 'property';
  attrValue: string;
  wasNew: boolean;
  originalContent?: string;
}

interface TrackedLink {
  type: 'link';
  rel: string;
  wasNew: boolean;
  originalHref?: string;
}

interface TrackedScript {
  type: 'script';
  element: HTMLScriptElement;
}

type TrackedElement = TrackedMeta | TrackedLink | TrackedScript;

export function SeoHead({ site, post, pagePath = "/" }: SeoHeadProps) {
  const trackedElements = useRef<TrackedElement[]>([]);
  const originalTitle = useRef<string>("");

  useEffect(() => {
    trackedElements.current = [];
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

    const currentProtocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
    const protocol = currentProtocol === 'http:' ? 'http://' : 'https://';
    const basePath = normalizeBasePath(site.basePath);
    const siteBaseUrl = `${protocol}${site.domain}${basePath}`;
    const currentPath = post ? `/post/${post.slug}` : pagePath;
    const fullUrl = `${siteBaseUrl}${currentPath}`;

    document.title = title;

    const setMeta = (attr: 'name' | 'property', attrValue: string, content: string | null) => {
      if (!content) return;
      let meta = document.querySelector(`meta[${attr}="${attrValue}"]`) as HTMLMetaElement | null;
      const wasNew = !meta;
      const originalContent = meta?.content;

      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, attrValue);
        document.head.appendChild(meta);
      }
      meta.content = content;

      trackedElements.current.push({
        type: 'meta',
        attr,
        attrValue,
        wasNew,
        originalContent
      });
    };

    const setLink = (rel: string, href: string | null) => {
      if (!href) return;
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      const wasNew = !link;
      const originalHref = link?.href;

      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;

      trackedElements.current.push({
        type: 'link',
        rel,
        wasNew,
        originalHref
      });
    };

    setMeta('name', 'description', description);

    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', post ? 'article' : 'website');
    setMeta('property', 'og:site_name', site.title);
    setMeta('property', 'og:url', fullUrl);

    if (ogImage) {
      setMeta('property', 'og:image', ogImage);
    }

    setMeta('name', 'twitter:card', ogImage ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:site', `@${site.domain.split('.')[0]}`);

    if (ogImage) {
      setMeta('name', 'twitter:image', ogImage);
    }

    if (canonicalUrl) {
      setLink('canonical', canonicalUrl);
    } else {
      setLink('canonical', fullUrl);
    }

    if (noindex) {
      setMeta('name', 'robots', 'noindex, nofollow');
    }

    if (site.favicon) {
      setLink('icon', site.favicon);
    }

    if (site.analyticsId) {
      const gaScriptId = `ga-script-${site.id}`;
      const existingScript = document.getElementById(gaScriptId);

      if (!existingScript) {
        const oldScripts = document.querySelectorAll('script[data-ga-site]');
        oldScripts.forEach(s => {
          if (s.getAttribute('data-ga-site') !== String(site.id)) {
            s.parentNode?.removeChild(s);
          }
        });

        const script = document.createElement('script');
        script.id = gaScriptId;
        script.setAttribute('data-ga-site', String(site.id));
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${site.analyticsId}`;
        document.head.appendChild(script);

        const inlineScript = document.createElement('script');
        inlineScript.id = `${gaScriptId}-inline`;
        inlineScript.setAttribute('data-ga-site', String(site.id));
        inlineScript.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${site.analyticsId}');
        `;
        document.head.appendChild(inlineScript);

        trackedElements.current.push({ type: 'script', element: script });
        trackedElements.current.push({ type: 'script', element: inlineScript });
      }
    }

    return () => {
      document.title = originalTitle.current;

      trackedElements.current.forEach(tracked => {
        if (tracked.type === 'meta') {
          const meta = document.querySelector(`meta[${tracked.attr}="${tracked.attrValue}"]`) as HTMLMetaElement | null;
          if (meta) {
            if (tracked.wasNew) {
              meta.parentNode?.removeChild(meta);
            } else if (tracked.originalContent !== undefined) {
              meta.content = tracked.originalContent;
            }
          }
        } else if (tracked.type === 'link') {
          const link = document.querySelector(`link[rel="${tracked.rel}"]`) as HTMLLinkElement | null;
          if (link) {
            if (tracked.wasNew) {
              link.parentNode?.removeChild(link);
            } else if (tracked.originalHref !== undefined) {
              link.href = tracked.originalHref;
            }
          }
        } else if (tracked.type === 'script') {
          tracked.element.parentNode?.removeChild(tracked.element);
        }
      });

      trackedElements.current = [];
    };
  }, [site.id, site.domain, site.basePath, site.title, site.metaTitle, site.metaDescription, site.ogImage, site.favicon, site.analyticsId, post?.id, post?.slug, post?.title, post?.metaTitle, post?.metaDescription, post?.ogImage, post?.canonicalUrl, post?.noindex, pagePath]);

  return null;
}
