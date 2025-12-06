import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ThemePostDetail } from "@/components/theme-post-detail";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { Skeleton } from "@/components/ui/skeleton";

interface PublicPostProps {
  site: Site;
  slug: string;
}

export function PublicPostContent({ site, slug }: PublicPostProps) {
  const [, setLocation] = useLocation();
  const templateClasses = useTemplateClasses(site.templateSettings);

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ["/api/public/sites", site.id, "posts", slug],
  });

  const { data: relatedPosts } = useQuery<Post[]>({
    queryKey: ["/api/public/sites", site.id, "related-posts", post?.id],
    enabled: !!post,
  });

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
          <h2 className="text-2xl font-semibold mb-2" data-testid="text-not-found-title">Post not found</h2>
          <p className="text-muted-foreground mb-4" data-testid="text-not-found-message">The post you're looking for doesn't exist</p>
          <Button onClick={handleBack} data-testid="button-go-home">Go back home</Button>
        </div>
      </div>
    );
  }

  return (
    <ThemePostDetail
      site={site}
      post={post}
      relatedPosts={relatedPosts}
    />
  );
}
