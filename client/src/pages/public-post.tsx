import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PublicPostProps {
  site: Site;
}

export function PublicPost({ site }: PublicPostProps) {
  const { slug } = useParams();
  const [, setLocation] = useLocation();

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ["/api/public/sites", site.id, "posts", slug],
  });

  const { data: relatedPosts } = useQuery<Post[]>({
    queryKey: ["/api/public/sites", site.id, "related-posts", post?.id],
    enabled: !!post,
  });

  const handleTagClick = (tag: string) => {
    setLocation(`/tag/${encodeURIComponent(tag)}`);
  };

  const handleBack = () => {
    setLocation("/");
  };

  const isBlog = site.siteType === "blog";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="h-12 bg-muted rounded w-3/4" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2" data-testid="text-not-found-title">Post not found</h2>
          <p className="text-muted-foreground mb-4" data-testid="text-not-found-message">The post you're looking for doesn't exist</p>
          <Button onClick={handleBack} data-testid="button-go-home">Go back home</Button>
        </div>
      </div>
    );
  }

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
                data-testid="img-site-logo"
              />
            )}
            <h1 className={`text-xl font-semibold ${isBlog ? "font-blog" : "font-news"}`} data-testid="text-site-title">
              {site.title}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Article Header */}
        <article data-testid={`article-${post.id}`}>
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover-elevate"
                  onClick={() => handleTagClick(tag)}
                  data-testid={`tag-${tag}`}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${isBlog ? "font-blog" : "font-news"}`} data-testid="text-post-title">
              {post.title}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.createdAt.toString()} data-testid="text-post-date">
                {new Date(post.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
          </div>

          {/* Article Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none" data-testid="text-post-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts && relatedPosts.length > 0 && (
          <div className="mt-16 pt-8 border-t">
            <h2 className={`text-2xl font-semibold mb-6 ${isBlog ? "font-blog" : "font-news"}`} data-testid="text-related-title">
              Related Articles
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {relatedPosts.slice(0, 3).map((relatedPost) => (
                <Card
                  key={relatedPost.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => setLocation(`/post/${relatedPost.slug}`)}
                  data-testid={`card-related-${relatedPost.id}`}
                >
                  <div className="aspect-video bg-muted" />
                  <CardContent className="p-4">
                    <Badge className="text-xs mb-2" data-testid={`badge-related-tag-${relatedPost.id}`}>
                      {relatedPost.tags[0] || "Article"}
                    </Badge>
                    <h3 className={`font-semibold line-clamp-2 ${isBlog ? "font-blog" : "font-news"}`} data-testid={`text-related-title-${relatedPost.id}`}>
                      {relatedPost.title}
                    </h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 bg-card">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p data-testid="text-footer-copyright">&copy; {new Date().getFullYear()} {site.title}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
