import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import type { Site, Post } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronRight, Clock, TrendingUp } from "lucide-react";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { stripMarkdown } from "@/lib/strip-markdown";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Pagination } from "@/components/post-cards";

interface PublicNovaPressProps {
  site: Site;
}

function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function PublicNovaPressContent({ site }: PublicNovaPressProps) {
  const [, setLocation] = useLocation();
  const templateClasses = useTemplateClasses(site.templateSettings);
  const prefersReducedMotion = useReducedMotion();
  const cardStyle = templateClasses.cardStyle;

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/public/sites", site.id, "posts"],
  });

  const handleTagClick = (tag: string) => {
    setLocation(`/tag/${encodeURIComponent(tag)}`);
  };

  const handlePostClick = (slug: string) => {
    setLocation(`/post/${slug}`);
  };

  const [currentPage, setCurrentPage] = useState(1);
  
  const featuredPost = posts?.[0];
  const secondaryPosts = posts?.slice(1, 5) || [];
  const tertiaryPosts = posts?.slice(5, 9) || [];
  const allCategoryPosts = posts?.slice(9) || [];
  
  const postsPerPage = templateClasses.postsPerPage;
  const totalPages = Math.ceil(allCategoryPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const paginatedPosts = allCategoryPosts.slice(startIndex, startIndex + postsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "instant" : "smooth" });
  };

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.05 },
    },
  };

  const cardAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 12 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }
    },
  };

  const groupPostsByCategory = (posts: Post[]) => {
    const grouped: Record<string, Post[]> = {};
    posts.forEach(post => {
      const primaryTag = post.tags[0] || "Latest";
      if (!grouped[primaryTag]) {
        grouped[primaryTag] = [];
      }
      grouped[primaryTag].push(post);
    });
    return grouped;
  };

  const categoryGroups = groupPostsByCategory(paginatedPosts);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-6`}>
          <div className="grid gap-4 grid-cols-12">
            <div className={`col-span-12 lg:col-span-8 h-[400px] bg-card animate-pulse ${cardStyle.radius}`} />
            <div className="col-span-12 lg:col-span-4 space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className={`h-[90px] bg-card animate-pulse ${cardStyle.radiusSm}`} />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-6`}>
        {featuredPost && templateClasses.showHero ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerAnimation}
          >
            <div className="grid gap-4 grid-cols-12 mb-6">
              <motion.article 
                variants={cardAnimation}
                className={`col-span-12 lg:col-span-8 group cursor-pointer overflow-hidden bg-card border shadow-sm ${cardStyle.radius} ${cardStyle.hover}`}
                onClick={() => handlePostClick(featuredPost.slug)}
                data-testid={`card-featured-post-${featuredPost.id}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-5 h-full">
                  <div className={`md:col-span-3 aspect-[16/10] md:aspect-auto bg-muted overflow-hidden ${cardStyle.image} md:rounded-none md:rounded-l-inherit`}>
                    {featuredPost.imageUrl ? (
                      <img 
                        src={featuredPost.imageUrl} 
                        alt={featuredPost.title} 
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/15">
                        <FileText className="w-16 h-16 text-primary/20" />
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2 p-5 lg:p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      {featuredPost.tags[0] && (
                        <Badge 
                          variant="default"
                          className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 ${cardStyle.radiusSm}`}
                          data-testid="badge-featured-category"
                        >
                          {featuredPost.tags[0]}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Featured
                      </span>
                    </div>
                    <h2 
                      className="text-xl lg:text-2xl font-bold mb-2 leading-tight line-clamp-3 group-hover:text-primary transition-colors duration-200" 
                      style={{ fontFamily: "var(--public-heading-font)" }}
                      data-testid={`text-featured-title-${featuredPost.id}`}
                    >
                      {featuredPost.title}
                    </h2>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {stripMarkdown(featuredPost.content, 120)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getReadingTime(featuredPost.content)} min
                      </span>
                      <span>
                        {new Date(featuredPost.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.article>

              <div className="col-span-12 lg:col-span-4 grid gap-3">
                {secondaryPosts.map((post, idx) => (
                  <motion.article 
                    key={post.id}
                    variants={cardAnimation}
                    className={`group cursor-pointer flex gap-3 p-3 bg-card border ${cardStyle.radiusSm} ${cardStyle.hover}`}
                    onClick={() => handlePostClick(post.slug)}
                    data-testid={`card-secondary-post-${post.id}`}
                  >
                    <div className={`w-20 h-20 flex-shrink-0 ${cardStyle.radiusSm} overflow-hidden bg-muted`}>
                      {post.imageUrl ? (
                        <img 
                          src={post.imageUrl} 
                          alt={post.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                          <FileText className="w-5 h-5 text-primary/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <span className="text-[10px] uppercase tracking-wider font-medium text-primary/70 mb-1">
                        {post.tags[0] || "News"}
                      </span>
                      <h3 
                        className="text-sm font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors duration-200"
                        style={{ fontFamily: "var(--public-heading-font)" }}
                        data-testid={`text-secondary-title-${post.id}`}
                      >
                        {post.title}
                      </h3>
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>

            {tertiaryPosts.length > 0 && (
              <motion.div 
                className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-6"
                variants={containerAnimation}
              >
                {tertiaryPosts.map((post) => (
                  <motion.article 
                    key={post.id}
                    variants={cardAnimation}
                    className={`group cursor-pointer overflow-hidden bg-card border ${cardStyle.radius} ${cardStyle.hover}`}
                    onClick={() => handlePostClick(post.slug)}
                    data-testid={`card-tertiary-post-${post.id}`}
                  >
                    <div className={`aspect-[4/3] bg-muted overflow-hidden ${cardStyle.image}`}>
                      {post.imageUrl ? (
                        <img 
                          src={post.imageUrl} 
                          alt={post.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                          <FileText className="w-8 h-8 text-primary/20" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <span className="text-[10px] uppercase tracking-wider font-medium text-primary/70">
                        {post.tags[0] || "News"}
                      </span>
                      <h4 
                        className="text-sm font-semibold line-clamp-2 leading-snug mt-1 group-hover:text-primary transition-colors"
                        style={{ fontFamily: "var(--public-heading-font)" }}
                        data-testid={`text-tertiary-title-${post.id}`}
                      >
                        {post.title}
                      </h4>
                    </div>
                  </motion.article>
                ))}
              </motion.div>
            )}

            {Object.keys(categoryGroups).length > 0 && (
              <div className="space-y-6">
                {Object.entries(categoryGroups).map(([category, categoryPosts], categoryIndex) => (
                  <motion.section 
                    key={category}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                    animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
                    transition={prefersReducedMotion ? undefined : { delay: 0.1 + categoryIndex * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-primary/20">
                      <h3 
                        className="text-lg font-bold uppercase tracking-wide flex items-center gap-2"
                        style={{ fontFamily: "var(--public-heading-font)" }}
                        data-testid={`text-category-title-${category}`}
                      >
                        <span className="w-1 h-5 bg-primary rounded-full" />
                        {category}
                      </h3>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleTagClick(category); }}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:opacity-70 transition-opacity"
                        data-testid={`button-view-all-${category}`}
                      >
                        View all <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                      {categoryPosts.slice(0, 4).map((post) => (
                        <motion.article 
                          key={post.id}
                          variants={cardAnimation}
                          className={`group cursor-pointer overflow-hidden bg-card border ${cardStyle.radius} ${cardStyle.hover}`}
                          onClick={() => handlePostClick(post.slug)}
                          data-testid={`card-category-post-${post.id}`}
                        >
                          <div className={`aspect-[4/3] bg-muted overflow-hidden ${cardStyle.image}`}>
                            {post.imageUrl ? (
                              <img 
                                src={post.imageUrl} 
                                alt={post.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                                <FileText className="w-8 h-8 text-primary/20" />
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <h4 
                              className="text-sm font-semibold line-clamp-2 leading-snug group-hover:text-primary transition-colors"
                              style={{ fontFamily: "var(--public-heading-font)" }}
                              data-testid={`text-category-post-title-${post.id}`}
                            >
                              {post.title}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {stripMarkdown(post.content, 60)}
                            </p>
                            <span className="text-[10px] text-muted-foreground mt-2 block">
                              {new Date(post.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </motion.article>
                      ))}
                    </div>
                  </motion.section>
                ))}
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" data-testid="icon-no-posts" />
            <h2 
              className="text-xl font-bold mb-2"
              style={{ fontFamily: "var(--public-heading-font)" }}
              data-testid="text-no-posts-title"
            >
              No stories yet
            </h2>
            <p className="text-muted-foreground text-sm" data-testid="text-no-posts-message">Check back soon for updates</p>
          </div>
        )}
      </main>
    </div>
  );
}

export { PublicNovaPressContent as PublicNovaPress };
