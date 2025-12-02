import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink, Twitter, Facebook, Instagram, Linkedin } from "lucide-react";
import { PublicThemeProvider, useTemplateClasses } from "@/components/public-theme-provider";
import { SeoHead } from "@/components/seo-head";
import { MobileNav } from "@/components/mobile-nav";
import { stripMarkdown } from "@/lib/strip-markdown";

interface PublicPortfolioProps {
  site: Site;
}

export function PublicPortfolio({ site }: PublicPortfolioProps) {
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

  return (
    <PublicThemeProvider settings={site.templateSettings}>
      <SeoHead site={site} />
      <div className="min-h-screen bg-background text-foreground">
        <header className={`border-b bg-card ${templateClasses.isHeaderSticky ? 'sticky top-0 z-50' : ''}`}>
          <div className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-6 sm:py-8`}>
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
                    className="object-cover rounded-full"
                    data-testid="img-site-logo"
                  />
                )}
                {(!templateClasses.hideLogoText || !site.logoUrl) && (
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-light tracking-wide" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-site-title">
                      {site.title}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Portfolio & Work</p>
                  </div>
                )}
              </div>
              <nav className="hidden md:flex items-center gap-4" data-testid="nav-main">
                {topTags?.slice(0, Math.min(templateClasses.maxNavItems, 5)).map((tag) => (
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

        <main className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-10 sm:py-16`}>
          {isLoading ? (
            <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-72 sm:h-96 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="grid gap-8 sm:gap-12 grid-cols-1 md:grid-cols-2">
              {posts.map((post, index) => (
                <Card
                  key={post.id}
                  className={`cursor-pointer hover-elevate overflow-hidden group ${index === 0 && templateClasses.showHero ? 'md:col-span-2' : ''} ${templateClasses.cardStyle}`}
                  onClick={() => handlePostClick(post.slug)}
                  data-testid={`card-post-${post.id}`}
                >
                  <div className={`${index === 0 && templateClasses.showHero ? 'aspect-[16/9] md:aspect-[21/9]' : 'aspect-[4/3]'} bg-muted relative`}>
                    {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <ExternalLink className="h-6 w-6 sm:h-8 sm:w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <CardContent className={`${index === 0 && templateClasses.showHero ? 'p-6 sm:p-10' : 'p-4 sm:p-6'}`}>
                    <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                      {post.tags.slice(0, 3).map((tag, tagIndex) => (
                        <Badge key={tag} variant="outline" className="text-xs" data-testid={`badge-post-tag-${post.id}-${tagIndex}`}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <h3 className={`${index === 0 && templateClasses.showHero ? 'text-xl sm:text-2xl md:text-3xl' : 'text-lg sm:text-2xl'} font-light mb-2 sm:mb-3 line-clamp-2`} style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-post-title-${post.id}`}>
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground line-clamp-2 mb-3 sm:mb-4 text-sm" data-testid={`text-post-excerpt-${post.id}`}>
                      {stripMarkdown(post.content, 120)}
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
              <h2 className="text-2xl font-light mb-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-no-posts-title">No projects yet</h2>
              <p className="text-muted-foreground" data-testid="text-no-posts-message">Portfolio coming soon</p>
            </div>
          )}
        </main>

        <footer className="border-t mt-24 py-12 bg-card">
          <div className={`${templateClasses.contentWidth} mx-auto px-6`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground" data-testid="text-footer-copyright">
                {templateClasses.footerText || `\u00A9 ${new Date().getFullYear()} ${site.title}`}
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
