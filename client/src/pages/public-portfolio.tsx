import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink } from "lucide-react";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { stripMarkdown } from "@/lib/strip-markdown";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { PostCard, Pagination } from "@/components/post-cards";

interface PublicPortfolioProps {
  site: Site;
}

export function PublicPortfolioContent({ site }: PublicPortfolioProps) {
  const [, setLocation] = useLocation();
  const templateClasses = useTemplateClasses(site.templateSettings);
  const cardStyle = templateClasses.cardStyle;

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/public/sites", site.id, "posts"],
  });

  const handlePostClick = (slug: string) => {
    setLocation(`/post/${slug}`);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const prefersReducedMotion = useReducedMotion();
  
  const postsPerPage = templateClasses.postsPerPage;
  const postCardStyle = templateClasses.postCardStyle;
  const allPosts = posts || [];
  const totalPages = Math.ceil(allPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const paginatedPosts = allPosts.slice(startIndex, startIndex + postsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "instant" : "smooth" });
  };

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const cardAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-10 sm:py-16`}>
        {isLoading ? (
          <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`h-72 sm:h-96 bg-muted animate-pulse ${cardStyle.radius}`} />
            ))}
          </div>
        ) : paginatedPosts && paginatedPosts.length > 0 ? (
          <>
            <motion.div 
              className="grid gap-8 sm:gap-12 grid-cols-1 md:grid-cols-2"
              initial="hidden"
              animate="visible"
              variants={containerAnimation}
            >
              {paginatedPosts.map((post, index) => (
                <motion.div 
                  key={post.id} 
                  variants={cardAnimation}
                  className={index === 0 && currentPage === 1 && templateClasses.showHero ? 'md:col-span-2' : ''}
                >
                  {index === 0 && currentPage === 1 && templateClasses.showHero ? (
                    <Card
                      className={`cursor-pointer hover-elevate overflow-hidden group h-full ${templateClasses.cardStyle.simple}`}
                      onClick={() => handlePostClick(post.slug)}
                      data-testid={`card-post-${post.id}`}
                    >
                      <div className="aspect-[16/9] md:aspect-[21/9] bg-muted relative overflow-hidden">
                        {post.imageUrl && (
                          <img 
                            src={post.imageUrl} 
                            alt={post.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                          />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <ExternalLink className="h-6 w-6 sm:h-8 sm:w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <CardContent className="p-6 sm:p-10">
                        <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                          {post.tags.slice(0, 3).map((tag, tagIndex) => (
                            <Badge key={tag} variant="outline" className="text-xs" data-testid={`badge-post-tag-${post.id}-${tagIndex}`}>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-light mb-2 sm:mb-3 line-clamp-2 group-hover:opacity-80 transition-opacity" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-post-title-${post.id}`}>
                          {post.title}
                        </h3>
                        <p className="text-muted-foreground line-clamp-2 mb-3 sm:mb-4 text-sm" data-testid={`text-post-excerpt-${post.id}`}>
                          {stripMarkdown(post.content, 120)}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-post-date-${post.id}`}>
                          {new Date(post.createdAt).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <PostCard
                      post={post}
                      style={postCardStyle}
                      onClick={handlePostClick}
                      cardClasses={cardStyle}
                    />
                  )}
                </motion.div>
              ))}
            </motion.div>
            
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
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-testid="icon-no-posts" />
            <h2 className="text-2xl font-light mb-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-no-posts-title">No projects yet</h2>
            <p className="text-muted-foreground" data-testid="text-no-posts-message">Portfolio coming soon</p>
          </div>
        )}
      </main>
    </div>
  );
}

export { PublicPortfolioContent as PublicPortfolio };
