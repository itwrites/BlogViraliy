import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post, SiteMenuItem } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Layers, FileText } from "lucide-react";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { motion, useReducedMotion, Variants } from "framer-motion";
import { PostCard } from "@/components/post-cards";

interface PublicTopicGroupProps {
  site: Site;
  groupSlug: string;
}

export function PublicTopicGroupContent({ site, groupSlug }: PublicTopicGroupProps) {
  const [, setLocation] = useLocation();
  const templateClasses = useTemplateClasses(site.templateSettings);
  const basePath = site.basePath || "";
  const postCardStyle = templateClasses.postCardStyle || "standard";

  const { data: menuItems } = useQuery<SiteMenuItem[]>({
    queryKey: ["/api/sites", site.id, "menu-items"],
    staleTime: 5 * 60 * 1000,
  });

  const menuItem = menuItems?.find(item => item.type === "tag_group" && item.groupSlug === groupSlug);
  const tagSlugs = menuItem?.tagSlugs || [];
  const groupLabel = menuItem?.label || groupSlug;

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/public/sites", site.id, "posts-by-tags", tagSlugs.join(",")],
    enabled: tagSlugs.length > 0,
  });

  const handlePostClick = (slug: string) => {
    setLocation(`${basePath}/post/${slug}`);
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

  const cardClasses = {
    container: `bg-card ${templateClasses.cardStyle.simple}`,
    image: templateClasses.cardStyle.radius || "rounded-t-lg",
    hover: "hover:shadow-md transition-shadow duration-300",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-8 sm:py-12`}>
        <motion.div 
          className="mb-8"
          initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
          animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-group-name">
              {groupLabel}
            </h1>
          </div>
          {tagSlugs.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tagSlugs.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs" data-testid={`badge-group-tag-${tag}`}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <p className="text-muted-foreground" data-testid="text-post-count">
            {isLoading ? "Loading posts..." : `${posts?.length || 0} articles in this topic`}
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`h-64 bg-muted animate-pulse ${templateClasses.cardStyle.radius || "rounded-lg"}`} />
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <motion.div 
            className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? false : "visible"}
            variants={containerAnimation}
          >
            {posts.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={handlePostClick}
                style={postCardStyle as any}
                cardClasses={cardClasses}
                variants={cardAnimation}
                index={index}
              />
            ))}
          </motion.div>
        ) : menuItem ? (
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
              There are no posts in this topic group yet
            </p>
          </motion.div>
        ) : (
          <motion.div 
            className="text-center py-24"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" data-testid="icon-not-found" />
            <h2 className="text-xl sm:text-2xl font-semibold mb-2" style={{ fontFamily: "var(--public-heading-font)" }} data-testid="text-not-found-title">
              Topic not found
            </h2>
            <p className="text-muted-foreground mb-4" data-testid="text-not-found-message">
              This topic group doesn't exist
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export { PublicTopicGroupContent as PublicTopicGroup };
