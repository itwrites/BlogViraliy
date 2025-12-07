import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { Post, Site } from "@shared/schema";
import { PostCard, Pagination } from "@/components/post-cards";
import { getThemeManifest, getLayoutClasses, type ThemeManifest, type LayoutVariant, type PostCardVariant } from "@/lib/theme-manifest";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { stripMarkdown } from "@/lib/strip-markdown";
import { Clock, ChevronRight, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface ThemeCardGridProps {
  site: Site;
  posts: Post[];
  onPostClick: (slug: string) => void;
  onTagClick?: (tag: string) => void;
  showPagination?: boolean;
  className?: string;
}

function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  
  if (diffMs < 0) {
    return formatDate(date);
  }
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return formatDate(date);
}

export function ThemeCardGrid({ site, posts, onPostClick, onTagClick, showPagination = true, className = "" }: ThemeCardGridProps) {
  const prefersReducedMotion = useReducedMotion();
  const themeId = site.siteType || "blog";
  const manifest = getThemeManifest(themeId);
  const templateClasses = useTemplateClasses(site.templateSettings);
  const [currentPage, setCurrentPage] = useState(1);

  if (!manifest) {
    return <StandardGrid posts={posts} onPostClick={onPostClick} templateClasses={templateClasses} />;
  }

  const postsPerPage = templateClasses.postsPerPage;
  const totalPages = Math.ceil(posts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const paginatedPosts = posts.slice(startIndex, startIndex + postsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "instant" : "smooth" });
  };

  const layout = manifest.layout.homeLayout;

  const renderLayout = () => {
    switch (layout) {
      case "minimal-list":
        return <MinimalListLayout posts={paginatedPosts} onPostClick={onPostClick} manifest={manifest} templateClasses={templateClasses} />;
      case "list":
        return <ListLayout posts={paginatedPosts} onPostClick={onPostClick} manifest={manifest} templateClasses={templateClasses} />;
      case "magazine":
        return <MagazineLayout posts={paginatedPosts} onPostClick={onPostClick} onTagClick={onTagClick} manifest={manifest} templateClasses={templateClasses} />;
      case "featured-grid":
        return <FeaturedGridLayout posts={paginatedPosts} onPostClick={onPostClick} manifest={manifest} templateClasses={templateClasses} />;
      case "masonry":
        return <MasonryLayout posts={paginatedPosts} onPostClick={onPostClick} manifest={manifest} templateClasses={templateClasses} />;
      case "bento":
        return <BentoLayout posts={paginatedPosts} onPostClick={onPostClick} manifest={manifest} templateClasses={templateClasses} />;
      case "bbc-news":
        return <BBCNewsLayout posts={paginatedPosts} onPostClick={onPostClick} onTagClick={onTagClick} manifest={manifest} templateClasses={templateClasses} />;
      case "forbis":
        return <ForbisLayout posts={paginatedPosts} onPostClick={onPostClick} onTagClick={onTagClick} manifest={manifest} templateClasses={templateClasses} />;
      default:
        return <GridLayout posts={paginatedPosts} onPostClick={onPostClick} manifest={manifest} templateClasses={templateClasses} />;
    }
  };

  return (
    <div className={className}>
      {renderLayout()}
      {showPagination && totalPages > 1 && (
        <div className="mt-12">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  );
}

interface LayoutProps {
  posts: Post[];
  onPostClick: (slug: string) => void;
  onTagClick?: (tag: string) => void;
  manifest: ThemeManifest;
  templateClasses: ReturnType<typeof useTemplateClasses>;
}

function StandardGrid({ posts, onPostClick, templateClasses }: Omit<LayoutProps, "manifest">) {
  const prefersReducedMotion = useReducedMotion();
  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const cardAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerAnimation}
      className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
    >
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onClick={onPostClick}
          style="standard"
          variants={cardAnimation}
        />
      ))}
    </motion.div>
  );
}

