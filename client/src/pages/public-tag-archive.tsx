import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Tag, FileText } from "lucide-react";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { motion, useReducedMotion, Variants } from "framer-motion";
import { PostCard } from "@/components/post-cards";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface PublicTagArchiveProps {
  site: Site;
  tag: string;
}

export function PublicTagArchiveContent({ site, tag }: PublicTagArchiveProps) {
  // Theme is detected via site.siteType (same as home page and post detail)
  const themeId = site.siteType || "blog";
  
  // Use Forbis-specific layout for Forbis theme
  if (themeId === "forbis") {
    return <ForbisTagArchive site={site} tag={tag} />;
  }
  
  return <StandardTagArchive site={site} tag={tag} />;
}

function ForbisTagArchive({ site, tag }: PublicTagArchiveProps) {
  const [, setLocation] = useLocation();
  const decodedTag = decodeURIComponent(tag || "");
  const prefersReducedMotion = useReducedMotion();

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/public/sites", site.id, "posts-by-tag", decodedTag],
  });

  const handlePostClick = (slug: string) => {
    setLocation(`/post/${slug}`);
  };

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };
  
  const itemAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
  };

  const heroPost = posts?.[0];
  const sidePosts = posts?.slice(1, 5) || [];
  const gridPosts = posts?.slice(5) || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Forbes-style header with tag name */}
      <div className="border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
            animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? {} : { duration: 0.3 }}
          >
            <h1 
              className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight"
              style={{ fontFamily: "var(--public-heading-font)" }}
              data-testid="text-tag-name"
            >
              {decodedTag}
            </h1>
            <p className="text-muted-foreground mt-2" data-testid="text-post-count">
              {isLoading ? "Loading..." : `${posts?.length || 0} articles`}
            </p>
          </motion.div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <div className="h-96 bg-muted animate-pulse" />
            </div>
            <div className="lg:col-span-5 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        ) : posts && posts.length > 0 ? (
          <motion.div
            initial={prefersReducedMotion ? false : "hidden"}
            animate={prefersReducedMotion ? false : "visible"}
            variants={containerAnimation}
          >
            {/* Hero + Sidebar layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
              {/* Hero post */}
              {heroPost && (
                <motion.article
                  variants={itemAnimation}
                  className="lg:col-span-7 group cursor-pointer"
                  onClick={() => handlePostClick(heroPost.slug)}
                  data-testid={`card-forbis-hero-${heroPost.id}`}
                >
                  {heroPost.imageUrl && (
                    <div className="aspect-[4/3] overflow-hidden mb-4">
                      <img 
                        src={heroPost.imageUrl} 
                        alt={heroPost.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <h2 
                    className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 group-hover:underline decoration-2 underline-offset-4"
                    style={{ fontFamily: "var(--public-heading-font)", lineHeight: "1.15" }}
                    data-testid={`text-forbis-hero-title-${heroPost.id}`}
                  >
                    {heroPost.title}
                  </h2>
                  {(heroPost as any).authorName && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {(heroPost as any).authorAvatarUrl && <AvatarImage src={(heroPost as any).authorAvatarUrl} />}
                        <AvatarFallback className="text-[10px]">{((heroPost as any).authorName || "A").charAt(0)}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--public-body-font)" }}>
                        By <span className="text-foreground font-medium">{(heroPost as any).authorName}</span>
                      </p>
                    </div>
                  )}
                </motion.article>
              )}

              {/* Sidebar posts */}
              <div className="lg:col-span-5">
                <div className="divide-y divide-border/30">
                  {sidePosts.map((post, index) => (
                    <motion.article
                      key={post.id}
                      variants={itemAnimation}
                      className="flex items-start gap-4 py-4 first:pt-0 cursor-pointer group"
                      onClick={() => handlePostClick(post.slug)}
                      data-testid={`card-forbis-sidebar-${post.id}`}
                    >
                      <span 
                        className="text-2xl font-bold text-muted-foreground/40 min-w-[24px]"
                        style={{ fontFamily: "var(--public-heading-font)" }}
                      >
                        {index + 2}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="text-base font-bold group-hover:underline decoration-1 underline-offset-2 line-clamp-2 mb-1"
                          style={{ fontFamily: "var(--public-heading-font)", lineHeight: "1.3" }}
                          data-testid={`text-forbis-sidebar-title-${post.id}`}
                        >
                          {post.title}
                        </h3>
                        {(post as any).authorName && (
                          <p className="text-xs text-muted-foreground">
                            By {(post as any).authorName}
                          </p>
                        )}
                      </div>
                      {post.imageUrl && (
                        <div className="w-20 h-16 flex-shrink-0 overflow-hidden">
                          <img 
                            src={post.imageUrl} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </motion.article>
                  ))}
                </div>
              </div>
            </div>

            {/* More Stories grid */}
            {gridPosts.length > 0 && (
              <div className="pt-8 border-t border-border/50">
                <h3 
                  className="text-lg font-bold mb-6 uppercase tracking-wide"
                  style={{ fontFamily: "var(--public-heading-font)" }}
                >
                  More in {decodedTag}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {gridPosts.map((post) => (
                    <motion.article
                      key={post.id}
                      variants={itemAnimation}
                      className="group cursor-pointer"
                      onClick={() => handlePostClick(post.slug)}
                      data-testid={`card-forbis-grid-${post.id}`}
                    >
                      {post.imageUrl && (
                        <div className="aspect-video overflow-hidden mb-3">
                          <img 
                            src={post.imageUrl} 
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <h4 
                        className="text-sm font-bold group-hover:underline decoration-1 underline-offset-2 line-clamp-3"
                        style={{ fontFamily: "var(--public-heading-font)", lineHeight: "1.3" }}
                      >
                        {post.title}
                      </h4>
                      {(post as any).authorName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          By {(post as any).authorName}
                        </p>
                      )}
                    </motion.article>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            className="text-center py-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--public-heading-font)" }}>
              No articles found
            </h2>
            <p className="text-muted-foreground">
              There are no articles tagged with "{decodedTag}"
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function StandardTagArchive({ site, tag }: PublicTagArchiveProps) {
  const [, setLocation] = useLocation();
  const decodedTag = decodeURIComponent(tag || "");
  const templateClasses = useTemplateClasses(site.templateSettings);
  const postCardStyle = templateClasses.postCardStyle || "standard";

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/public/sites", site.id, "posts-by-tag", decodedTag],
  });

  const handlePostClick = (slug: string) => {
    setLocation(`/post/${slug}`);
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
  );
}

export { PublicTagArchiveContent as PublicTagArchive };
