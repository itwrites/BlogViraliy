import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Tag, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PublicTagArchiveProps {
  site: Site;
}

export function PublicTagArchive({ site }: PublicTagArchiveProps) {
  const { tag } = useParams();
  const [, setLocation] = useLocation();
  const decodedTag = decodeURIComponent(tag || "");

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/public/sites", site.id, "posts-by-tag", decodedTag],
  });

  const handlePostClick = (slug: string) => {
    setLocation(`/post/${slug}`);
  };

  const handleBack = () => {
    setLocation("/");
  };

  const isBlog = site.siteType === "blog";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {site.logoUrl && (
              <img
                src={site.logoUrl}
                alt={`${site.title} logo`}
                className="h-8 w-8 object-cover rounded"
              />
            )}
            <h1 className={`text-xl font-semibold ${isBlog ? "font-blog" : "font-news"}`}>
              {site.title}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-6 w-6 text-primary" />
            <h1 className={`text-3xl md:text-4xl font-bold ${isBlog ? "font-blog" : "font-news"}`}>
              {decodedTag}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {isLoading ? "Loading posts..." : `${posts?.length || 0} articles tagged with "${decodedTag}"`}
          </p>
        </div>

        {/* Posts Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Card
                key={post.id}
                className="cursor-pointer hover-elevate overflow-hidden"
                onClick={() => handlePostClick(post.slug)}
                data-testid={`card-post-${post.id}`}
              >
                <div className="aspect-video bg-muted" />
                <CardContent className="p-6">
                  <div className="flex gap-2 mb-3">
                    {post.tags.slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <h3 className={`text-lg font-semibold mb-2 line-clamp-2 ${isBlog ? "font-blog" : "font-news"}`}>
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                    {post.content.substring(0, 120)}...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className={`text-2xl font-semibold mb-2 ${isBlog ? "font-blog" : "font-news"}`}>
              No posts found
            </h2>
            <p className="text-muted-foreground mb-4">
              There are no posts tagged with "{decodedTag}"
            </p>
            <Button onClick={handleBack}>Go back home</Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 bg-card">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {site.title}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
