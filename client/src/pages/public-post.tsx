import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect, useRef } from "react";
import type { Site, Post } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ThemePostDetail } from "@/components/theme-post-detail";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { mergeThemeTokens } from "@/lib/theme-registry";
import { useTranslation } from "@/hooks/use-translation";
import { JsonLd } from "@/components/json-ld";
import { SeoHead } from "@/components/seo-head";

interface PublicPostProps {
  site: Site;
  slug: string;
}

export function PublicPostContent({ site, slug }: PublicPostProps) {
  const [, setLocation] = useLocation();
  const templateClasses = useTemplateClasses(mergeThemeTokens(site.siteType || "forbis", site.templateSettings || {}));
  const viewTracked = useRef(false);
  const { t } = useTranslation(site.displayLanguage || "en");

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ["/api/public/sites", site.id, "posts", slug],
  });

  const { data: relatedPosts } = useQuery<Post[]>({
    queryKey: ["/api/public/sites", site.id, "related-posts", post?.id],
    enabled: !!post,
  });

  // Track view when post loads (only once per page load)
  useEffect(() => {
    if (post && !viewTracked.current) {
      viewTracked.current = true;
      
      // Try to get visitor IP from browser using ipify.org as fallback
      // This helps when nginx headers aren't passing through correctly
      const trackView = async () => {
        let visitorIP: string | undefined;
        try {
          const ipResponse = await fetch("https://api.ipify.org?format=json", { 
            signal: AbortSignal.timeout(2000) 
          });
          const ipData = await ipResponse.json();
          visitorIP = ipData.ip;
        } catch {
          // ipify failed, continue without browser IP
        }
        
        await apiRequest("POST", `/bv_api/posts/${slug}/view`, { 
          siteId: site.id,
          visitorIP 
        });
      };
      
      trackView().catch(() => {
        // Silently fail - view tracking is non-critical
      });
    }
  }, [post, slug, site.id]);

  const handleBack = () => {
    setLocation("/");
  };

  const cardStyle = templateClasses.cardStyle;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse">
          <div className="h-[50vh] bg-muted" />
          <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
            <div className="flex gap-2">
              <Skeleton className={`h-6 w-16 ${cardStyle.radiusSm}`} />
              <Skeleton className={`h-6 w-20 ${cardStyle.radiusSm}`} />
            </div>
            <Skeleton className={`h-12 w-3/4 ${cardStyle.radiusSm}`} />
            <Skeleton className={`h-6 w-1/4 ${cardStyle.radiusSm}`} />
            <div className="space-y-4 mt-8">
              <Skeleton className={`h-4 w-full ${cardStyle.radiusSm}`} />
              <Skeleton className={`h-4 w-full ${cardStyle.radiusSm}`} />
              <Skeleton className={`h-4 w-5/6 ${cardStyle.radiusSm}`} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-6">
          <h2 className="text-2xl font-semibold mb-2" data-testid="text-not-found-title">{t("postNotFound")}</h2>
          <p className="text-muted-foreground mb-4" data-testid="text-not-found-message">{t("postNotFoundDescription")}</p>
          <Button onClick={handleBack} data-testid="button-go-home">{t("goBackHome")}</Button>
        </div>
      </div>
    );
  }

  const postWithAuthor = post as Post & { authorName?: string };
  const author = postWithAuthor.authorName ? {
    id: post.authorId || "",
    siteId: site.id,
    name: postWithAuthor.authorName,
    slug: postWithAuthor.authorName.toLowerCase().replace(/\s+/g, "-"),
    bio: null,
    avatarUrl: null,
    isDefault: false,
    createdAt: new Date(),
  } : null;

  return (
    <>
      <SeoHead site={site} post={post} />
      <JsonLd site={site} post={post} author={author} />
      <ThemePostDetail
        site={site}
        post={post}
        relatedPosts={relatedPosts}
      />
    </>
  );
}
