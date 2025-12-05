import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Rewrites internal links to include basePath.
 * Internal links are those starting with "/" but not already including the basePath.
 * 
 * Examples (with basePath="/blog"):
 * - "/my-post" → "/blog/my-post"
 * - "/tag/tech" → "/blog/tag/tech"
 * - "/blog/my-post" → "/blog/my-post" (unchanged)
 * - "https://external.com" → "https://external.com" (unchanged)
 * - "#section" → "#section" (unchanged)
 */
export function rewriteInternalLink(href: string, basePath: string | null | undefined): string {
  if (!href) return href;
  
  const normalizedBasePath = basePath?.replace(/\/$/, "") || "";
  
  if (!normalizedBasePath) {
    return href;
  }
  
  if (
    href.startsWith("/") &&
    !href.startsWith("//") &&
    !href.startsWith(normalizedBasePath + "/") &&
    href !== normalizedBasePath
  ) {
    return `${normalizedBasePath}${href}`;
  }
  
  return href;
}

type LinkProps = ComponentPropsWithoutRef<"a"> & { 
  children?: ReactNode;
  node?: unknown;
};

/**
 * Creates a custom link component for ReactMarkdown that rewrites internal links.
 */
export function createLinkRewriter(basePath: string | null | undefined) {
  return function LinkRewriter({ href, children, node, ...props }: LinkProps) {
    const rewrittenHref = rewriteInternalLink(href || "", basePath);
    return (
      <a href={rewrittenHref} {...props}>
        {children}
      </a>
    );
  };
}
