import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import type { Site, Post } from "@shared/schema";
import { ThemeCardGrid } from "@/components/theme-card-grid";
import { getThemeManifest, getLayoutClasses, type ThemeManifest } from "@/lib/theme-manifest";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, useReducedMotion } from "framer-motion";

interface ThemedHomePageProps {
  site: Site;
}

export function ThemedHomePage({ site }: ThemedHomePageProps) {
  const [, setLocation] = useLocation();
  const themeId = site.siteType || "blog";
  const manifest = getThemeManifest(themeId);
  const templateClasses = useTemplateClasses(site.templateSettings);
  const prefersReducedMotion = useReducedMotion();

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/public/sites", site.id, "posts"],
  });

  const handlePostClick = (slug: string) => {
    setLocation(`/post/${slug}`);
  };

  const handleTagClick = (tag: string) => {
    setLocation(`/tag/${encodeURIComponent(tag)}`);
  };

  if (isLoading) {
    return <HomePageSkeleton manifest={manifest} templateClasses={templateClasses} />;
  }

  if (!posts || posts.length === 0) {
    return <EmptyState manifest={manifest} templateClasses={templateClasses} />;
  }

  const layoutClasses = manifest ? getLayoutClasses(manifest) : null;
  const contentWidth = layoutClasses?.contentWidthClass || templateClasses.contentWidth;

  return (
    <div className="min-h-screen bg-background">
      <main className={`${contentWidth} mx-auto px-4 sm:px-6 py-8`}>
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={prefersReducedMotion ? false : { opacity: 1 }}
          transition={prefersReducedMotion ? {} : { duration: 0.4 }}
        >
          <ThemeCardGrid
            site={site}
            posts={posts}
            onPostClick={handlePostClick}
            onTagClick={handleTagClick}
            showPagination={true}
          />
        </motion.div>
      </main>
    </div>
  );
}

function HomePageSkeleton({ manifest, templateClasses }: { manifest: ThemeManifest | undefined; templateClasses: ReturnType<typeof useTemplateClasses> }) {
  const layoutClasses = manifest ? getLayoutClasses(manifest) : null;
  const contentWidth = layoutClasses?.contentWidthClass || templateClasses.contentWidth;
  const layout = manifest?.layout.homeLayout || "grid";

  const renderSkeletonItems = () => {
    if (layout === "minimal-list" || layout === "list") {
      return (
        <div className="space-y-6 max-w-2xl mx-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 pb-6 border-b border-border/30">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      );
    }

    if (layout === "magazine" || layout === "featured-grid") {
      return (
        <>
          <Skeleton className="aspect-[21/9] w-full rounded-xl mb-8" />
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Skeleton className="aspect-[16/9] rounded-lg" />
            <Skeleton className="aspect-[16/9] rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
            ))}
          </div>
        </>
      );
    }

    if (layout === "bento") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Skeleton className="h-[400px] row-span-2 rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[16/10] rounded-lg" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <main className={`${contentWidth} mx-auto px-4 sm:px-6 py-8`}>
        {renderSkeletonItems()}
      </main>
    </div>
  );
}

function EmptyState({ manifest, templateClasses }: { manifest: ThemeManifest | undefined; templateClasses: ReturnType<typeof useTemplateClasses> }) {
  const layoutClasses = manifest ? getLayoutClasses(manifest) : null;
  const contentWidth = layoutClasses?.contentWidthClass || templateClasses.contentWidth;

  return (
    <div className="min-h-screen bg-background">
      <main className={`${contentWidth} mx-auto px-4 sm:px-6 py-16`}>
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h2 
            className="text-2xl font-semibold mb-3"
            style={{ fontFamily: "var(--public-heading-font)" }}
          >
            No posts yet
          </h2>
          <p 
            className="text-muted-foreground"
            style={{ fontFamily: "var(--public-body-font)" }}
          >
            Check back soon for new content.
          </p>
        </div>
      </main>
    </div>
  );
}

export { ThemedHomePage as default };
