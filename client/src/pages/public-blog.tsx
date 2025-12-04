import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { FileText, Clock, ArrowRight } from "lucide-react";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { PublicLayout } from "@/components/public-layout";
import { PublicHeader } from "@/components/public-header";
import { PostCard, Pagination } from "@/components/post-cards";
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
  const [currentPage, setCurrentPage] = useState(1);
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

  const postsPerPage = templateClasses.postsPerPage;
  const postCardStyle = templateClasses.postCardStyle;
  
  const featuredPost = posts?.[0];
  const allRecentPosts = posts?.slice(1) || [];
  
  const totalPages = Math.ceil(allRecentPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const recentPosts = allRecentPosts.slice(startIndex, startIndex + postsPerPage);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
    <PublicLayout site={site} topTags={topTags || []} onTagClick={handleTagClick}>
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

              {/* Recent Posts Grid */}
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
                    className={`${
                      postCardStyle === "editorial" 
                        ? "flex flex-col gap-8" 
                        : postCardStyle === "minimal"
                          ? "flex flex-col"
                          : "grid gap-x-8 gap-y-12 sm:gap-y-14 md:grid-cols-2 lg:grid-cols-3"
                    }`}
                    initial={prefersReducedMotion ? false : "hidden"}
                    animate={prefersReducedMotion ? false : "visible"}
                    variants={containerVariants}
                  >
                    {recentPosts.map((post, index) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        onClick={handlePostClick}
                        style={postCardStyle}
                        cardClasses={templateClasses.cardStyle}
                        variants={itemVariants}
                        index={index}
                      />
                    ))}
                  </motion.div>
                  
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </section>
              )}
            </>
          ) : posts && posts.length > 0 && !templateClasses.showHero ? (
            /* All Posts Grid (No Hero) */
            <section className="py-12 sm:py-16 lg:py-20">
              <motion.div 
                className={`${
                  postCardStyle === "editorial" 
                    ? "flex flex-col gap-8" 
                    : postCardStyle === "minimal"
                      ? "flex flex-col"
                      : "grid gap-x-8 gap-y-12 sm:gap-y-14 md:grid-cols-2 lg:grid-cols-3"
                }`}
                initial={prefersReducedMotion ? false : "hidden"}
                animate={prefersReducedMotion ? false : "visible"}
                variants={containerVariants}
              >
                {posts.slice(startIndex, startIndex + postsPerPage).map((post, index) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={handlePostClick}
                    style={postCardStyle}
                    cardClasses={templateClasses.cardStyle}
                    variants={itemVariants}
                    index={index}
                  />
                ))}
              </motion.div>
              
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(posts.length / postsPerPage)}
                onPageChange={handlePageChange}
              />
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
      </div>
    </PublicLayout>
  );
}
