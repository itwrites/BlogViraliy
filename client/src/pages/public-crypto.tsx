import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, Zap, Twitter, Facebook, Instagram, Linkedin } from "lucide-react";
import { PublicThemeProvider, useTemplateClasses } from "@/components/public-theme-provider";
import { SeoHead } from "@/components/seo-head";
import { PublicHeader } from "@/components/public-header";
import { stripMarkdown } from "@/lib/strip-markdown";
import { motion, useReducedMotion } from "framer-motion";

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
  const prefersReducedMotion = useReducedMotion();

  const containerAnimation = prefersReducedMotion ? {} : {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.15 },
    },
  };

  const cardAnimation = prefersReducedMotion ? {} : {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    },
  };

  const pulseAnimation = prefersReducedMotion ? {} : {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  };

  return (
    <PublicThemeProvider settings={site.templateSettings}>
      <SeoHead site={site} />
      <div className="min-h-screen bg-background text-foreground">
        <PublicHeader
          site={site}
          topTags={topTags || []}
          onTagClick={handleTagClick}
          onLogoClick={() => setLocation("/")}
          templateClasses={templateClasses}
        />

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
              <motion.div 
                className="mb-6 sm:mb-8"
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={prefersReducedMotion ? false : { opacity: 1 }}
                transition={prefersReducedMotion ? {} : { duration: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                  <h2 className="text-base sm:text-lg font-bold font-mono uppercase tracking-wide" data-testid="text-breaking-title">
                    Breaking News
                  </h2>
                  <motion.div animate={pulseAnimation}>
                    <Badge variant="secondary" className="text-xs" data-testid="badge-live-status">
                      <Zap className="h-3 w-3 mr-1" />
                      LIVE
                    </Badge>
                  </motion.div>
                </div>
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? {} : { delay: 0.2, duration: 0.5 }}
                >
                  <Card
                    className={`cursor-pointer hover-elevate overflow-hidden border-2 border-accent/20 ${templateClasses.cardStyle}`}
                    onClick={() => handlePostClick(breakingPost.slug)}
                    data-testid={`card-breaking-post-${breakingPost.id}`}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                        <div className="md:col-span-2 flex flex-col order-2 md:order-1">
                          <div className="flex flex-wrap gap-2 mb-2 sm:mb-3">
                            {breakingPost.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={tag} variant="outline" className="text-xs font-mono uppercase" data-testid={`badge-breaking-tag-${index}`}>
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 font-mono line-clamp-2 hover:opacity-80 transition-opacity" data-testid={`text-breaking-post-title-${breakingPost.id}`}>
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
                        <div className="aspect-video md:aspect-square bg-gradient-to-br from-accent/10 to-secondary/10 rounded order-1 md:order-2 overflow-hidden">
                          {breakingPost.imageUrl && (
                            <img 
                              src={breakingPost.imageUrl} 
                              alt={breakingPost.title} 
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 rounded" 
                            />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {trendingPosts.length > 0 && (
                <motion.div 
                  className="mb-6 sm:mb-8"
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={prefersReducedMotion ? false : { opacity: 1 }}
                  transition={prefersReducedMotion ? {} : { delay: 0.3 }}
                >
                  <motion.h3 
                    className="text-base sm:text-lg font-bold font-mono uppercase tracking-wide mb-3 sm:mb-4" 
                    data-testid="text-trending-title"
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
                    animate={prefersReducedMotion ? false : { opacity: 1, x: 0 }}
                    transition={prefersReducedMotion ? {} : { delay: 0.4 }}
                  >
                    Trending Now
                  </motion.h3>
                  <motion.div 
                    className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                    initial={prefersReducedMotion ? false : "hidden"}
                    animate={prefersReducedMotion ? false : "visible"}
                    variants={containerAnimation}
                  >
                    {trendingPosts.map((post, index) => (
                      <motion.div key={post.id} variants={cardAnimation}>
                        <Card
                          className={`cursor-pointer hover-elevate overflow-hidden h-full ${templateClasses.cardStyle}`}
                          onClick={() => handlePostClick(post.slug)}
                          data-testid={`card-trending-post-${post.id}`}
                        >
                          <CardContent className="p-5">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="text-3xl font-bold text-muted-foreground/30 font-mono">
                                {String(index + 1).padStart(2, '0')}
                              </div>
                              <div className="flex-1">
                                <Badge variant="outline" className="text-xs font-mono uppercase mb-2" data-testid={`badge-trending-tag-${post.id}`}>
                                  {post.tags[0] || "Crypto"}
                                </Badge>
                                <h4 className="font-bold text-base line-clamp-2 hover:opacity-80 transition-opacity" data-testid={`text-trending-title-${post.id}`}>
                                  {post.title}
                                </h4>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono" data-testid={`text-trending-date-${post.id}`}>
                              {new Date(post.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              )}

              {latestPosts.length > 0 && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={prefersReducedMotion ? false : { opacity: 1 }}
                  transition={prefersReducedMotion ? {} : { delay: 0.5 }}
                >
                  <motion.h3 
                    className="text-base sm:text-lg font-bold font-mono uppercase tracking-wide mb-3 sm:mb-4" 
                    data-testid="text-latest-title"
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
                    animate={prefersReducedMotion ? false : { opacity: 1, x: 0 }}
                    transition={prefersReducedMotion ? {} : { delay: 0.6 }}
                  >
                    Latest Updates
                  </motion.h3>
                  <motion.div 
                    className="space-y-3"
                    initial={prefersReducedMotion ? false : "hidden"}
                    animate={prefersReducedMotion ? false : "visible"}
                    variants={containerAnimation}
                  >
                    {latestPosts.map((post) => (
                      <motion.div key={post.id} variants={cardAnimation}>
                        <Card
                          className={`cursor-pointer hover-elevate ${templateClasses.cardStyle}`}
                          onClick={() => handlePostClick(post.slug)}
                          data-testid={`card-post-${post.id}`}
                        >
                          <CardContent className="p-4 flex items-center gap-4">
                            {post.imageUrl && (
                              <div className="h-16 w-16 flex-shrink-0 bg-muted rounded overflow-hidden">
                                <img 
                                  src={post.imageUrl} 
                                  alt={post.title} 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <Badge variant="outline" className="text-xs font-mono uppercase mb-1" data-testid={`badge-post-tag-${post.id}`}>
                                {post.tags[0] || "Update"}
                              </Badge>
                              <h4 className="font-bold text-sm line-clamp-1 hover:opacity-80 transition-opacity" data-testid={`text-post-title-${post.id}`}>
                                {post.title}
                              </h4>
                              <p className="text-xs text-muted-foreground font-mono" data-testid={`text-post-date-${post.id}`}>
                                {new Date(post.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </>
          ) : (
            <div className="text-center py-24">
              <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-testid="icon-no-posts" />
              <h2 className="text-2xl font-bold font-mono mb-2" data-testid="text-no-posts-title">No updates yet</h2>
              <p className="text-muted-foreground font-mono" data-testid="text-no-posts-message">Check back soon for market news</p>
            </div>
          )}
        </main>

        <footer className="border-t mt-16 py-8 bg-card">
          <div className={`${templateClasses.contentWidth} mx-auto px-6`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground font-mono" data-testid="text-footer-copyright">
                {templateClasses.footerText || `© ${new Date().getFullYear()} ${site.title}`}
              </p>
              {templateClasses.hasSocials && (
                <div className="flex items-center gap-3">
                  {templateClasses.socials.twitter && (
                    <a href={templateClasses.socials.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-social-twitter">
                      <Twitter className="h-5 w-5" />
                    </a>
                  )}
                  {templateClasses.socials.facebook && (
                    <a href={templateClasses.socials.facebook} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-social-facebook">
                      <Facebook className="h-5 w-5" />
                    </a>
                  )}
                  {templateClasses.socials.instagram && (
                    <a href={templateClasses.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-social-instagram">
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                  {templateClasses.socials.linkedin && (
                    <a href={templateClasses.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-social-linkedin">
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