function GridLayout({ posts, onPostClick, manifest, templateClasses }: LayoutProps) {
  const prefersReducedMotion = useReducedMotion();
  const { gridColumns, sectionSpacing } = manifest.layout;
  const cardStyle = manifest.cards.primaryCardStyle;

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: manifest.animation.transitionDuration / 1000 / 10 } },
  };
  const cardAnimation: Variants | undefined = prefersReducedMotion || !manifest.animation.cardEntrance ? undefined : {
    hidden: { opacity: 0, y: manifest.animation.cardEntrance === "slide" ? 20 : 0, scale: manifest.animation.cardEntrance === "scale" ? 0.95 : 1 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: manifest.animation.transitionDuration / 1000 } },
  };

  const spacingMap = { compact: "gap-3", normal: "gap-4 md:gap-6", relaxed: "gap-6 md:gap-8", spacious: "gap-8 md:gap-10" };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerAnimation}
      className={`grid grid-cols-${gridColumns.mobile} md:grid-cols-${gridColumns.tablet} lg:grid-cols-${gridColumns.desktop} ${spacingMap[sectionSpacing]}`}
    >
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onClick={onPostClick}
          style={cardStyle}
          variants={cardAnimation}
        />
      ))}
    </motion.div>
  );
}

function MinimalListLayout({ posts, onPostClick, manifest, templateClasses }: LayoutProps) {
  const prefersReducedMotion = useReducedMotion();
  const showExcerpt = manifest.cards.showExcerpt;
  const excerptLength = manifest.cards.excerptLength;

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerAnimation}
      className="space-y-8 max-w-2xl mx-auto"
    >
      {posts.map((post) => (
        <motion.article
          key={post.id}
          variants={itemAnimation}
          className="group cursor-pointer pb-8 border-b border-border/50 last:border-0"
          onClick={() => onPostClick(post.slug)}
          data-testid={`card-post-${post.id}`}
        >
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
            <time>{formatDate(post.createdAt)}</time>
            {manifest.cards.showReadingTime && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span>{getReadingTime(post.content)} min read</span>
              </>
            )}
          </div>
          
          <h2 
            className="text-xl md:text-2xl font-medium mb-3 group-hover:text-primary transition-colors duration-300"
            style={{ fontFamily: "var(--public-heading-font)" }}
            data-testid={`text-post-title-${post.id}`}
          >
            {post.title}
          </h2>
          
          {showExcerpt && (
            <p 
              className="text-muted-foreground leading-relaxed line-clamp-3"
              style={{ fontFamily: "var(--public-body-font)" }}
              data-testid={`text-post-excerpt-${post.id}`}
            >
              {stripMarkdown(post.content, excerptLength)}
            </p>
          )}
        </motion.article>
      ))}
    </motion.div>
  );
}

