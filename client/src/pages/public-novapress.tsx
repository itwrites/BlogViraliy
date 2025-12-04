import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, ChevronRight } from "lucide-react";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { PublicLayout } from "@/components/public-layout";
import { PublicHeader } from "@/components/public-header";
import { stripMarkdown } from "@/lib/strip-markdown";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Pagination } from "@/components/post-cards";

interface PublicNovaPressProps {
  site: Site;
}

export function PublicNovaPress({ site }: PublicNovaPressProps) {
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

  const [currentPage, setCurrentPage] = useState(1);
  
  const featuredPost = posts?.[0];
  const sidebarPosts = posts?.slice(1, 4) || [];
  const allCategoryPosts = posts?.slice(4) || [];
  
  const postsPerPage = templateClasses.postsPerPage;
  const totalPages = Math.ceil(allCategoryPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const categoryPosts = allCategoryPosts.slice(startIndex, startIndex + postsPerPage);

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

  const groupPostsByTag = (posts: Post[]) => {
    const grouped: Record<string, Post[]> = {};
    posts.forEach(post => {
      const primaryTag = post.tags[0] || "Uncategorized";
      if (!grouped[primaryTag]) {
        grouped[primaryTag] = [];
      }
      if (grouped[primaryTag].length < 4) {
        grouped[primaryTag].push(post);
      }
    });
    return grouped;
  };

  const categoryGroups = groupPostsByTag(categoryPosts);

  return (
    <PublicLayout site={site} topTags={topTags || []} onTagClick={handleTagClick}>
      <div className="min-h-screen" style={{ backgroundColor: "#F5F7FA" }}>
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
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                <div className="lg:col-span-2 h-[400px] bg-white animate-pulse rounded-2xl" />
                <div className="space-y-4">
                  <div className="h-[120px] bg-white animate-pulse rounded-xl" />
                  <div className="h-[120px] bg-white animate-pulse rounded-xl" />
                  <div className="h-[120px] bg-white animate-pulse rounded-xl" />
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
                    className="cursor-pointer overflow-hidden bg-white border-0 shadow-sm hover:shadow-lg transition-all duration-300 rounded-2xl group"
                    onClick={() => handlePostClick(featuredPost.slug)}
                    data-testid={`card-featured-post-${featuredPost.id}`}
                  >
                    <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
                      {featuredPost.imageUrl ? (
                        <img 
                          src={featuredPost.imageUrl} 
                          alt={featuredPost.title} 
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                          <FileText className="w-16 h-16 text-blue-200" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6 sm:p-8">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {featuredPost.tags.slice(0, 2).map((tag, index) => (
                          <Badge 
                            key={tag} 
                            className="text-xs uppercase tracking-wider font-medium px-3 py-1 rounded-full"
                            style={{ backgroundColor: "#3A7BFF20", color: "#3A7BFF" }}
                            data-testid={`badge-featured-tag-${index}`}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <h2 
                        className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors" 
                        style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#1A1A1A" }}
                        data-testid={`text-featured-title-${featuredPost.id}`}
                      >
                        {featuredPost.title}
                      </h2>
                      <p 
                        className="line-clamp-2 mb-4 text-base"
                        style={{ color: "#6E6E6E" }}
                        data-testid={`text-featured-excerpt-${featuredPost.id}`}
                      >
                        {stripMarkdown(featuredPost.content, 180)}
                      </p>
                      <p className="text-sm font-medium" style={{ color: "#6E6E6E" }} data-testid={`text-featured-date-${featuredPost.id}`}>
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
                        className="cursor-pointer overflow-hidden bg-white border-0 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl group"
                        onClick={() => handlePostClick(post.slug)}
                        data-testid={`card-sidebar-post-${post.id}`}
                      >
                        <div className="flex gap-4 p-4">
                          <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                            {post.imageUrl ? (
                              <img 
                                src={post.imageUrl} 
                                alt={post.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                                <FileText className="w-6 h-6 text-blue-200" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 
                              className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors"
                              style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#1A1A1A" }}
                              data-testid={`text-sidebar-title-${post.id}`}
                            >
                              {post.title}
                            </h3>
                            <p className="text-xs" style={{ color: "#6E6E6E" }}>
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

              {Object.entries(categoryGroups).map(([category, posts], categoryIndex) => (
                <motion.section 
                  key={category}
                  className="mb-12 sm:mb-16"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? undefined : { delay: 0.3 + categoryIndex * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 
                      className="text-xl sm:text-2xl font-bold uppercase tracking-wide"
                      style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#1A1A1A" }}
                      data-testid={`text-category-title-${category}`}
                    >
                      {category}
                    </h3>
                    <button
                      onClick={() => handleTagClick(category)}
                      className="flex items-center gap-1 text-sm font-medium hover:opacity-70 transition-opacity"
                      style={{ color: "#3A7BFF" }}
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
                    {posts.map((post) => (
                      <motion.div key={post.id} variants={cardAnimation}>
                        <Card
                          className="cursor-pointer overflow-hidden bg-white border-0 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 rounded-2xl group h-full"
                          onClick={() => handlePostClick(post.slug)}
                          data-testid={`card-category-post-${post.id}`}
                        >
                          <div className="aspect-[4/3] bg-gray-100 overflow-hidden rounded-t-2xl">
                            {post.imageUrl ? (
                              <img 
                                src={post.imageUrl} 
                                alt={post.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                                <FileText className="w-10 h-10 text-blue-200" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-4 sm:p-5">
                            <h4 
                              className="font-bold text-base line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors"
                              style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#1A1A1A" }}
                              data-testid={`text-category-post-title-${post.id}`}
                            >
                              {post.title}
                            </h4>
                            <p 
                              className="text-sm line-clamp-2 mb-3"
                              style={{ color: "#6E6E6E" }}
                            >
                              {stripMarkdown(post.content, 80)}
                            </p>
                            <p className="text-xs" style={{ color: "#6E6E6E" }}>
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
              
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          ) : (
            <div className="text-center py-24">
              <FileText className="h-16 w-16 mx-auto mb-4" style={{ color: "#6E6E6E" }} data-testid="icon-no-posts" />
              <h2 
                className="text-2xl font-bold mb-2"
                style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#1A1A1A" }}
                data-testid="text-no-posts-title"
              >
                No stories yet
              </h2>
              <p style={{ color: "#6E6E6E" }} data-testid="text-no-posts-message">Check back soon for updates</p>
            </div>
          )}
        </main>
      </div>
    </PublicLayout>
  );
}
