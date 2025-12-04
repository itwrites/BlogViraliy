import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, ArrowRight, Twitter, Facebook, Instagram, Linkedin } from "lucide-react";
import { PublicThemeProvider, useTemplateClasses } from "@/components/public-theme-provider";
import { SeoHead } from "@/components/seo-head";
import { PublicHeader } from "@/components/public-header";
import { stripMarkdown } from "@/lib/strip-markdown";
import { motion, useReducedMotion, type Variants } from "framer-motion";

interface PublicBlogProps {
  site: Site;
}

function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PublicBlog({ site }: PublicBlogProps) {
  const [, setLocation] = useLocation();
  const templateClasses = useTemplateClasses(site.templateSettings);
  const prefersReducedMotion = useReducedMotion();

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

  const containerVariants: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.15 },
    },
  };

  const itemVariants: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 24 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }
    },
  };

  const heroVariants: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    },
  };

  const textRevealVariants: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
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

        <main className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 lg:px-8`}>
          {isLoading ? (
            <div className="py-12 sm:py-16 space-y-16">
              <div className="relative">
                <div className="aspect-[21/9] bg-muted/50 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-muted/80 via-muted/40 to-muted/80 animate-pulse" />
                </div>
                <div className="mt-8 space-y-4">
                  <div className="h-4 w-24 bg-muted/60 rounded animate-pulse" />
                  <div className="h-10 w-3/4 bg-muted/50 rounded animate-pulse" />
                  <div className="h-6 w-1/2 bg-muted/40 rounded animate-pulse" />
                </div>
              </div>
              <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <div className="aspect-[4/3] bg-muted/50 rounded-xl animate-pulse" />
                    <div className="space-y-3">
                      <div className="h-3 w-20 bg-muted/40 rounded animate-pulse" />
                      <div className="h-6 w-full bg-muted/50 rounded animate-pulse" />
                      <div className="h-4 w-3/4 bg-muted/40 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : featuredPost && templateClasses.showHero ? (
            <>
              {/* Hero Featured Post - Editorial Style */}
              <motion.article
                initial={prefersReducedMotion ? false : "hidden"}
                animate={prefersReducedMotion ? false : "visible"}
                variants={heroVariants}
                className="py-12 sm:py-16 lg:py-20"
              >
                <div 
                  className="group cursor-pointer"
                  onClick={() => handlePostClick(featuredPost.slug)}
                  data-testid={`card-featured-post-${featuredPost.id}`}
                >
                  {/* Featured Image with Cinematic Aspect */}
                  <div className="relative aspect-[21/9] sm:aspect-[2/1] lg:aspect-[21/9] rounded-2xl overflow-hidden bg-muted">
                    {featuredPost.imageUrl ? (
                      <motion.img 
                        src={featuredPost.imageUrl} 
                        alt={featuredPost.title} 
                        className="absolute inset-0 w-full h-full object-cover"
                        initial={prefersReducedMotion ? false : { scale: 1.05 }}
                        animate={prefersReducedMotion ? false : { scale: 1 }}
                        transition={prefersReducedMotion ? undefined : { duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20" />
                    )}
                    {/* Elegant Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  {/* Featured Content - Clean Editorial Layout */}
                  <motion.div 
                    className="mt-8 sm:mt-10 lg:mt-12 max-w-4xl"
                    variants={textRevealVariants}
                  >
                    {/* Category & Meta */}
                    <div className="flex items-center gap-4 mb-4 sm:mb-6">
                      {featuredPost.tags[0] && (
                        <span 
                          className="text-xs sm:text-sm font-semibold uppercase tracking-[0.15em] text-primary"
                          data-testid={`badge-featured-category-${featuredPost.id}`}
                        >
                          {featuredPost.tags[0]}
                        </span>
                      )}
                      <span className="text-muted-foreground/60">·</span>
                      <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {getReadingTime(featuredPost.content)} min read
                      </span>
                    </div>

                    {/* Title - Dramatic Typography */}
                    <h1 
                      className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-4 sm:mb-6 group-hover:text-primary/90 transition-colors duration-300"
                      style={{ fontFamily: "var(--public-heading-font)" }}
                      data-testid={`text-featured-title-${featuredPost.id}`}
                    >
                      {featuredPost.title}
                    </h1>

                    {/* Excerpt - Refined */}
                    <p 
                      className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-3xl"
                      data-testid={`text-featured-excerpt-${featuredPost.id}`}
                    >
                      {stripMarkdown(featuredPost.content, 180)}
                    </p>

                    {/* Date & Read More */}
                    <div className="flex items-center gap-6 mt-6 sm:mt-8">
                      <time 
                        className="text-sm text-muted-foreground"
                        data-testid={`text-featured-date-${featuredPost.id}`}
                      >
                        {formatDate(featuredPost.createdAt)}
                      </time>
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all duration-300">
                        Read article
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </motion.div>
                </div>
              </motion.article>

              {/* Recent Posts Grid - Editorial Cards */}
              {recentPosts.length > 0 && (
                <section className="pb-16 sm:pb-20 lg:pb-24">
                  {/* Section Divider */}
                  <motion.div 
                    className="flex items-center gap-4 mb-10 sm:mb-12"
                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                    animate={prefersReducedMotion ? false : { opacity: 1 }}
                    transition={prefersReducedMotion ? undefined : { delay: 0.3, duration: 0.4 }}
                  >
                    <h2 
                      className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                      style={{ fontFamily: "var(--public-heading-font)" }}
                      data-testid="text-recent-posts-title"
                    >
                      Latest Stories
                    </h2>
                    <div className="flex-1 h-px bg-border" />
                  </motion.div>

                  <motion.div 
                    className="grid gap-x-8 gap-y-12 sm:gap-y-14 md:grid-cols-2 lg:grid-cols-3"
                    initial={prefersReducedMotion ? false : "hidden"}
                    animate={prefersReducedMotion ? false : "visible"}
                    variants={containerVariants}
                  >
                    {recentPosts.map((post, index) => (
                      <motion.article 
                        key={post.id} 
                        variants={itemVariants}
                        className={`group cursor-pointer ${templateClasses.cardStyle.container} ${templateClasses.cardStyle.hover} overflow-hidden`}
                        onClick={() => handlePostClick(post.slug)}
                        data-testid={`card-post-${post.id}`}
                      >
                        {/* Image Container */}
                        <div className={`relative aspect-[4/3] overflow-hidden bg-muted ${templateClasses.cardStyle.image}`}>
                          {post.imageUrl ? (
                            <motion.img 
                              src={post.imageUrl} 
                              alt={post.title} 
                              className="absolute inset-0 w-full h-full object-cover"
                              whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
                              transition={prefersReducedMotion ? undefined : { duration: 0.4, ease: "easeOut" }}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted to-muted-foreground/5" />
                          )}
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                        </div>

                        {/* Content */}
                        <div className="space-y-3 p-5">
                          {/* Category & Reading Time */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {post.tags[0] && (
                              <>
                                <span 
                                  className="font-semibold uppercase tracking-[0.12em] text-primary/80"
                                  data-testid={`badge-post-category-${post.id}`}
                                >
                                  {post.tags[0]}
                                </span>
                                <span className="text-muted-foreground/40">·</span>
                              </>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {getReadingTime(post.content)} min
                            </span>
                          </div>

                          {/* Title */}
                          <h3 
                            className="text-xl sm:text-[1.35rem] font-semibold leading-snug tracking-tight line-clamp-2 group-hover:text-primary transition-colors duration-300"
                            style={{ fontFamily: "var(--public-heading-font)" }}
                            data-testid={`text-post-title-${post.id}`}
                          >
                            {post.title}
                          </h3>

                          {/* Excerpt */}
                          <p 
                            className="text-muted-foreground text-sm leading-relaxed line-clamp-2"
                            data-testid={`text-post-excerpt-${post.id}`}
                          >
                            {stripMarkdown(post.content, 120)}
                          </p>

                          {/* Date */}
                          <time 
                            className="block text-xs text-muted-foreground/70 pt-1"
                            data-testid={`text-post-date-${post.id}`}
                          >
                            {formatDate(post.createdAt)}
                          </time>
                        </div>
                      </motion.article>
                    ))}
                  </motion.div>
                </section>
              )}
            </>
          ) : posts && posts.length > 0 && !templateClasses.showHero ? (
            /* All Posts Grid (No Hero) */
            <section className="py-12 sm:py-16 lg:py-20">
              <motion.div 
                className="grid gap-x-8 gap-y-12 sm:gap-y-14 md:grid-cols-2 lg:grid-cols-3"
                initial={prefersReducedMotion ? false : "hidden"}
                animate={prefersReducedMotion ? false : "visible"}
                variants={containerVariants}
              >
                {posts.map((post) => (
                  <motion.article 
                    key={post.id} 
                    variants={itemVariants}
                    className={`group cursor-pointer ${templateClasses.cardStyle.container} ${templateClasses.cardStyle.hover} overflow-hidden`}
                    onClick={() => handlePostClick(post.slug)}
                    data-testid={`card-post-${post.id}`}
                  >
                    <div className={`relative aspect-[4/3] overflow-hidden bg-muted ${templateClasses.cardStyle.image}`}>
                      {post.imageUrl ? (
                        <motion.img 
                          src={post.imageUrl} 
                          alt={post.title} 
                          className="absolute inset-0 w-full h-full object-cover"
                          whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
                          transition={prefersReducedMotion ? undefined : { duration: 0.4, ease: "easeOut" }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted to-muted-foreground/5" />
                      )}
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
                    </div>

                    <div className="space-y-3 p-5">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {post.tags[0] && (
                          <>
                            <span className="font-semibold uppercase tracking-[0.12em] text-primary/80">
                              {post.tags[0]}
                            </span>
                            <span className="text-muted-foreground/40">·</span>
                          </>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getReadingTime(post.content)} min
                        </span>
                      </div>

                      <h3 
                        className="text-xl sm:text-[1.35rem] font-semibold leading-snug tracking-tight line-clamp-2 group-hover:text-primary transition-colors duration-300"
                        style={{ fontFamily: "var(--public-heading-font)" }}
                      >
                        {post.title}
                      </h3>

                      <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                        {stripMarkdown(post.content, 120)}
                      </p>

                      <time className="block text-xs text-muted-foreground/70 pt-1">
                        {formatDate(post.createdAt)}
                      </time>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            </section>
          ) : (
            /* Empty State - Sophisticated */
            <motion.div 
              className="text-center py-32 sm:py-40"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? undefined : { duration: 0.5 }}
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mb-6">
                <FileText className="h-10 w-10 text-muted-foreground/60" data-testid="icon-no-posts" />
              </div>
              <h2 
                className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3" 
                style={{ fontFamily: "var(--public-heading-font)" }}
                data-testid="text-no-posts-title"
              >
                Coming Soon
              </h2>
              <p className="text-muted-foreground text-lg max-w-md mx-auto" data-testid="text-no-posts-message">
                We're working on something great. Check back soon for new stories.
              </p>
            </motion.div>
          )}
        </main>

        {/* Footer - Refined */}
        <footer className="border-t py-10 sm:py-12 mt-8">
          <div className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 lg:px-8`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <p className="text-sm text-muted-foreground" data-testid="text-footer-copyright">
                {templateClasses.footerText || `© ${new Date().getFullYear()} ${site.title}`}
              </p>
              {templateClasses.hasSocials && (
                <div className="flex items-center gap-4">
                  {templateClasses.socials.twitter && (
                    <a 
                      href={templateClasses.socials.twitter} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-muted-foreground hover:text-primary transition-colors duration-200" 
                      data-testid="link-social-twitter"
                    >
                      <Twitter className="h-5 w-5" />
                    </a>
                  )}
                  {templateClasses.socials.facebook && (
                    <a 
                      href={templateClasses.socials.facebook} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-muted-foreground hover:text-primary transition-colors duration-200" 
                      data-testid="link-social-facebook"
                    >
                      <Facebook className="h-5 w-5" />
                    </a>
                  )}
                  {templateClasses.socials.instagram && (
                    <a 
                      href={templateClasses.socials.instagram} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-muted-foreground hover:text-primary transition-colors duration-200" 
                      data-testid="link-social-instagram"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                  {templateClasses.socials.linkedin && (
                    <a 
                      href={templateClasses.socials.linkedin} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-muted-foreground hover:text-primary transition-colors duration-200" 
                      data-testid="link-social-linkedin"
                    >
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
