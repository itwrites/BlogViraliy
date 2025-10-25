import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, Zap } from "lucide-react";

interface PublicCryptoProps {
  site: Site;
}

export function PublicCrypto({ site }: PublicCryptoProps) {
  const [, setLocation] = useLocation();

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/public/sites", site.id, "posts"],
  });

  const { data: topTags } = useQuery<string[]>({
    queryKey: ["/api/public/sites", site.id, "top-tags"],
  });

  const handleTagClick = (tag: string) => {
    setLocation(`/tag/${encodeURIComponent(tag)}`);
  };

  const handlePostClick = (slug: string) => {
    setLocation(`/post/${slug}`);
  };

  const breakingPost = posts?.[0];
  const trendingPosts = posts?.slice(1, 4) || [];
  const latestPosts = posts?.slice(4) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {site.logoUrl && (
                <img
                  src={site.logoUrl}
                  alt={`${site.title} logo`}
                  className="h-10 w-10 object-cover rounded"
                  data-testid="img-site-logo"
                />
              )}
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono" data-testid="text-site-title">
                {site.title}
              </h1>
              <Badge className="bg-green-500 text-white text-xs" data-testid="badge-live-status">
                <Zap className="h-3 w-3 mr-1" />
                LIVE
              </Badge>
            </div>
          </div>
          <nav className="flex items-center gap-2 mt-4 overflow-x-auto" data-testid="nav-main">
            {topTags?.slice(0, 10).map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider hover-elevate rounded bg-accent text-foreground whitespace-nowrap"
                data-testid={`link-tag-${tag}`}
              >
                {tag}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="space-y-6">
            <div className="h-[300px] bg-muted animate-pulse rounded" />
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        ) : breakingPost ? (
          <>
            {/* Breaking News */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <h2 className="text-lg font-bold font-mono uppercase tracking-wide" data-testid="text-breaking-title">
                  Breaking News
                </h2>
              </div>
              <Card
                className="cursor-pointer hover-elevate overflow-hidden border-2 border-green-500/20"
                onClick={() => handlePostClick(breakingPost.slug)}
                data-testid={`card-breaking-post-${breakingPost.id}`}
              >
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <div className="flex gap-2 mb-3">
                        {breakingPost.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={tag} variant="outline" className="text-xs font-mono uppercase border-green-500 text-green-500" data-testid={`badge-breaking-tag-${index}`}>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <h3 className="text-3xl font-bold mb-3 font-mono" data-testid={`text-breaking-post-title-${breakingPost.id}`}>
                        {breakingPost.title}
                      </h3>
                      <p className="text-muted-foreground mb-4 line-clamp-2" data-testid={`text-breaking-excerpt-${breakingPost.id}`}>
                        {breakingPost.content.substring(0, 180)}...
                      </p>
                      <p className="text-xs text-muted-foreground font-mono" data-testid={`text-breaking-date-${breakingPost.id}`}>
                        {new Date(breakingPost.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="aspect-video md:aspect-square bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trending */}
            {trendingPosts.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold font-mono uppercase tracking-wide mb-4" data-testid="text-trending-title">
                  Trending Now
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {trendingPosts.map((post, index) => (
                    <Card
                      key={post.id}
                      className="cursor-pointer hover-elevate overflow-hidden"
                      onClick={() => handlePostClick(post.slug)}
                      data-testid={`card-trending-post-${post.id}`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="text-3xl font-bold text-muted-foreground/30 font-mono">
                            {String(index + 1).padStart(2, '0')}
                          </div>
                          <div className="flex-1">
                            <Badge variant="secondary" className="text-xs font-mono mb-2" data-testid={`badge-trending-tag-${post.id}`}>
                              {post.tags[0] || "NEWS"}
                            </Badge>
                            <h4 className="font-bold text-base line-clamp-3 mb-2" data-testid={`text-trending-title-${post.id}`}>
                              {post.title}
                            </h4>
                            <p className="text-xs text-muted-foreground font-mono" data-testid={`text-trending-date-${post.id}`}>
                              {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Latest Updates */}
            {latestPosts.length > 0 && (
              <div>
                <h3 className="text-lg font-bold font-mono uppercase tracking-wide mb-4" data-testid="text-latest-title">
                  Latest Updates
                </h3>
                <div className="space-y-3">
                  {latestPosts.map((post) => (
                    <Card
                      key={post.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => handlePostClick(post.slug)}
                      data-testid={`card-post-${post.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-24 h-24 bg-muted rounded flex-shrink-0" />
                          <div className="flex-1">
                            <Badge variant="outline" className="text-xs font-mono mb-2" data-testid={`badge-post-tag-${post.id}`}>
                              {post.tags[0] || "UPDATE"}
                            </Badge>
                            <h4 className="font-bold mb-2 line-clamp-2" data-testid={`text-post-title-${post.id}`}>
                              {post.title}
                            </h4>
                            <p className="text-sm text-muted-foreground line-clamp-1 mb-2" data-testid={`text-post-excerpt-${post.id}`}>
                              {post.content.substring(0, 100)}...
                            </p>
                            <p className="text-xs text-muted-foreground font-mono" data-testid={`text-post-date-${post.id}`}>
                              {new Date(post.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-testid="icon-no-posts" />
            <h2 className="text-2xl font-bold mb-2 font-mono" data-testid="text-no-posts-title">No updates yet</h2>
            <p className="text-muted-foreground" data-testid="text-no-posts-message">Market news coming soon</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-6 bg-card">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-muted-foreground font-mono">
          <p data-testid="text-footer-copyright">&copy; {new Date().getFullYear()} {site.title}. Real-time market data.</p>
        </div>
      </footer>
    </div>
  );
}
