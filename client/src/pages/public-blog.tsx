import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Twitter, Facebook, Instagram, Linkedin } from "lucide-react";
import { PublicThemeProvider, useTemplateClasses } from "@/components/public-theme-provider";
import { SeoHead } from "@/components/seo-head";
import { MobileNav } from "@/components/mobile-nav";
import { stripMarkdown } from "@/lib/strip-markdown";

interface PublicBlogProps {
  site: Site;
}

export function PublicBlog({ site }: PublicBlogProps) {
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
  const recentPosts = posts?.slice(1) || [];

  return (
    <PublicThemeProvider settings={site.templateSettings}>
      <SeoHead site={site} />
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className={`${templateClasses.isHeaderSticky ? 'sticky top-0 z-50' : ''} border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80`}>
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
                    className={`${templateClasses.logoSize} object-cover rounded`}
                    data-testid="img-site-logo"
                  />
                )}
                {(!templateClasses.hideLogoText || !site.logoUrl) && (
                  <h1 className="text-xl sm:text-2xl font-semibold" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-site-title">{site.title}</h1>
                )}
              </div>
              <nav className="hidden md:flex items-center gap-1 overflow-x-auto" data-testid="nav-main">
                {topTags?.slice(0, templateClasses.maxNavItems).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className="px-3 py-2 text-sm hover-elevate rounded-md whitespace-nowrap"
                    data-testid={`link-tag-${tag}`}
                  >
                    {tag}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </header>

        <main className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-8 sm:py-12`}>
          {isLoading ? (
            <div className="space-y-8">
              <div className="h-[300px] sm:h-[500px] bg-muted animate-pulse rounded-lg" />
              <div className="grid gap-4 sm:gap-8 grid-cols-1 sm:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            </div>
          ) : featuredPost && templateClasses.showHero ? (
          <>
            {/* Featured Post Hero */}
            <div
              className="relative h-[300px] sm:h-[400px] md:h-[500px] rounded-lg overflow-hidden mb-8 sm:mb-12 cursor-pointer group"
              onClick={() => handlePostClick(featuredPost.slug)}
              data-testid={`card-featured-post-${featuredPost.id}`}
            >
              {featuredPost.imageUrl ? (
                <img src={featuredPost.imageUrl} alt={featuredPost.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 z-10" />
              <div className="absolute inset-0 flex items-end p-6 sm:p-8 md:p-12 z-20">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                    {featuredPost.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={tag} variant="secondary" className="bg-background/90 text-xs sm:text-sm" data-testid={`badge-featured-tag-${index}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <h2 className="text-2xl sm:text-3xl md:text-5xl font-blog font-bold text-white mb-2 sm:mb-4 group-hover:underline line-clamp-3" data-testid={`text-featured-title-${featuredPost.id}`}>
                    {featuredPost.title}
                  </h2>
                  <p className="text-sm sm:text-lg text-white/90 line-clamp-2 hidden sm:block" data-testid={`text-featured-excerpt-${featuredPost.id}`}>
                    {stripMarkdown(featuredPost.content, 200)}
                  </p>
                  <p className="text-xs sm:text-sm text-white/70 mt-2 sm:mt-4" data-testid={`text-featured-date-${featuredPost.id}`}>
                    {new Date(featuredPost.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Posts Grid */}
            {recentPosts.length > 0 && (
              <div>
                <h3 className="text-xl sm:text-2xl font-blog font-semibold mb-4 sm:mb-6" data-testid="text-recent-posts-title">Recent Posts</h3>
                <div className="grid gap-4 sm:gap-8 grid-cols-1 sm:grid-cols-2">
                  {recentPosts.map((post) => (
                    <Card
                      key={post.id}
                      className={`cursor-pointer hover-elevate overflow-hidden ${templateClasses.cardStyle}`}
                      onClick={() => handlePostClick(post.slug)}
                      data-testid={`card-post-${post.id}`}
                    >
                      <div className="aspect-video bg-muted">
                        {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />}
                      </div>
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-wrap gap-2 mb-2 sm:mb-3">
                          {post.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={tag} variant="secondary" className="text-xs" data-testid={`badge-post-tag-${post.id}-${index}`}>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <h3 className="text-lg sm:text-xl font-blog font-semibold mb-2 line-clamp-2 group-hover:underline" data-testid={`text-post-title-${post.id}`}>
                          {post.title}
                        </h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-2 sm:mb-3" data-testid={`text-post-excerpt-${post.id}`}>
                          {stripMarkdown(post.content, 150)}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-post-date-${post.id}`}>
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
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-testid="icon-no-posts" />
            <h2 className="text-2xl font-blog font-semibold mb-2" data-testid="text-no-posts-title">No posts yet</h2>
            <p className="text-muted-foreground" data-testid="text-no-posts-message">Check back soon for new content</p>
          </div>
        )}
      </main>

        {/* Footer */}
        <footer className="border-t mt-24 py-8 bg-card">
          <div className={`${templateClasses.contentWidth} mx-auto px-6`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground" data-testid="text-footer-copyright">
                {templateClasses.footerText || `\u00A9 ${new Date().getFullYear()} ${site.title}. All rights reserved.`}
              </p>
              {templateClasses.hasSocials && (
                <div className="flex items-center gap-3">
                  {templateClasses.socials.twitter && (
                    <a href={templateClasses.socials.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" data-testid="link-social-twitter">
                      <Twitter className="h-5 w-5" />
                    </a>
                  )}
                  {templateClasses.socials.facebook && (
                    <a href={templateClasses.socials.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" data-testid="link-social-facebook">
                      <Facebook className="h-5 w-5" />
                    </a>
                  )}
                  {templateClasses.socials.instagram && (
                    <a href={templateClasses.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" data-testid="link-social-instagram">
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                  {templateClasses.socials.linkedin && (
                    <a href={templateClasses.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" data-testid="link-social-linkedin">
                      <Linkedin className="h-5 w-5" />
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
