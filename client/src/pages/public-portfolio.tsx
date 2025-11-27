import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink } from "lucide-react";

interface PublicPortfolioProps {
  site: Site;
}

export function PublicPortfolio({ site }: PublicPortfolioProps) {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {site.logoUrl && (
                <img
                  src={site.logoUrl}
                  alt={`${site.title} logo`}
                  className="h-12 w-12 object-cover rounded-full"
                  data-testid="img-site-logo"
                />
              )}
              <div>
                <h1 className="text-3xl font-light tracking-wide text-foreground" data-testid="text-site-title">
                  {site.title}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Portfolio & Work</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-4" data-testid="nav-main">
              {topTags?.slice(0, 5).map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="text-sm hover-elevate px-3 py-2 rounded text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`link-tag-${tag}`}
                >
                  {tag}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16">
        {isLoading ? (
          <div className="grid gap-8 md:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-96 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid gap-12 md:grid-cols-2">
            {posts.map((post, index) => (
              <Card
                key={post.id}
                className={`cursor-pointer hover-elevate overflow-hidden group ${index === 0 ? 'md:col-span-2' : ''}`}
                onClick={() => handlePostClick(post.slug)}
                data-testid={`card-post-${post.id}`}
              >
                <div className={`${index === 0 ? 'aspect-[21/9]' : 'aspect-[4/3]'} bg-muted relative`}>
                  {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <ExternalLink className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <CardContent className={`${index === 0 ? 'p-10' : 'p-6'}`}>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.slice(0, 3).map((tag, tagIndex) => (
                      <Badge key={tag} variant="outline" className="text-xs" data-testid={`badge-post-tag-${post.id}-${tagIndex}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <h3 className={`${index === 0 ? 'text-3xl' : 'text-2xl'} font-light mb-3 line-clamp-2`} data-testid={`text-post-title-${post.id}`}>
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground line-clamp-2 mb-4" data-testid={`text-post-excerpt-${post.id}`}>
                    {post.content.substring(0, 120)}...
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid={`text-post-date-${post.id}`}>
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-testid="icon-no-posts" />
            <h2 className="text-2xl font-light mb-2" data-testid="text-no-posts-title">No projects yet</h2>
            <p className="text-muted-foreground" data-testid="text-no-posts-message">Portfolio coming soon</p>
          </div>
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t mt-24 py-12 bg-card">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p data-testid="text-footer-copyright">&copy; {new Date().getFullYear()} {site.title}</p>
        </div>
      </footer>
    </div>
  );
}
