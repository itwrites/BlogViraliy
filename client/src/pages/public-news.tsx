import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface PublicNewsProps {
  site: Site;
}

export function PublicNews({ site }: PublicNewsProps) {
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

  const featuredPost = posts?.[0];
  const secondaryPosts = posts?.slice(1, 5) || [];
  const latestPosts = posts?.slice(5) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {site.logoUrl && (
                <img
                  src={site.logoUrl}
                  alt={`${site.title} logo`}
                  className="h-8 w-8 object-cover rounded"
                  data-testid="img-site-logo"
                />
              )}
              <div>
                <h1 className="text-xl font-news font-bold text-foreground" data-testid="text-site-title">{site.title}</h1>
                <p className="text-xs text-muted-foreground" data-testid="text-site-tagline">Breaking News & Updates</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1 overflow-x-auto max-w-2xl" data-testid="nav-main">
              {topTags?.slice(0, 10).map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="px-2 py-1.5 text-xs hover-elevate rounded text-foreground whitespace-nowrap font-news"
                  data-testid={`link-tag-${tag}`}
                >
                  {tag.toUpperCase()}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-80 bg-muted animate-pulse rounded" />
              <div className="grid gap-4 grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-36 bg-muted animate-pulse rounded" />
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        ) : featuredPost ? (
          <>
            {/* Featured Section */}
            <div className="grid gap-4 md:grid-cols-2 mb-8">
              {/* Main Featured */}
              <Card
                className="cursor-pointer hover-elevate overflow-hidden"
                onClick={() => handlePostClick(featuredPost.slug)}
                data-testid={`card-featured-post-${featuredPost.id}`}
              >
                <div className="aspect-video bg-muted">
                  {featuredPost.imageUrl && <img src={featuredPost.imageUrl} alt={featuredPost.title} className="w-full h-full object-cover" />}
                </div>
                <CardContent className="p-6">
                  <div className="flex gap-2 mb-3">
                    {featuredPost.tags.slice(0, 2).map((tag, index) => (
                      <Badge key={tag} className="text-xs font-news" data-testid={`badge-featured-tag-${index}`}>
                        {tag.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                  <h2 className="text-2xl font-news font-bold mb-3 hover:underline" data-testid={`text-featured-title-${featuredPost.id}`}>
                    {featuredPost.title}
                  </h2>
                  <p className="text-muted-foreground mb-3 line-clamp-3" data-testid={`text-featured-excerpt-${featuredPost.id}`}>
                    {featuredPost.content.substring(0, 200)}...
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`text-featured-date-${featuredPost.id}`}>
                    {new Date(featuredPost.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </CardContent>
              </Card>

              {/* Secondary Stories Grid */}
              <div className="grid grid-cols-2 gap-4">
                {secondaryPosts.map((post) => (
                  <Card
                    key={post.id}
                    className="cursor-pointer hover-elevate overflow-hidden"
                    onClick={() => handlePostClick(post.slug)}
                    data-testid={`card-secondary-post-${post.id}`}
                  >
                    <div className="aspect-video bg-muted">
                      {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />}
                    </div>
                    <CardContent className="p-3">
                      <Badge className="text-[10px] font-news mb-2" data-testid={`badge-secondary-tag-${post.id}`}>
                        {post.tags[0]?.toUpperCase() || "NEWS"}
                      </Badge>
                      <h3 className="text-sm font-news font-semibold line-clamp-2 hover:underline" data-testid={`text-secondary-title-${post.id}`}>
                        {post.title}
                      </h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Latest News */}
            {latestPosts.length > 0 && (
              <div>
                <h3 className="text-xl font-news font-bold mb-4 pb-2 border-b" data-testid="text-latest-news-title">LATEST NEWS</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {latestPosts.map((post) => (
                    <Card
                      key={post.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => handlePostClick(post.slug)}
                      data-testid={`card-post-${post.id}`}
                    >
                      <div className="aspect-video bg-muted">
                        {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />}
                      </div>
                      <CardContent className="p-4">
                        <Badge className="text-xs font-news mb-2" data-testid={`badge-post-tag-${post.id}`}>
                          {post.tags[0]?.toUpperCase() || "NEWS"}
                        </Badge>
                        <h3 className="text-base font-news font-semibold mb-2 line-clamp-2 hover:underline" data-testid={`text-post-title-${post.id}`}>
                          {post.title}
                        </h3>
                        <p className="text-xs text-muted-foreground" data-testid={`text-post-date-${post.id}`}>
                          {new Date(post.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
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
            <h2 className="text-2xl font-news font-bold mb-2" data-testid="text-no-posts-title">NO STORIES AVAILABLE</h2>
            <p className="text-muted-foreground" data-testid="text-no-posts-message">Check back soon for breaking news</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 bg-card">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-muted-foreground">
          <p data-testid="text-footer-copyright">&copy; {new Date().getFullYear()} {site.title}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
