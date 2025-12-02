import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, UtensilsCrossed, Twitter, Facebook, Instagram, Linkedin } from "lucide-react";
import { PublicThemeProvider, useTemplateClasses } from "@/components/public-theme-provider";
import { SeoHead } from "@/components/seo-head";

interface PublicRestaurantProps {
  site: Site;
}

export function PublicRestaurant({ site }: PublicRestaurantProps) {
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
  const latestPosts = posts?.slice(1) || [];

  return (
    <PublicThemeProvider settings={site.templateSettings}>
      <SeoHead site={site} />
      <div className="min-h-screen bg-background text-foreground">
        <header className={`bg-card border-b ${templateClasses.isHeaderSticky ? 'sticky top-0 z-50' : ''}`}>
          <div className={`${templateClasses.contentWidth} mx-auto px-6 py-6`}>
            <div className="flex items-center justify-between mb-4 gap-4">
              <div className="flex items-center gap-4">
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
                    <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-site-title">
                      {site.title}
                    </h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <UtensilsCrossed className="h-4 w-4" />
                      Food & Dining News
                    </p>
                  </div>
                )}
              </div>
            </div>
            <nav className="flex items-center gap-4 overflow-x-auto pb-2" data-testid="nav-main">
              {topTags?.slice(0, templateClasses.maxNavItems).map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="px-4 py-2 text-sm font-medium hover-elevate rounded-full bg-accent/50 whitespace-nowrap"
                  data-testid={`link-tag-${tag}`}
                >
                  {tag}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className={`${templateClasses.contentWidth} mx-auto px-6 py-10`}>
          {isLoading ? (
            <div className="space-y-8">
              <div className="h-[450px] bg-muted animate-pulse rounded-xl" />
              <div className="grid gap-6 md:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-80 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            </div>
          ) : featuredPost && templateClasses.showHero ? (
            <>
              <div className="mb-10">
                <Card
                  className={`cursor-pointer hover-elevate overflow-hidden ${templateClasses.cardStyle}`}
                  onClick={() => handlePostClick(featuredPost.slug)}
                  data-testid={`card-featured-post-${featuredPost.id}`}
                >
                  <div className="aspect-[21/9] bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950 dark:to-amber-950">
                    {featuredPost.imageUrl && <img src={featuredPost.imageUrl} alt={featuredPost.title} className="w-full h-full object-cover" />}
                  </div>
                  <CardContent className="p-8">
                    <div className="flex gap-2 mb-4">
                      {featuredPost.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={tag} className="bg-orange-500 text-white hover:bg-orange-600" data-testid={`badge-featured-tag-${index}`}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-featured-title-${featuredPost.id}`}>
                      {featuredPost.title}
                    </h2>
                    <p className="text-lg text-muted-foreground mb-4 line-clamp-2" data-testid={`text-featured-excerpt-${featuredPost.id}`}>
                      {featuredPost.content.substring(0, 200)}...
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-featured-date-${featuredPost.id}`}>
                      {new Date(featuredPost.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {latestPosts.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold mb-6" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-latest-title">
                    Latest News
                  </h3>
                  <div className="grid gap-6 md:grid-cols-3">
                    {latestPosts.map((post) => (
                      <Card
                        key={post.id}
                        className={`cursor-pointer hover-elevate overflow-hidden ${templateClasses.cardStyle}`}
                        onClick={() => handlePostClick(post.slug)}
                        data-testid={`card-post-${post.id}`}
                      >
                        <div className="aspect-video bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
                          {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />}
                        </div>
                        <CardContent className="p-5">
                          <Badge variant="secondary" className="mb-3 text-xs" data-testid={`badge-post-tag-${post.id}`}>
                            {post.tags[0] || "News"}
                          </Badge>
                          <h4 className="font-bold text-lg mb-2 line-clamp-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-post-title-${post.id}`}>
                            {post.title}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3" data-testid={`text-post-excerpt-${post.id}`}>
                            {post.content.substring(0, 100)}...
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-post-date-${post.id}`}>
                            {new Date(post.createdAt).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
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
            <div className="grid gap-6 md:grid-cols-3">
              {posts.map((post) => (
                <Card
                  key={post.id}
                  className={`cursor-pointer hover-elevate overflow-hidden ${templateClasses.cardStyle}`}
                  onClick={() => handlePostClick(post.slug)}
                  data-testid={`card-post-${post.id}`}
                >
                  <div className="aspect-video bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
                    {post.imageUrl && <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />}
                  </div>
                  <CardContent className="p-5">
                    <Badge variant="secondary" className="mb-3 text-xs" data-testid={`badge-post-tag-${post.id}`}>
                      {post.tags[0] || "News"}
                    </Badge>
                    <h4 className="font-bold text-lg mb-2 line-clamp-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-post-title-${post.id}`}>
                      {post.title}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3" data-testid={`text-post-excerpt-${post.id}`}>
                      {post.content.substring(0, 100)}...
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`text-post-date-${post.id}`}>
                      {new Date(post.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-24">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-testid="icon-no-posts" />
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-no-posts-title">
                No stories yet
              </h2>
              <p className="text-muted-foreground" data-testid="text-no-posts-message">Check back for the latest dining news</p>
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
