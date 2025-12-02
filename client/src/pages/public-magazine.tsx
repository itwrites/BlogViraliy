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

interface PublicMagazineProps {
  site: Site;
}

export function PublicMagazine({ site }: PublicMagazineProps) {
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
  const secondaryPosts = posts?.slice(1, 3) || [];
  const gridPosts = posts?.slice(3) || [];

  return (
    <PublicThemeProvider settings={site.templateSettings}>
      <SeoHead site={site} />
      <div className="min-h-screen bg-background text-foreground">
        <header className={`border-b bg-card ${templateClasses.isHeaderSticky ? 'sticky top-0 z-50' : ''}`}>
          <div className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-4 sm:py-6`}>
            <div className="flex items-center justify-between md:justify-center mb-4">
              <MobileNav 
                tags={topTags || []} 
                onTagClick={handleTagClick} 
                siteTitle={site.title} 
              />
              <div className="text-center flex-1 md:flex-none">
                {site.logoUrl && (
                  <img
                    src={site.logoUrl}
                    alt={`${site.title} logo`}
                    className={`${templateClasses.logoSize} object-cover rounded mx-auto mb-2 sm:mb-3`}
                    data-testid="img-site-logo"
                  />
                )}
                {(!templateClasses.hideLogoText || !site.logoUrl) && (
                  <h1 className="text-2xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-site-title">
                    {site.title}
                  </h1>
                )}
              </div>
              <div className="w-10 md:hidden" />
            </div>
            <nav className="hidden md:flex items-center justify-center gap-6 border-t border-b py-3" data-testid="nav-main">
              {topTags?.slice(0, templateClasses.maxNavItems).map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="text-sm font-semibold uppercase tracking-wide hover-elevate px-2 py-1 rounded"
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
              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                <div className="h-[300px] sm:h-[400px] bg-muted animate-pulse rounded" />
                <div className="space-y-4 sm:space-y-6">
                  <div className="h-[150px] sm:h-[190px] bg-muted animate-pulse rounded" />
                  <div className="h-[150px] sm:h-[190px] bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>
          ) : featuredPost && templateClasses.showHero ? (
            <>
              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 mb-6 sm:mb-8">
                <Card
                  className={`cursor-pointer hover-elevate overflow-hidden md:row-span-2 ${templateClasses.cardStyle}`}
                  onClick={() => handlePostClick(featuredPost.slug)}
                  data-testid={`card-featured-post-${featuredPost.id}`}
                >
                  <div className="aspect-[4/3] bg-muted">
                    {featuredPost.imageUrl && <img src={featuredPost.imageUrl} alt={featuredPost.title} className="w-full h-full object-cover" />}
                  </div>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-wrap gap-2 mb-2 sm:mb-3">
                      {featuredPost.tags.slice(0, 2).map((tag, index) => (
                        <Badge key={tag} className="text-xs uppercase" data-testid={`badge-featured-tag-${index}`}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 leading-tight line-clamp-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-featured-title-${featuredPost.id}`}>
                      {featuredPost.title}
                    </h2>
                    <p className="text-muted-foreground line-clamp-2 sm:line-clamp-3 mb-2 sm:mb-3 text-sm" data-testid={`text-featured-excerpt-${featuredPost.id}`}>
                      {stripMarkdown(featuredPost.content, 150)}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`text-featured-date-${featuredPost.id}`}>
                      {new Date(featuredPost.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </CardContent>
                </Card>

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
                    <CardContent className="p-3 sm:p-4">
                      <Badge className="text-xs uppercase mb-2" data-testid={`badge-secondary-tag-${post.id}`}>
                        {post.tags[0] || "Article"}
                      </Badge>
                      <h3 className="font-bold text-base sm:text-lg line-clamp-2 mb-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-secondary-title-${post.id}`}>
                        {post.title}
                      </h3>
                      <p className="text-xs text-muted-foreground" data-testid={`text-secondary-date-${post.id}`}>
                        {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {gridPosts.length > 0 && (
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pb-3 border-b uppercase tracking-wide" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-latest-title">
                    Latest Stories
                  </h3>
                  <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                    {gridPosts.map((post) => (
                      <Card
                        key={post.id}
                        className={`cursor-pointer hover-elevate overflow-hidden ${templateClasses.cardStyle}`}
                        onClick={() => handlePostClick(post.slug)}
                        data-testid={`card-post-${post.id}`}
                      >
                        <div className="aspect-square bg-muted">
                          {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />}
                        </div>
                        <CardContent className="p-4">
                          <Badge variant="secondary" className="text-xs mb-2" data-testid={`badge-post-tag-${post.id}`}>
                            {post.tags[0] || "Article"}
                          </Badge>
                          <h4 className="font-bold text-sm line-clamp-3 mb-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-post-title-${post.id}`}>
                            {post.title}
                          </h4>
                          <p className="text-xs text-muted-foreground" data-testid={`text-post-date-${post.id}`}>
                            {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : posts && posts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
              {posts.map((post) => (
                <Card
                  key={post.id}
                  className={`cursor-pointer hover-elevate overflow-hidden ${templateClasses.cardStyle}`}
                  onClick={() => handlePostClick(post.slug)}
                  data-testid={`card-post-${post.id}`}
                >
                  <div className="aspect-square bg-muted">
                    {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />}
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="secondary" className="text-xs mb-2" data-testid={`badge-post-tag-${post.id}`}>
                      {post.tags[0] || "Article"}
                    </Badge>
                    <h4 className="font-bold text-sm line-clamp-3 mb-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-post-title-${post.id}`}>
                      {post.title}
                    </h4>
                    <p className="text-xs text-muted-foreground" data-testid={`text-post-date-${post.id}`}>
                      {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-testid="icon-no-posts" />
              <h2 className="text-2xl font-semibold mb-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-no-posts-title">No posts yet</h2>
              <p className="text-muted-foreground" data-testid="text-no-posts-message">Check back soon for new content</p>
            </div>
          )}
        </main>

        <footer className="border-t mt-16 py-8 bg-card">
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
