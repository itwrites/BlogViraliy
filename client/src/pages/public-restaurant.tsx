import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, UtensilsCrossed, Twitter, Facebook, Instagram, Linkedin } from "lucide-react";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { PublicLayout } from "@/components/public-layout";
import { PublicHeader } from "@/components/public-header";
import { stripMarkdown } from "@/lib/strip-markdown";
import { motion, useReducedMotion } from "framer-motion";

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
  const prefersReducedMotion = useReducedMotion();

  const containerAnimation = prefersReducedMotion ? {} : {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.2 },
    },
  };

  const cardAnimation = prefersReducedMotion ? {} : {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    },
  };

  const heroAnimation = prefersReducedMotion ? {} : {
    hidden: { opacity: 0, scale: 1.02 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    },
  };

  return (
    <PublicLayout site={site}>
      <div className="min-h-screen bg-background text-foreground">
        <PublicHeader
          site={site}
          topTags={topTags || []}
          onTagClick={handleTagClick}
          onLogoClick={() => setLocation("/")}
          templateClasses={templateClasses}
        />

        <main className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-8 sm:py-10`}>
          {isLoading ? (
            <div className="space-y-6 sm:space-y-8">
              <div className="h-[300px] sm:h-[450px] bg-muted animate-pulse rounded-xl" />
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-60 sm:h-80 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            </div>
          ) : featuredPost && templateClasses.showHero ? (
            <>
              <motion.div 
                className="mb-8 sm:mb-10"
                initial="hidden"
                animate="visible"
                variants={heroAnimation}
              >
                <Card
                  className={`cursor-pointer hover-elevate overflow-hidden ${templateClasses.cardStyle.simple}`}
                  onClick={() => handlePostClick(featuredPost.slug)}
                  data-testid={`card-featured-post-${featuredPost.id}`}
                >
                  <div className="aspect-[16/9] md:aspect-[21/9] bg-gradient-to-br from-accent/10 to-secondary/10 overflow-hidden">
                    {featuredPost.imageUrl && (
                      <img 
                        src={featuredPost.imageUrl} 
                        alt={featuredPost.title} 
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                      />
                    )}
                  </div>
                  <CardContent className="p-5 sm:p-8">
                    <motion.div 
                      className="flex flex-wrap gap-2 mb-3 sm:mb-4"
                      initial="hidden"
                      animate="visible"
                      variants={containerAnimation}
                    >
                      {featuredPost.tags.slice(0, 3).map((tag, index) => (
                        <motion.div key={tag} variants={cardAnimation}>
                          <Badge variant="secondary" className="text-xs" data-testid={`badge-featured-tag-${index}`}>
                            {tag}
                          </Badge>
                        </motion.div>
                      ))}
                    </motion.div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 line-clamp-2 hover:opacity-80 transition-opacity" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-featured-title-${featuredPost.id}`}>
                      {featuredPost.title}
                    </h2>
                    <p className="text-sm sm:text-lg text-muted-foreground mb-3 sm:mb-4 line-clamp-2" data-testid={`text-featured-excerpt-${featuredPost.id}`}>
                      {stripMarkdown(featuredPost.content, 200)}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground" data-testid={`text-featured-date-${featuredPost.id}`}>
                      {new Date(featuredPost.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {latestPosts.length > 0 && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={prefersReducedMotion ? false : { opacity: 1 }}
                  transition={prefersReducedMotion ? {} : { delay: 0.4 }}
                >
                  <motion.h3 
                    className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" 
                    style={{ fontFamily: "var(--public-heading-font)" }} 
                    data-testid="text-latest-title"
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
                    animate={prefersReducedMotion ? false : { opacity: 1, x: 0 }}
                    transition={prefersReducedMotion ? {} : { delay: 0.5 }}
                  >
                    Latest News
                  </motion.h3>
                  <motion.div 
                    className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                    initial={prefersReducedMotion ? false : "hidden"}
                    animate={prefersReducedMotion ? false : "visible"}
                    variants={containerAnimation}
                  >
                    {latestPosts.map((post) => (
                      <motion.div key={post.id} variants={cardAnimation}>
                        <Card
                          className={`cursor-pointer hover-elevate overflow-hidden h-full ${templateClasses.cardStyle.simple}`}
                          onClick={() => handlePostClick(post.slug)}
                          data-testid={`card-post-${post.id}`}
                        >
                          <div className="aspect-video bg-gradient-to-br from-accent/5 to-secondary/5 overflow-hidden">
                            {post.imageUrl && (
                              <img 
                                src={post.imageUrl} 
                                alt={post.title} 
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                              />
                            )}
                          </div>
                          <CardContent className="p-5">
                            <Badge variant="secondary" className="mb-3 text-xs" data-testid={`badge-post-tag-${post.id}`}>
                              {post.tags[0] || "News"}
                            </Badge>
                            <h4 className="font-bold text-lg mb-2 line-clamp-2 hover:opacity-80 transition-opacity" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-post-title-${post.id}`}>
                              {post.title}
                            </h4>
                            <p className="text-muted-foreground text-sm line-clamp-2 mb-3" data-testid={`text-post-excerpt-${post.id}`}>
                              {stripMarkdown(post.content, 100)}
                            </p>
                            <p className="text-xs text-muted-foreground" data-testid={`text-post-date-${post.id}`}>
                              {new Date(post.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
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
              <UtensilsCrossed className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-testid="icon-no-posts" />
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-no-posts-title">No dishes yet</h2>
              <p className="text-muted-foreground" data-testid="text-no-posts-message">Check back soon for delicious updates</p>
            </div>
          )}
        </main>

        <footer className="border-t mt-16 py-8 bg-card">
          <div className={`${templateClasses.contentWidth} mx-auto px-6`}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground" data-testid="text-footer-copyright">
                {templateClasses.footerText || `© ${new Date().getFullYear()} ${site.title}. All rights reserved.`}
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
    </PublicLayout>
  );
}