function ListLayout({ posts, onPostClick, manifest, templateClasses }: LayoutProps) {
  const prefersReducedMotion = useReducedMotion();
  const cardStyle = manifest.cards.primaryCardStyle;

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, x: -12 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.35 } },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerAnimation}
      className="space-y-6 max-w-3xl mx-auto"
    >
      {posts.map((post) => (
        <motion.article
          key={post.id}
          variants={itemAnimation}
          className="group flex gap-6 cursor-pointer p-4 rounded-lg hover:bg-muted/50 transition-colors duration-300"
          onClick={() => onPostClick(post.slug)}
          data-testid={`card-post-${post.id}`}
        >
          {post.imageUrl && (
            <div className="w-32 h-24 md:w-48 md:h-32 rounded-lg overflow-hidden flex-shrink-0">
              <img 
                src={post.imageUrl} 
                alt={post.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}
          <div className="flex-1 min-w-0 py-1">
            {manifest.cards.showCategory && post.tags[0] && (
              <span className="text-xs font-medium uppercase tracking-wider text-primary/80 mb-2 block">
                {post.tags[0]}
              </span>
            )}
            <h2 
              className="text-lg md:text-xl font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors"
              style={{ fontFamily: "var(--public-heading-font)" }}
              data-testid={`text-post-title-${post.id}`}
            >
              {post.title}
            </h2>
            {manifest.cards.showExcerpt && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {stripMarkdown(post.content, manifest.cards.excerptLength)}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <time>{formatDate(post.createdAt)}</time>
              {manifest.cards.showReadingTime && (
                <>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                  <span>{getReadingTime(post.content)} min</span>
                </>
              )}
            </div>
          </div>
        </motion.article>
      ))}
    </motion.div>
  );
}

function MagazineLayout({ posts, onPostClick, onTagClick, manifest, templateClasses }: LayoutProps) {
  const prefersReducedMotion = useReducedMotion();
  const featuredPost = posts[0];
  const secondaryPosts = posts.slice(1, 3);
  const gridPosts = posts.slice(3);

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerAnimation}>
      {featuredPost && (
        <motion.article
          variants={itemAnimation}
          className="relative aspect-[21/9] md:aspect-[3/1] mb-8 rounded-xl overflow-hidden cursor-pointer group"
          onClick={() => onPostClick(featuredPost.slug)}
          data-testid={`card-featured-${featuredPost.id}`}
        >
          {featuredPost.imageUrl ? (
            <img 
              src={featuredPost.imageUrl} 
              alt={featuredPost.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white">
            {featuredPost.tags[0] && (
              <Badge className="bg-white/20 text-white border-0 mb-4">{featuredPost.tags[0]}</Badge>
            )}
            <h2 
              className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 line-clamp-3"
              style={{ fontFamily: "var(--public-heading-font)" }}
            >
              {featuredPost.title}
            </h2>
            <p className="text-white/80 max-w-2xl line-clamp-2 hidden md:block">
              {stripMarkdown(featuredPost.content, 160)}
            </p>
          </div>
        </motion.article>
      )}

      {secondaryPosts.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {secondaryPosts.map((post) => (
            <motion.article
              key={post.id}
              variants={itemAnimation}
              className="relative aspect-[16/9] rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => onPostClick(post.slug)}
              data-testid={`card-secondary-${post.id}`}
            >
              {post.imageUrl ? (
                <img 
                  src={post.imageUrl} 
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h3 
                  className="text-lg md:text-xl font-semibold line-clamp-2"
                  style={{ fontFamily: "var(--public-heading-font)" }}
                >
                  {post.title}
                </h3>
                <time className="text-sm text-white/70 mt-2 block">{formatDate(post.createdAt)}</time>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      {gridPosts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {gridPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={onPostClick}
              style={manifest.cards.secondaryCardStyle}
              variants={itemAnimation}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function FeaturedGridLayout({ posts, onPostClick, manifest, templateClasses }: LayoutProps) {
  const prefersReducedMotion = useReducedMotion();
  const featuredPost = posts[0];
  const gridPosts = posts.slice(1);

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerAnimation}>
      {featuredPost && (
        <motion.div variants={itemAnimation} className="mb-8">
          <PostCard
            post={featuredPost}
            onClick={onPostClick}
            style={manifest.cards.featuredCardStyle}
          />
        </motion.div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${manifest.layout.gridColumns.desktop} gap-5`}>
        {gridPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onClick={onPostClick}
            style={manifest.cards.primaryCardStyle}
            variants={itemAnimation}
          />
        ))}
      </div>
    </motion.div>
  );
}

function MasonryLayout({ posts, onPostClick, manifest, templateClasses }: LayoutProps) {
  const prefersReducedMotion = useReducedMotion();

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4 } },
  };

  const columns = [[], [], []] as Post[][];
  posts.forEach((post, index) => {
    columns[index % 3].push(post);
  });

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerAnimation}
      className="flex gap-5"
    >
      {columns.map((column, colIndex) => (
        <div key={colIndex} className="flex-1 space-y-5">
          {column.map((post, index) => (
            <motion.div
              key={post.id}
              variants={itemAnimation}
              style={{ height: `${200 + (index % 3) * 60}px` }}
            >
              <div 
                className="relative w-full h-full rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => onPostClick(post.slug)}
                data-testid={`card-post-${post.id}`}
              >
                {post.imageUrl ? (
                  <img 
                    src={post.imageUrl} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 
                    className="font-semibold line-clamp-2"
                    style={{ fontFamily: "var(--public-heading-font)" }}
                  >
                    {post.title}
                  </h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ))}
    </motion.div>
  );
}

function BentoLayout({ posts, onPostClick, manifest, templateClasses }: LayoutProps) {
  const prefersReducedMotion = useReducedMotion();
  const [first, second, third, fourth, ...rest] = posts;

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const renderBentoCard = (post: Post, size: "large" | "medium" | "small") => {
    const heightClass = size === "large" ? "row-span-2" : "";
    const cardStyle = size === "large" ? manifest.cards.featuredCardStyle : manifest.cards.primaryCardStyle;
    
    return (
      <motion.div
        key={post.id}
        variants={itemAnimation}
        className={`${heightClass}`}
      >
        <div 
          className={`relative w-full h-full min-h-[200px] rounded-xl overflow-hidden cursor-pointer group ${size === "large" ? "min-h-[400px]" : ""}`}
          onClick={() => onPostClick(post.slug)}
          data-testid={`card-post-${post.id}`}
        >
          {post.imageUrl ? (
            <img 
              src={post.imageUrl} 
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
            {post.tags[0] && (
              <Badge className="bg-white/20 text-white border-0 mb-2 text-xs">{post.tags[0]}</Badge>
            )}
            <h3 
              className={`font-bold line-clamp-2 ${size === "large" ? "text-xl md:text-2xl" : "text-base md:text-lg"}`}
              style={{ fontFamily: "var(--public-heading-font)" }}
            >
              {post.title}
            </h3>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerAnimation}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-[200px]">
        {first && renderBentoCard(first, "large")}
        {second && renderBentoCard(second, "medium")}
        {third && renderBentoCard(third, "medium")}
        {fourth && renderBentoCard(fourth, "medium")}
        {rest.map((post) => renderBentoCard(post, "small"))}
      </div>
    </motion.div>
  );
}

function BBCNewsLayout({ posts, onPostClick, onTagClick, manifest, templateClasses }: LayoutProps) {
  const prefersReducedMotion = useReducedMotion();
  
  const heroPost = posts[0];
  const leftColumnPosts = posts.slice(1, 3);
  const rightRailPosts = posts.slice(3, 8);
  const gridPosts = posts.slice(8);

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const itemAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.25 } },
  };

  const renderHeroStory = (post: Post) => (
    <motion.article
      variants={itemAnimation}
      className="group cursor-pointer"
      onClick={() => onPostClick(post.slug)}
      data-testid={`card-hero-${post.id}`}
    >
      {post.imageUrl && (
        <div className="aspect-[16/10] overflow-hidden mb-3">
          <img 
            src={post.imageUrl} 
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <h2 
        className="text-xl md:text-2xl font-bold mb-2 group-hover:underline decoration-2 underline-offset-2"
        style={{ fontFamily: "var(--public-heading-font)", lineHeight: "1.2" }}
        data-testid={`text-hero-title-${post.id}`}
      >
        {post.title}
      </h2>
      {manifest.cards.showExcerpt && (
        <p 
          className="text-sm text-muted-foreground mb-3 line-clamp-3"
          style={{ fontFamily: "var(--public-body-font)" }}
        >
          {stripMarkdown(post.content, manifest.cards.excerptLength)}
        </p>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <time>{formatRelativeTime(post.createdAt)}</time>
        {post.tags[0] && (
          <>
            <span className="text-muted-foreground/40">|</span>
            <button 
              onClick={(e) => { e.stopPropagation(); onTagClick?.(post.tags[0]); }}
              className="hover:underline font-medium"
              data-testid={`link-tag-${post.tags[0]}`}
            >
              {post.tags[0]}
            </button>
          </>
        )}
      </div>
    </motion.article>
  );

  const renderSecondaryStory = (post: Post) => (
    <motion.article
      key={post.id}
      variants={itemAnimation}
      className="group cursor-pointer pb-4 border-b border-border/40 last:border-0"
      onClick={() => onPostClick(post.slug)}
      data-testid={`card-secondary-${post.id}`}
    >
      {post.imageUrl && (
        <div className="aspect-video overflow-hidden mb-2">
          <img 
            src={post.imageUrl} 
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <h3 
        className="text-base font-bold mb-1.5 group-hover:underline decoration-1 underline-offset-2 line-clamp-3"
        style={{ fontFamily: "var(--public-heading-font)", lineHeight: "1.25" }}
        data-testid={`text-secondary-title-${post.id}`}
      >
        {post.title}
      </h3>
      {manifest.cards.showExcerpt && (
        <p 
          className="text-xs text-muted-foreground mb-2 line-clamp-2"
          style={{ fontFamily: "var(--public-body-font)" }}
        >
          {stripMarkdown(post.content, 80)}
        </p>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <time>{formatRelativeTime(post.createdAt)}</time>
        {post.tags[0] && (
          <>
            <span className="text-muted-foreground/40">|</span>
            <span className="font-medium">{post.tags[0]}</span>
          </>
        )}
      </div>
    </motion.article>
  );

  const renderHeadlineItem = (post: Post, showIcon: boolean = false) => (
    <motion.article
      key={post.id}
      variants={itemAnimation}
      className="group cursor-pointer py-3 border-b border-border/30 last:border-0"
      onClick={() => onPostClick(post.slug)}
      data-testid={`card-headline-${post.id}`}
    >
      <div className="flex gap-2">
        {showIcon && (
          <span className="text-primary mt-0.5">
            <ArrowRight className="h-3 w-3" />
          </span>
        )}
        <div className="flex-1">
          <h4 
            className="text-sm font-bold mb-1 group-hover:underline decoration-1 underline-offset-2 line-clamp-3"
            style={{ fontFamily: "var(--public-heading-font)", lineHeight: "1.3" }}
            data-testid={`text-headline-title-${post.id}`}
          >
            {post.title}
          </h4>
          <p 
            className="text-xs text-muted-foreground line-clamp-2 mb-1.5"
            style={{ fontFamily: "var(--public-body-font)" }}
          >
            {stripMarkdown(post.content, 60)}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <time>{formatRelativeTime(post.createdAt)}</time>
            {post.tags[0] && (
              <>
                <span className="text-muted-foreground/40">|</span>
                <span className="font-medium">{post.tags[0]}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );

  const renderGridStory = (post: Post) => (
    <motion.article
      key={post.id}
      variants={itemAnimation}
      className="group cursor-pointer"
      onClick={() => onPostClick(post.slug)}
      data-testid={`card-grid-${post.id}`}
    >
      {post.imageUrl && (
        <div className="aspect-video overflow-hidden mb-2">
          <img 
            src={post.imageUrl} 
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <h3 
        className="text-sm font-bold mb-1 group-hover:underline decoration-1 underline-offset-2 line-clamp-2"
        style={{ fontFamily: "var(--public-heading-font)", lineHeight: "1.25" }}
      >
        {post.title}
      </h3>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <time>{formatRelativeTime(post.createdAt)}</time>
        {post.tags[0] && (
          <>
            <span className="text-muted-foreground/40">|</span>
            <span className="font-medium">{post.tags[0]}</span>
          </>
        )}
      </div>
    </motion.article>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={containerAnimation} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-3 space-y-4 order-2 lg:order-1">
          {leftColumnPosts.map((post) => renderSecondaryStory(post))}
        </div>

        <div className="lg:col-span-6 order-1 lg:order-2">
          {heroPost && renderHeroStory(heroPost)}
        </div>

        <div className="lg:col-span-3 order-3">
          <div className="divide-y divide-border/20">
            {rightRailPosts.map((post) => renderHeadlineItem(post, true))}
          </div>
        </div>
      </div>

      {gridPosts.length > 0 && (
        <div className="pt-6 border-t border-border/50">
          <h3 
            className="text-lg font-bold mb-4 uppercase tracking-wide"
            style={{ fontFamily: "var(--public-heading-font)" }}
          >
            More Stories
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {gridPosts.map((post) => renderGridStory(post))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ForbisLayout({ posts, onPostClick, onTagClick, manifest, templateClasses }: LayoutProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<"popular" | "breaking">("popular");
  
  const heroPost = posts[0];
  const carouselPosts = posts.slice(1, 9);
  const rightSidebarPosts = posts.slice(9, 13);
  const additionalPosts = posts.slice(13);
  
  // For Popular/Breaking tabs, use all posts (not just remaining ones)
  const sortedByViews = [...posts].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 4);
  const sortedByDate = [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);
  const tabPosts = activeTab === "popular" ? sortedByViews : sortedByDate;

  const containerAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };
  const itemAnimation: Variants | undefined = prefersReducedMotion ? undefined : {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
  };

  const renderCuratedItem = (text: string, index: number) => (
    <motion.li
      key={index}
      variants={itemAnimation}
      className="flex items-start gap-2 text-sm py-1"
    >
      <span className="text-foreground/60 mt-0.5">•</span>
      <span className="hover:underline cursor-pointer" style={{ fontFamily: "var(--public-body-font)" }}>
        {text}
      </span>
    </motion.li>
  );

  const renderNumberedArticle = (post: Post, index: number) => (
    <motion.article
      key={post.id}
      variants={itemAnimation}
      className="flex items-start gap-3 py-3 border-b border-border/30 last:border-0 cursor-pointer group"
      onClick={() => onPostClick(post.slug)}
      data-testid={`card-numbered-${post.id}`}
    >
      <span 
        className="text-2xl font-bold text-muted-foreground/40 min-w-[24px]"
        style={{ fontFamily: "var(--public-heading-font)" }}
      >
        {index + 1}.
      </span>
      <div className="flex-1 min-w-0">
        <h4 
          className="text-sm font-semibold group-hover:underline decoration-1 underline-offset-2 line-clamp-2"
          style={{ fontFamily: "var(--public-heading-font)", lineHeight: "1.3" }}
          data-testid={`text-numbered-title-${post.id}`}
        >
          {post.title}
        </h4>
      </div>
      {post.imageUrl && (
        <div className="w-12 h-12 flex-shrink-0 overflow-hidden">
          <img 
            src={post.imageUrl} 
            alt="" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </motion.article>
  );

  const renderHeroStory = (post: Post) => (
    <motion.article
      variants={itemAnimation}
      className="group cursor-pointer"
      onClick={() => onPostClick(post.slug)}
      data-testid={`card-forbis-hero-${post.id}`}
    >
      {post.imageUrl && (
        <div className="aspect-[4/5] overflow-hidden mb-4">
          <img 
            src={post.imageUrl} 
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {post.tags[0] && (
        <button 
          onClick={(e) => { e.stopPropagation(); onTagClick?.(post.tags[0]); }}
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:underline mb-2 block"
          data-testid={`link-forbis-tag-${post.tags[0]}`}
        >
          {post.tags[0]}
        </button>
      )}
      <h2 
        className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 group-hover:underline decoration-2 underline-offset-4"
        style={{ fontFamily: "var(--public-heading-font)", lineHeight: "1.15" }}
        data-testid={`text-forbis-hero-title-${post.id}`}
      >
        {post.title}
      </h2>
      {(post as any).authorName && (
        <p 
          className="text-sm text-muted-foreground"
          style={{ fontFamily: "var(--public-body-font)" }}
        >
          By <span className="text-foreground font-medium">{(post as any).authorName}</span>
        </p>
      )}
    </motion.article>
  );

  const renderRightSidebarCard = (post: Post) => (
    <motion.article
      key={post.id}
      variants={itemAnimation}
      className="group cursor-pointer pb-4 border-b border-border/30 last:border-0"
      onClick={() => onPostClick(post.slug)}
      data-testid={`card-forbis-sidebar-${post.id}`}
    >
      {post.imageUrl && (
        <div className="aspect-video overflow-hidden mb-2">
          <img 
            src={post.imageUrl} 
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {post.tags[0] && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
          {post.tags[0]}
        </span>
      )}
      <h3 
        className="text-sm font-bold group-hover:underline decoration-1 underline-offset-2 line-clamp-3 mb-1"
        style={{ fontFamily: "var(--public-heading-font)", lineHeight: "1.25" }}
        data-testid={`text-forbis-sidebar-title-${post.id}`}
      >
        {post.title}
      </h3>
      {(post as any).authorName && (
        <p 
          className="text-xs text-muted-foreground"
          style={{ fontFamily: "var(--public-body-font)" }}
        >
          By <span className="text-foreground">{(post as any).authorName}</span>
        </p>
      )}
    </motion.article>
  );

  const renderAdditionalCard = (post: Post) => (
    <motion.article
      key={post.id}
      variants={itemAnimation}
      className="group cursor-pointer"
      onClick={() => onPostClick(post.slug)}
      data-testid={`card-forbis-additional-${post.id}`}
    >
      {post.imageUrl && (
        <div className="aspect-video overflow-hidden mb-2">
          <img 
            src={post.imageUrl} 
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      {post.tags[0] && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
          {post.tags[0]}
        </span>
      )}
      <h3 
        className="text-sm font-bold group-hover:underline decoration-1 underline-offset-2 line-clamp-2 mb-1"
        style={{ fontFamily: "var(--public-heading-font)", lineHeight: "1.25" }}
      >
        {post.title}
      </h3>
      {manifest.cards.showExcerpt && (
        <p 
          className="text-xs text-muted-foreground line-clamp-2 mb-1"
          style={{ fontFamily: "var(--public-body-font)" }}
        >
          {stripMarkdown(post.content, 80)}
        </p>
      )}
      {(post as any).authorName && (
        <p 
          className="text-xs text-muted-foreground"
          style={{ fontFamily: "var(--public-body-font)" }}
        >
          By <span className="text-foreground">{(post as any).authorName}</span>
        </p>
      )}
    </motion.article>
  );

  const curatedHeadlines = posts.slice(0, 3).map(p => p.title.slice(0, 60) + (p.title.length > 60 ? "..." : ""));

  return (
    <motion.div initial="hidden" animate="visible" variants={containerAnimation} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 order-2 lg:order-1 space-y-6">
          <div className="space-y-3">
            <h3 
              className="text-lg font-bold"
              style={{ fontFamily: "var(--public-heading-font)" }}
            >
              Evening Rundown
            </h3>
            <ul className="space-y-1">
              {curatedHeadlines.map((text, i) => renderCuratedItem(text, i))}
            </ul>
          </div>

          <div className="space-y-3 pt-4 border-t border-border/40">
            <div className="flex gap-4 border-b border-border/40">
              <button
                onClick={() => setActiveTab("popular")}
                className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "popular" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"}`}
                data-testid="tab-popular"
              >
                Popular
              </button>
              <button
                onClick={() => setActiveTab("breaking")}
                className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "breaking" ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"}`}
                data-testid="tab-breaking"
              >
                Breaking News
              </button>
            </div>
            <div className="divide-y divide-border/20">
              {tabPosts.map((post: Post, index: number) => renderNumberedArticle(post, index))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
          {heroPost && renderHeroStory(heroPost)}
          
          {carouselPosts.length > 0 && (
            <div className="pt-6 border-t border-border/40">
              <h3 
                className="text-lg font-bold mb-4"
                style={{ fontFamily: "var(--public-heading-font)" }}
              >
                Featured Stories
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
                {carouselPosts.map((post: Post) => (
                  <motion.article
                    key={post.id}
                    variants={itemAnimation}
                    className="group cursor-pointer flex-shrink-0 w-48"
                    onClick={() => onPostClick(post.slug)}
                    data-testid={`card-forbis-carousel-${post.id}`}
                  >
                    {post.imageUrl && (
                      <div className="aspect-[4/3] overflow-hidden mb-2">
                        <img 
                          src={post.imageUrl} 
                          alt={post.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {post.tags[0] && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                        {post.tags[0]}
                      </span>
                    )}
                    <h4 
                      className="text-sm font-bold group-hover:underline decoration-1 underline-offset-2 line-clamp-2"
                      style={{ fontFamily: "var(--public-heading-font)", lineHeight: "1.25" }}
                    >
                      {post.title}
                    </h4>
                  </motion.article>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 order-3 space-y-4">
          {rightSidebarPosts.map((post: Post) => renderRightSidebarCard(post))}
        </div>
      </div>

      {additionalPosts.length > 0 && (
        <div className="pt-8 border-t border-border/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalPosts.map((post) => renderAdditionalCard(post))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
