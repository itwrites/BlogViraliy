import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Twitter, Facebook, Instagram, Linkedin } from "lucide-react";
import { PublicThemeProvider, useTemplateClasses } from "@/components/public-theme-provider";
import { SeoHead } from "@/components/seo-head";
import { PublicHeader } from "@/components/public-header";
import { stripMarkdown } from "@/lib/strip-markdown";
import { motion, useReducedMotion } from "framer-motion";

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
      transition: { duration: 0.7, ease: "easeOut" }
    },
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
            <motion.div
              initial={prefersReducedMotion ? false : "hidden"}
              animate={prefersReducedMotion ? false : "visible"}
              variants={heroAnimation}
              className="relative h-[300px] sm:h-[400px] md:h-[500px] rounded-xl overflow-hidden mb-8 sm:mb-12 cursor-pointer group"
              onClick={() => handlePostClick(featuredPost.slug)}
              data-testid={`card-featured-post-${featuredPost.id}`}
              whileHover={prefersReducedMotion ? {} : { scale: 1.005 }}
              transition={prefersReducedMotion ? {} : { duration: 0.3 }}
            >
              {featuredPost.imageUrl ? (
                <motion.img 
                  src={featuredPost.imageUrl} 
                  alt={featuredPost.title} 
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={prefersReducedMotion ? false : { scale: 1.1 }}
                  animate={prefersReducedMotion ? false : { scale: 1 }}
                  transition={prefersReducedMotion ? {} : { duration: 1.2, ease: "easeOut" }}
                />
              ) : (
                <div className="absolute inset-0 bg-muted" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 z-10" />
              <motion.div 
                className="absolute inset-0 flex items-end p-6 sm:p-8 md:p-12 z-20"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
                transition={prefersReducedMotion ? {} : { delay: 0.3, duration: 0.5 }}
              >
                <div className="max-w-3xl">
                  <motion.div 
                    className="flex flex-wrap gap-2 mb-3 sm:mb-4"
                    initial={prefersReducedMotion ? false : "hidden"}
                    animate={prefersReducedMotion ? false : "visible"}
                    variants={containerAnimation}
                  >
                    {featuredPost.tags.slice(0, 3).map((tag, index) => (
                      <motion.div key={tag} variants={cardAnimation}>
                        <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 text-xs sm:text-sm" data-testid={`badge-featured-tag-${index}`}>
                          {tag}
                        </Badge>
                      </motion.div>
                    ))}
                  </motion.div>
                  <h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold text-white mb-2 sm:mb-4 group-hover:underline decoration-2 underline-offset-4 line-clamp-3" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-featured-title-${featuredPost.id}`}>
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
              </motion.div>
            </motion.div>

            {recentPosts.length > 0 && (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={prefersReducedMotion ? false : { opacity: 1 }}
                transition={prefersReducedMotion ? {} : { delay: 0.4 }}
              >
                <motion.h3 
                  className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6" 
                  style={{ fontFamily: "var(--public-heading-font)" }}
                  data-testid="text-recent-posts-title"
                  initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
                  animate={prefersReducedMotion ? false : { opacity: 1, x: 0 }}
                  transition={prefersReducedMotion ? {} : { delay: 0.5 }}
                >
                  Recent Posts
                </motion.h3>
                <motion.div 
                  className="grid gap-4 sm:gap-8 grid-cols-1 sm:grid-cols-2"
                  initial={prefersReducedMotion ? false : "hidden"}
                  animate={prefersReducedMotion ? false : "visible"}
                  variants={containerAnimation}
                >
                  {recentPosts.map((post) => (
                    <motion.div key={post.id} variants={cardAnimation}>
                      <Card
                        className={`cursor-pointer hover-elevate overflow-hidden group h-full ${templateClasses.cardStyle}`}
                        onClick={() => handlePostClick(post.slug)}
                        data-testid={`card-post-${post.id}`}
                      >
                        <div className="aspect-video bg-muted overflow-hidden">
                          {post.imageUrl && (
                            <img 
                              src={post.imageUrl} 
                              alt={post.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            />
                          )}
                        </div>
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex flex-wrap gap-2 mb-2 sm:mb-3">
                            {post.tags.slice(0, 2).map((tag, index) => (
                              <Badge key={tag} variant="secondary" className="text-xs" data-testid={`badge-post-tag-${post.id}-${index}`}>
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <h3 className="text-lg sm:text-xl font-semibold mb-2 line-clamp-2 group-hover:text-muted-foreground transition-colors" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-post-title-${post.id}`}>
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
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
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
