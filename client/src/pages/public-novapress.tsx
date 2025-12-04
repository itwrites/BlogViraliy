import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronRight } from "lucide-react";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { stripMarkdown } from "@/lib/strip-markdown";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Pagination } from "@/components/post-cards";

interface PublicNovaPressProps {
  site: Site;
}

export function PublicNovaPressContent({ site }: PublicNovaPressProps) {
  const [, setLocation] = useLocation();
  const templateClasses = useTemplateClasses(site.templateSettings);
  const prefersReducedMotion = useReducedMotion();

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
  const sidebarPosts = posts?.slice(1, 4) || [];
  const allCategoryPosts = posts?.slice(4) || [];
  
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
      transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
  };

  const cardAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
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

  return (
    <div className="min-h-screen bg-muted/30">
      <main className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-8 sm:py-12`}>
        {isLoading ? (
          <div className="space-y-8">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2 h-[400px] bg-card animate-pulse rounded-2xl" />
              <div className="space-y-4">
                <div className="h-[120px] bg-card animate-pulse rounded-xl" />
                <div className="h-[120px] bg-card animate-pulse rounded-xl" />
                <div className="h-[120px] bg-card animate-pulse rounded-xl" />
              </div>
            </div>
          </div>
        ) : featuredPost && templateClasses.showHero ? (
          <>
            <motion.div 
              className="grid gap-6 grid-cols-1 lg:grid-cols-3 mb-12 sm:mb-16"
              initial="hidden"
              animate="visible"
              variants={containerAnimation}
            >
              <motion.div variants={cardAnimation} className="lg:col-span-2">
                <Card
                  className="cursor-pointer overflow-hidden bg-card border-0 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl group"
                  onClick={() => handlePostClick(featuredPost.slug)}
                  data-testid={`card-featured-post-${featuredPost.id}`}
                >
                  <div className="aspect-[16/9] bg-muted overflow-hidden">
                    {featuredPost.imageUrl ? (
                      <img 
                        src={featuredPost.imageUrl} 
                        alt={featuredPost.title} 
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                        <FileText className="w-16 h-16 text-primary/20" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {featuredPost.tags.slice(0, 2).map((tag, index) => (
                        <Badge 
                          key={tag} 
                          variant="secondary"
                          className="text-xs uppercase tracking-wider font-medium px-3 py-1 rounded-full"
                          data-testid={`badge-featured-tag-${index}`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <h2 
                      className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 leading-tight line-clamp-2 group-hover:text-primary transition-colors" 
                      style={{ fontFamily: "var(--public-heading-font)" }}
                      data-testid={`text-featured-title-${featuredPost.id}`}
                    >
                      {featuredPost.title}
                    </h2>
                    <p 
                      className="text-muted-foreground line-clamp-2 mb-4 text-base"
                      data-testid={`text-featured-excerpt-${featuredPost.id}`}
                    >
                      {stripMarkdown(featuredPost.content, 180)}
                    </p>
                    <p className="text-sm font-medium text-muted-foreground" data-testid={`text-featured-date-${featuredPost.id}`}>
                      {new Date(featuredPost.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div className="space-y-4" variants={containerAnimation}>
                {sidebarPosts.map((post) => (
                  <motion.div key={post.id} variants={cardAnimation}>
                    <Card
                      className="cursor-pointer overflow-hidden bg-card border-0 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl group"
                      onClick={() => handlePostClick(post.slug)}
                      data-testid={`card-sidebar-post-${post.id}`}
                    >
                      <div className="flex gap-4 p-4">
                        <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                          {post.imageUrl ? (
                            <img 
                              src={post.imageUrl} 
                              alt={post.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                              <FileText className="w-6 h-6 text-primary/20" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 
                            className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors"
                            style={{ fontFamily: "var(--public-heading-font)" }}
                            data-testid={`text-sidebar-title-${post.id}`}
                          >
                            {post.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                            {post.tags[0] && (
                              <span className="ml-2 uppercase tracking-wider">{post.tags[0]}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {Object.keys(categoryGroups).length > 0 && (
              <div className="space-y-12 sm:space-y-16">
                {Object.entries(categoryGroups).map(([category, categoryPosts], categoryIndex) => (
                  <motion.section 
                    key={category}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                    animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
                    transition={prefersReducedMotion ? undefined : { delay: 0.2 + categoryIndex * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 
                        className="text-xl sm:text-2xl font-bold uppercase tracking-wide"
                        style={{ fontFamily: "var(--public-heading-font)" }}
                        data-testid={`text-category-title-${category}`}
                      >
                        {category}
                      </h3>
                      <button
                        onClick={() => handleTagClick(category)}
                        className="flex items-center gap-1 text-sm font-medium text-primary hover:opacity-70 transition-opacity"
                        data-testid={`button-view-all-${category}`}
                      >
                        View all <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <motion.div 
                      className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                      variants={containerAnimation}
                      initial="hidden"
                      animate="visible"
                    >
                      {categoryPosts.slice(0, 4).map((post) => (
                        <motion.div key={post.id} variants={cardAnimation}>
                          <Card
                            className="cursor-pointer overflow-hidden bg-card border-0 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 rounded-2xl group h-full"
                            onClick={() => handlePostClick(post.slug)}
                            data-testid={`card-category-post-${post.id}`}
                          >
                            <div className="aspect-[4/3] bg-muted overflow-hidden rounded-t-2xl">
                              {post.imageUrl ? (
                                <img 
                                  src={post.imageUrl} 
                                  alt={post.title} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                                  <FileText className="w-10 h-10 text-primary/20" />
                                </div>
                              )}
                            </div>
                            <CardContent className="p-4 sm:p-5">
                              <h4 
                                className="font-bold text-base line-clamp-2 mb-2 group-hover:text-primary transition-colors"
                                style={{ fontFamily: "var(--public-heading-font)" }}
                                data-testid={`text-category-post-title-${post.id}`}
                              >
                                {post.title}
                              </h4>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {stripMarkdown(post.content, 80)}
                              </p>
                              <p className="text-xs text-muted-foreground">
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
                  </motion.section>
                ))}
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="mt-12">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-24">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-testid="icon-no-posts" />
            <h2 
              className="text-2xl font-bold mb-2"
              style={{ fontFamily: "var(--public-heading-font)" }}
              data-testid="text-no-posts-title"
            >
              No stories yet
            </h2>
            <p className="text-muted-foreground" data-testid="text-no-posts-message">Check back soon for updates</p>
          </div>
        )}
      </main>
    </div>
  );
}

export { PublicNovaPressContent as PublicNovaPress };
