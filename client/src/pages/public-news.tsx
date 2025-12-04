import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { PublicLayout } from "@/components/public-layout";
import { PublicHeader } from "@/components/public-header";
import { stripMarkdown } from "@/lib/strip-markdown";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { PostCard, Pagination } from "@/components/post-cards";

interface PublicNewsProps {
  site: Site;
}

export function PublicNews({ site }: PublicNewsProps) {
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

  const [currentPage, setCurrentPage] = useState(1);
  const featuredPost = posts?.[0];
  const secondaryPosts = posts?.slice(1, 5) || [];
  const allLatestPosts = posts?.slice(5) || [];
  const prefersReducedMotion = useReducedMotion();
  
  const postsPerPage = templateClasses.postsPerPage;
  const postCardStyle = templateClasses.postCardStyle;
  const totalPages = Math.ceil(allLatestPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const latestPosts = allLatestPosts.slice(startIndex, startIndex + postsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "instant" : "smooth" });
  };

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.15 },
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

        <main className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-6 sm:py-8`}>
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div className="h-60 sm:h-80 bg-muted animate-pulse rounded" />
                <div className="grid gap-4 grid-cols-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 sm:h-36 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-48 bg-muted animate-pulse rounded" />
                ))}
              </div>
            </div>
          ) : featuredPost && templateClasses.showHero ? (
            <>
              <motion.div 
                className="grid gap-4 grid-cols-1 md:grid-cols-2 mb-6 sm:mb-8"
                initial="hidden"
                animate="visible"
                variants={containerAnimation}
              >
                <motion.div variants={cardAnimation}>
                  <Card
                    className={`cursor-pointer hover-elevate overflow-hidden h-full ${templateClasses.cardStyle.simple}`}
                    onClick={() => handlePostClick(featuredPost.slug)}
                    data-testid={`card-featured-post-${featuredPost.id}`}
                  >
                    <div className="aspect-video bg-muted overflow-hidden">
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
                          <Badge key={tag} variant="secondary" className="text-xs" data-testid={`badge-featured-tag-${index}`}>
                            {tag.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 hover:opacity-80 transition-opacity line-clamp-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-featured-title-${featuredPost.id}`}>
                        {featuredPost.title}
                      </h2>
                      <p className="text-muted-foreground mb-2 sm:mb-3 line-clamp-2 sm:line-clamp-3 text-sm" data-testid={`text-featured-excerpt-${featuredPost.id}`}>
                        {stripMarkdown(featuredPost.content, 200)}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-featured-date-${featuredPost.id}`}>
                        {new Date(featuredPost.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div 
                  className="grid grid-cols-2 gap-3 sm:gap-4"
                  variants={containerAnimation}
                >
                  {secondaryPosts.map((post) => (
                    <motion.div key={post.id} variants={cardAnimation}>
                      <PostCard
                        post={post}
                        style="compact"
                        onClick={handlePostClick}
                        cardClasses={{
                          container: `${templateClasses.cardStyle.simple}`,
                          image: "",
                          hover: "hover-elevate",
                        }}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {latestPosts.length > 0 && (
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={prefersReducedMotion ? false : { opacity: 1 }}
                  transition={prefersReducedMotion ? undefined : { delay: 0.4 }}
                >
                  <motion.h3 
                    className="text-lg sm:text-xl font-bold mb-4 sm:mb-6" 
                    style={{ fontFamily: "var(--public-heading-font)" }}
                    data-testid="text-latest-title"
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
                    animate={prefersReducedMotion ? false : { opacity: 1, x: 0 }}
                    transition={prefersReducedMotion ? undefined : { delay: 0.5 }}
                  >
                    Latest News
                  </motion.h3>
                  <motion.div 
                    className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                    initial={prefersReducedMotion ? false : "hidden"}
                    animate={prefersReducedMotion ? false : "visible"}
                    variants={containerAnimation}
                  >
                    {latestPosts.map((post) => (
                      <motion.div key={post.id} variants={cardAnimation}>
                        <PostCard
                          post={post}
                          style={postCardStyle}
                          onClick={handlePostClick}
                        />
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
                </motion.div>
              )}
            </>
          ) : (
            <div className="text-center py-24">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-testid="icon-no-posts" />
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-no-posts-title">No news yet</h2>
              <p className="text-muted-foreground" data-testid="text-no-posts-message">Check back soon for updates</p>
            </div>
          )}
        </main>
      </div>
    </PublicLayout>
  );
}
