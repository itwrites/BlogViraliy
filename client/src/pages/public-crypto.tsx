import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, Zap, Twitter, Facebook, Instagram, Linkedin } from "lucide-react";
import { PublicThemeProvider, useTemplateClasses } from "@/components/public-theme-provider";
import { SeoHead } from "@/components/seo-head";
import { MobileNav } from "@/components/mobile-nav";
import { stripMarkdown } from "@/lib/strip-markdown";

interface PublicCryptoProps {
  site: Site;
}

export function PublicCrypto({ site }: PublicCryptoProps) {
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

  const breakingPost = posts?.[0];
  const trendingPosts = posts?.slice(1, 4) || [];
  const latestPosts = posts?.slice(4) || [];

  return (
    <PublicThemeProvider settings={site.templateSettings}>
      <SeoHead site={site} />
      <div className="min-h-screen bg-background text-foreground">
        <header className={`bg-card border-b ${templateClasses.isHeaderSticky ? 'sticky top-0 z-50' : ''}`}>
          <div className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-4`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <MobileNav 
                  tags={topTags || []} 
                  onTagClick={handleTagClick} 
                  siteTitle={site.title} 
                />
                {site.logoUrl && (
                  <img
                    src={site.logoUrl}
                    alt={`${site.title} logo`}
                    style={templateClasses.logoSize.style}
                    className="object-cover rounded"
                    data-testid="img-site-logo"
                  />
                )}
                {(!templateClasses.hideLogoText || !site.logoUrl) && (
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-site-title">
                    {site.title}
                  </h1>
                )}
                <Badge className="bg-primary text-primary-foreground text-xs" data-testid="badge-live-status">
                  <Zap className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-2 mt-4 overflow-x-auto" data-testid="nav-main">
              {topTags?.slice(0, templateClasses.maxNavItems).map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider hover-elevate rounded bg-accent whitespace-nowrap"
                  data-testid={`link-tag-${tag}`}
                >
                  {tag}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-6 sm:py-8`}>
          {isLoading ? (
            <div className="space-y-6">
              <div className="h-[250px] sm:h-[300px] bg-muted animate-pulse rounded" />
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-40 sm:h-48 bg-muted animate-pulse rounded" />
                ))}
              </div>
            </div>
          ) : breakingPost && templateClasses.showHero ? (
            <>
              <div className="mb-6 sm:mb-8">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <h2 className="text-base sm:text-lg font-bold font-mono uppercase tracking-wide" data-testid="text-breaking-title">
                    Breaking News
                  </h2>
                </div>
                <Card
                  className={`cursor-pointer hover-elevate overflow-hidden border-2 border-primary/20 ${templateClasses.cardStyle}`}
                  onClick={() => handlePostClick(breakingPost.slug)}
                  data-testid={`card-breaking-post-${breakingPost.id}`}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                      <div className="md:col-span-2 flex flex-col order-2 md:order-1">
                        <div className="flex flex-wrap gap-2 mb-2 sm:mb-3">
                          {breakingPost.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={tag} variant="outline" className="text-xs font-mono uppercase border-primary text-primary" data-testid={`badge-breaking-tag-${index}`}>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 font-mono line-clamp-2" data-testid={`text-breaking-post-title-${breakingPost.id}`}>
                          {breakingPost.title}
                        </h3>
                        <p className="text-muted-foreground mb-3 sm:mb-4 line-clamp-2 text-sm" data-testid={`text-breaking-excerpt-${breakingPost.id}`}>
                          {stripMarkdown(breakingPost.content, 180)}
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
                      <div className="aspect-video md:aspect-square bg-gradient-to-br from-primary/10 to-secondary/10 rounded order-1 md:order-2">
                        {breakingPost.imageUrl && <img src={breakingPost.imageUrl} alt={breakingPost.title} className="w-full h-full object-cover rounded" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {trendingPosts.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-base sm:text-lg font-bold font-mono uppercase tracking-wide mb-3 sm:mb-4" data-testid="text-trending-title">
                    Trending Now
                  </h3>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                    {trendingPosts.map((post, index) => (
                      <Card
                        key={post.id}
                        className={`cursor-pointer hover-elevate overflow-hidden ${templateClasses.cardStyle}`}
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

              {latestPosts.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold font-mono uppercase tracking-wide mb-4" data-testid="text-latest-title">
                    Latest Updates
                  </h3>
                  <div className="space-y-3">
                    {latestPosts.map((post) => (
                      <Card
                        key={post.id}
                        className={`cursor-pointer hover-elevate ${templateClasses.cardStyle}`}
                        onClick={() => handlePostClick(post.slug)}
                        data-testid={`card-post-${post.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="w-24 h-24 bg-muted rounded flex-shrink-0">
                              {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover rounded" />}
                            </div>
                            <div className="flex-1">
                              <Badge variant="outline" className="text-xs font-mono mb-2" data-testid={`badge-post-tag-${post.id}`}>
                                {post.tags[0] || "UPDATE"}
                              </Badge>
                              <h4 className="font-bold mb-2 line-clamp-2" data-testid={`text-post-title-${post.id}`}>
                                {post.title}
                              </h4>
                              <p className="text-sm text-muted-foreground line-clamp-1 mb-2" data-testid={`text-post-excerpt-${post.id}`}>
                                {stripMarkdown(post.content, 100)}
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
          ) : posts && posts.length > 0 ? (
            <div className="space-y-3">
              {posts.map((post) => (
                <Card
                  key={post.id}
                  className={`cursor-pointer hover-elevate ${templateClasses.cardStyle}`}
                  onClick={() => handlePostClick(post.slug)}
                  data-testid={`card-post-${post.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-24 bg-muted rounded flex-shrink-0">
                        {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover rounded" />}
                      </div>
                      <div className="flex-1">
                        <Badge variant="outline" className="text-xs font-mono mb-2" data-testid={`badge-post-tag-${post.id}`}>
                          {post.tags[0] || "UPDATE"}
                        </Badge>
                        <h4 className="font-bold mb-2 line-clamp-2" data-testid={`text-post-title-${post.id}`}>
                          {post.title}
                        </h4>
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2" data-testid={`text-post-excerpt-${post.id}`}>
                          {stripMarkdown(post.content, 100)}
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
          ) : (
            <div className="text-center py-24">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-testid="icon-no-posts" />
              <h2 className="text-2xl font-bold mb-2 font-mono" data-testid="text-no-posts-title">No updates yet</h2>
              <p className="text-muted-foreground" data-testid="text-no-posts-message">Market news coming soon</p>
            </div>
          )}
        </main>

        <footer className="border-t mt-16 py-6 bg-card">
          <div className={`${templateClasses.contentWidth} mx-auto px-6`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground font-mono" data-testid="text-footer-copyright">
                {templateClasses.footerText || `\u00A9 ${new Date().getFullYear()} ${site.title}. Real-time market data.`}
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
