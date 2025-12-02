import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Twitter, Facebook, Instagram, Linkedin } from "lucide-react";
import { PublicThemeProvider, useTemplateClasses } from "@/components/public-theme-provider";
import { SeoHead } from "@/components/seo-head";

interface PublicNewsProps {
  site: Site;
}

export function PublicNews({ site }: PublicNewsProps) {
  const [, setLocation] = useLocation();
  const templateClasses = useTemplateClasses(site.templateSettings);

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
    <PublicThemeProvider settings={site.templateSettings}>
      <SeoHead site={site} />
      <div className="min-h-screen bg-background text-foreground">
        <header className={`border-b bg-card ${templateClasses.isHeaderSticky ? 'sticky top-0 z-50' : ''}`}>
          <div className={`${templateClasses.contentWidth} mx-auto px-6 py-3`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {site.logoUrl && (
                  <img
                    src={site.logoUrl}
                    alt={`${site.title} logo`}
                    className={`${templateClasses.logoSize} object-cover rounded`}
                    data-testid="img-site-logo"
                  />
                )}
                {(!templateClasses.hideLogoText || !site.logoUrl) && (
                  <div>
                    <h1 className="text-xl font-bold" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-site-title">{site.title}</h1>
                    <p className="text-xs text-muted-foreground" data-testid="text-site-tagline">Breaking News & Updates</p>
                  </div>
                )}
              </div>
              <nav className="hidden md:flex items-center gap-1 overflow-x-auto max-w-2xl" data-testid="nav-main">
                {topTags?.slice(0, templateClasses.maxNavItems).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className="px-2 py-1.5 text-xs hover-elevate rounded whitespace-nowrap"
                    data-testid={`link-tag-${tag}`}
                  >
                    {tag.toUpperCase()}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </header>

        <main className={`${templateClasses.contentWidth} mx-auto px-6 py-8`}>
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
          ) : featuredPost && templateClasses.showHero ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 mb-8">
                <Card
                  className={`cursor-pointer hover-elevate overflow-hidden ${templateClasses.cardStyle}`}
                  onClick={() => handlePostClick(featuredPost.slug)}
                  data-testid={`card-featured-post-${featuredPost.id}`}
                >
                  <div className="aspect-video bg-muted">
                    {featuredPost.imageUrl && <img src={featuredPost.imageUrl} alt={featuredPost.title} className="w-full h-full object-cover" />}
                  </div>
                  <CardContent className="p-6">
                    <div className="flex gap-2 mb-3">
                      {featuredPost.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={tag} className="text-xs" data-testid={`badge-featured-tag-${index}`}>
                          {tag.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                    <h2 className="text-2xl font-bold mb-3 hover:underline" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-featured-title-${featuredPost.id}`}>
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

                <div className="grid grid-cols-2 gap-4">
                  {secondaryPosts.map((post) => (
                    <Card
                      key={post.id}
                      className={`cursor-pointer hover-elevate overflow-hidden ${templateClasses.cardStyle}`}
                      onClick={() => handlePostClick(post.slug)}
                      data-testid={`card-secondary-post-${post.id}`}
                    >
                      <div className="aspect-video bg-muted">
                        {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />}
                      </div>
                      <CardContent className="p-3">
                        <Badge className="text-[10px] mb-2" data-testid={`badge-secondary-tag-${post.id}`}>
                          {post.tags[0]?.toUpperCase() || "NEWS"}
                        </Badge>
                        <h3 className="text-sm font-semibold line-clamp-2 hover:underline" data-testid={`text-secondary-title-${post.id}`}>
                          {post.title}
                        </h3>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {latestPosts.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4 pb-2 border-b" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-latest-news-title">LATEST NEWS</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    {latestPosts.map((post) => (
                      <Card
                        key={post.id}
                        className={`cursor-pointer hover-elevate ${templateClasses.cardStyle}`}
                        onClick={() => handlePostClick(post.slug)}
                        data-testid={`card-post-${post.id}`}
                      >
                        <div className="aspect-video bg-muted">
                          {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />}
                        </div>
                        <CardContent className="p-4">
                          <Badge className="text-xs mb-2" data-testid={`badge-post-tag-${post.id}`}>
                            {post.tags[0]?.toUpperCase() || "NEWS"}
                          </Badge>
                          <h3 className="text-base font-semibold mb-2 line-clamp-2 hover:underline" data-testid={`text-post-title-${post.id}`}>
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
          ) : posts && posts.length > 0 ? (
            <div>
              <h3 className="text-xl font-bold mb-4 pb-2 border-b" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-all-news-title">ALL NEWS</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {posts.map((post) => (
                  <Card
                    key={post.id}
                    className={`cursor-pointer hover-elevate ${templateClasses.cardStyle}`}
                    onClick={() => handlePostClick(post.slug)}
                    data-testid={`card-post-${post.id}`}
                  >
                    <div className="aspect-video bg-muted">
                      {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />}
                    </div>
                    <CardContent className="p-4">
                      <Badge className="text-xs mb-2" data-testid={`badge-post-tag-${post.id}`}>
                        {post.tags[0]?.toUpperCase() || "NEWS"}
                      </Badge>
                      <h3 className="text-base font-semibold mb-2 line-clamp-2 hover:underline" data-testid={`text-post-title-${post.id}`}>
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
          ) : (
            <div className="text-center py-24">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-testid="icon-no-posts" />
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-no-posts-title">NO STORIES AVAILABLE</h2>
              <p className="text-muted-foreground" data-testid="text-no-posts-message">Check back soon for breaking news</p>
            </div>
          )}
        </main>

        <footer className="border-t mt-12 py-6 bg-card">
          <div className={`${templateClasses.contentWidth} mx-auto px-6`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground" data-testid="text-footer-copyright">
                {templateClasses.footerText || `\u00A9 ${new Date().getFullYear()} ${site.title}. All rights reserved.`}
              </p>
              {templateClasses.hasSocials && (
                <div className="flex items-center gap-3">
                  {templateClasses.socials.twitter && (
                    <a href={templateClasses.socials.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" data-testid="link-social-twitter">
                      <Twitter className="h-4 w-4" />
                    </a>
                  )}
                  {templateClasses.socials.facebook && (
                    <a href={templateClasses.socials.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" data-testid="link-social-facebook">
                      <Facebook className="h-4 w-4" />
                    </a>
                  )}
                  {templateClasses.socials.instagram && (
                    <a href={templateClasses.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" data-testid="link-social-instagram">
                      <Instagram className="h-4 w-4" />
                    </a>
                  )}
                  {templateClasses.socials.linkedin && (
                    <a href={templateClasses.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" data-testid="link-social-linkedin">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </footer>
      </div>
    </PublicThemeProvider>
  );
}
