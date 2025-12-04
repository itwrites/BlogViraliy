import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, FileText } from "lucide-react";
import { stripMarkdown } from "@/lib/strip-markdown";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { PublicLayout } from "@/components/public-layout";
import { PublicHeader } from "@/components/public-header";
import { motion, useReducedMotion, Variants } from "framer-motion";

interface PublicTagArchiveProps {
  site: Site;
}

export function PublicTagArchive({ site }: PublicTagArchiveProps) {
  const { tag } = useParams();
  const [, setLocation] = useLocation();
  const decodedTag = decodeURIComponent(tag || "");
  const templateClasses = useTemplateClasses(site.templateSettings);

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/public/sites", site.id, "posts-by-tag", decodedTag],
  });

  const { data: topTags } = useQuery<string[]>({
    queryKey: ["/api/public/sites", site.id, "top-tags"],
  });

  const handlePostClick = (slug: string) => {
    setLocation(`/post/${slug}`);
  };

  const handleTagClick = (tagName: string) => {
    setLocation(`/tag/${encodeURIComponent(tagName)}`);
  };

  const handleBack = () => {
    setLocation("/");
  };

  const prefersReducedMotion = useReducedMotion();

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.2 },
    },
  };

  const cardAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    },
  };

  return (
    <PublicLayout site={site} topTags={topTags || []} onTagClick={handleTagClick}>
      <div className="min-h-screen bg-background text-foreground">
        <PublicHeader
          site={site}
          topTags={topTags || []}
          onTagClick={handleTagClick}
          onLogoClick={handleBack}
          currentTag={decodedTag}
          templateClasses={templateClasses}
        />

        <main className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-8 sm:py-12`}>
          <motion.div 
            className="mb-8"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
            animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? {} : { duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-tag-name">
                {decodedTag}
              </h1>
            </div>
            <p className="text-muted-foreground" data-testid="text-post-count">
              {isLoading ? "Loading posts..." : `${posts?.length || 0} articles tagged with "${decodedTag}"`}
            </p>
          </motion.div>

          {isLoading ? (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <motion.div 
              className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              initial={prefersReducedMotion ? false : "hidden"}
              animate={prefersReducedMotion ? false : "visible"}
              variants={containerAnimation}
            >
              {posts.map((post) => (
                <motion.div key={post.id} variants={cardAnimation}>
                  <Card
                    className={`cursor-pointer hover-elevate overflow-hidden h-full group ${templateClasses.cardStyle.simple}`}
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
                        {post.tags.slice(0, 2).map((t, index) => (
                          <Badge key={t} variant="secondary" className="text-xs" data-testid={`badge-post-tag-${post.id}-${index}`}>
                            {t}
                          </Badge>
                        ))}
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold mb-2 line-clamp-2 group-hover:opacity-70 transition-opacity" style={{ fontFamily: "var(--public-heading-font)" }} data-testid={`text-post-title-${post.id}`}>
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-2 sm:mb-3" data-testid={`text-post-excerpt-${post.id}`}>
                        {stripMarkdown(post.content, 120)}
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
          ) : (
            <motion.div 
              className="text-center py-24"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-testid="icon-no-posts" />
              <h2 className="text-xl sm:text-2xl font-semibold mb-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-no-posts-title">
                No posts found
              </h2>
              <p className="text-muted-foreground mb-4" data-testid="text-no-posts-message">
                There are no posts tagged with "{decodedTag}"
              </p>
            </motion.div>
          )}
        </main>
      </div>
    </PublicLayout>
  );
}
