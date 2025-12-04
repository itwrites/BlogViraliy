import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Twitter, Facebook, Instagram, Linkedin } from "lucide-react";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { PublicLayout } from "@/components/public-layout";
import { PublicHeader } from "@/components/public-header";
import { stripMarkdown } from "@/lib/strip-markdown";
import { motion, useReducedMotion } from "framer-motion";

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
  const prefersReducedMotion = useReducedMotion();

  const containerAnimation = prefersReducedMotion ? {} : {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.15 },
    },
  };

  const cardAnimation = prefersReducedMotion ? {} : {
    hidden: { opacity: 0, y: 25 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
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
              <motion.div 
                className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 mb-6 sm:mb-8"
                initial="hidden"
                animate="visible"
                variants={containerAnimation}
              >
                <motion.div variants={cardAnimation} className="md:row-span-2">
                  <Card
                    className={`cursor-pointer hover-elevate overflow-hidden h-full ${templateClasses.cardStyle.simple}`}
                    onClick={() => handlePostClick(featuredPost.slug)}
                    data-testid={`card-featured-post-${featuredPost.id}`}
                  >
                    <div className="aspect-[4/3] bg-muted overflow-hidden">
                      {featuredPost.imageUrl && (
                        <img 
                          src={featuredPost.imageUrl} 
                          alt={featuredPost.title} 
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                        />
                      )}
                    </div>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-wrap gap-2 mb-2 sm:mb-3">
                        {featuredPost.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={tag} variant="secondary" className="text-xs uppercase" data-testid={`badge-featured-tag-${index}`}>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-3 leading-tight line-clamp-2 hover:opacity-80 transition-opacity" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-featured-title-${featuredPost.id}`}>
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
                </motion.div>

                {secondaryPosts.map((post) => (
                  <motion.div key={post.id} variants={cardAnimation}>
                    <Card
                      className={`cursor-pointer hover-elevate overflow-hidden h-full ${templateClasses.cardStyle.simple}`}
                      onClick={() => handlePostClick(post.slug)}
                      data-testid={`card-secondary-post-${post.id}`}
                    >
                      <div className="aspect-video bg-muted overflow-hidden">
                        {post.imageUrl && (
                          <img 
                            src={post.imageUrl} 
                            alt={post.title} 
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                          />
                        )}
                      </div>
                      <CardContent className="p-3 sm:p-4">
                        <Badge variant="secondary" className="text-xs uppercase mb-2" data-testid={`badge-secondary-tag-${post.id}`}>
                          {post.tags[0] || "Article"}
                        </Badge>
                        <h3 className="font-bold text-base sm:text-lg line-clamp-2 mb-2 hover:opacity-80 transition-opacity" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-secondary-title-${post.id}`}>
                          {post.title}
                        </h3>
                        <p className="text-xs text-muted-foreground" data-testid={`text-secondary-date-${post.id}`}>
                          {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {gridPosts.length > 0 && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={prefersReducedMotion ? false : { opacity: 1 }}
                  transition={prefersReducedMotion ? {} : { delay: 0.5 }}
                >
                  <motion.h3 
                    className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 uppercase tracking-wide" 
                    style={{ fontFamily: "var(--public-heading-font)" }}
                    data-testid="text-latest-title"
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
                    animate={prefersReducedMotion ? false : { opacity: 1, x: 0 }}
                    transition={prefersReducedMotion ? {} : { delay: 0.6 }}
                  >
                    Latest Stories
                  </motion.h3>
                  <motion.div 
                    className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
                    initial={prefersReducedMotion ? false : "hidden"}
                    animate={prefersReducedMotion ? false : "visible"}
                    variants={containerAnimation}
                  >
                    {gridPosts.map((post) => (
                      <motion.div key={post.id} variants={cardAnimation}>
                        <Card
                          className={`cursor-pointer hover-elevate overflow-hidden h-full ${templateClasses.cardStyle.simple}`}
                          onClick={() => handlePostClick(post.slug)}
                          data-testid={`card-post-${post.id}`}
                        >
                          <div className="aspect-video bg-muted overflow-hidden">
                            {post.imageUrl && (
                              <img 
                                src={post.imageUrl} 
                                alt={post.title} 
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" 
                              />
                            )}
                          </div>
                          <CardContent className="p-3 sm:p-4">
                            <Badge variant="secondary" className="text-xs uppercase mb-2" data-testid={`badge-post-tag-${post.id}`}>
                              {post.tags[0] || "Article"}
                            </Badge>
                            <h4 className="font-bold text-sm line-clamp-2 hover:opacity-80 transition-opacity" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-post-title-${post.id}`}>
                              {post.title}
                            </h4>
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
              <h2 className="text-2xl font-bold mb-2 uppercase" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-no-posts-title">No stories yet</h2>
              <p className="text-muted-foreground" data-testid="text-no-posts-message">Check back soon for updates</p>
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
