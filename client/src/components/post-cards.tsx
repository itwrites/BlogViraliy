import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Clock, ArrowRight } from "lucide-react";
import type { Post } from "@shared/schema";
import { stripMarkdown } from "@/lib/strip-markdown";

type PostCardStyle = "standard" | "editorial" | "minimal" | "overlay" | "compact";

interface PostCardProps {
  post: Post;
  onClick: (slug: string) => void;
  style: PostCardStyle;
  cardClasses?: {
    container: string;
    image: string;
    hover: string;
  };
  variants?: Variants;
  index?: number;
}

const defaultCardClasses = {
  container: "bg-card rounded-lg border shadow-sm",
  image: "rounded-t-lg",
  hover: "hover:shadow-md transition-shadow duration-300",
};

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

export function PostCard({ post, onClick, style, cardClasses, variants, index = 0 }: PostCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const classes = cardClasses || defaultCardClasses;

  switch (style) {
    case "editorial":
      return <EditorialCard post={post} onClick={onClick} variants={variants} />;
    case "minimal":
      return <MinimalCard post={post} onClick={onClick} variants={variants} />;
    case "overlay":
      return <OverlayCard post={post} onClick={onClick} variants={variants} />;
    case "compact":
      return <CompactCard post={post} onClick={onClick} cardClasses={classes} variants={variants} />;
    default:
      return <StandardCard post={post} onClick={onClick} cardClasses={classes} variants={variants} />;
  }
}

function StandardCard({ 
  post, 
  onClick, 
  cardClasses,
  variants 
}: { 
  post: Post; 
  onClick: (slug: string) => void; 
  cardClasses: { container: string; image: string; hover: string };
  variants?: Variants;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article 
      variants={variants}
      className={`group cursor-pointer ${cardClasses.container} ${cardClasses.hover} overflow-hidden`}
      onClick={() => onClick(post.slug)}
      data-testid={`card-post-${post.id}`}
    >
      <div className={`relative aspect-[4/3] overflow-hidden bg-muted ${cardClasses.image}`}>
        {post.imageUrl ? (
          <motion.img 
            src={post.imageUrl} 
            alt={post.title} 
            className="absolute inset-0 w-full h-full object-cover"
            whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.4, ease: "easeOut" }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted to-muted-foreground/5" />
        )}
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {post.tags[0] && (
            <>
              <span 
                className="font-semibold uppercase tracking-[0.12em] text-primary/80"
                data-testid={`badge-post-category-${post.id}`}
              >
                {post.tags[0]}
              </span>
              <span className="text-muted-foreground/40">·</span>
            </>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {getReadingTime(post.content)} min
          </span>
        </div>

        <h3 
          className="text-xl sm:text-[1.35rem] font-semibold leading-snug tracking-tight line-clamp-2 group-hover:text-primary transition-colors duration-300"
          style={{ fontFamily: "var(--public-heading-font)" }}
          data-testid={`text-post-title-${post.id}`}
        >
          {post.title}
        </h3>

        <p 
          className="text-muted-foreground text-sm leading-relaxed line-clamp-2"
          data-testid={`text-post-excerpt-${post.id}`}
        >
          {stripMarkdown(post.content, 120)}
        </p>

        <time 
          className="block text-xs text-muted-foreground/70 pt-1"
          data-testid={`text-post-date-${post.id}`}
        >
          {formatDate(post.createdAt)}
        </time>
      </div>
    </motion.article>
  );
}

function EditorialCard({ 
  post, 
  onClick, 
  variants 
}: { 
  post: Post; 
  onClick: (slug: string) => void;
  variants?: Variants;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article 
      variants={variants}
      className="group cursor-pointer"
      onClick={() => onClick(post.slug)}
      data-testid={`card-post-${post.id}`}
    >
      <div className="relative flex flex-col md:flex-row gap-0 bg-card rounded-xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-500">
        <div className="relative md:w-1/2 aspect-[4/3] md:aspect-auto overflow-hidden">
          {post.imageUrl ? (
            <motion.img 
              src={post.imageUrl} 
              alt={post.title} 
              className="absolute inset-0 w-full h-full object-cover"
              whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
              transition={prefersReducedMotion ? undefined : { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-card/50 md:block hidden" />
        </div>

        <div className="relative md:w-1/2 p-6 md:p-8 lg:p-10 flex flex-col justify-center md:-ml-8 bg-card md:rounded-l-xl z-10">
          <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground/80">
            {post.tags[0] && (
              <span 
                className="font-medium uppercase tracking-[0.15em] text-primary/70"
                data-testid={`badge-post-category-${post.id}`}
              >
                {post.tags[0]}
              </span>
            )}
            <span className="text-muted-foreground/40">·</span>
            <time data-testid={`text-post-date-${post.id}`}>
              {formatDate(post.createdAt)}
            </time>
          </div>

          <h3 
            className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight tracking-tight mb-4 group-hover:text-primary/90 transition-colors duration-300"
            style={{ fontFamily: "var(--public-heading-font)" }}
            data-testid={`text-post-title-${post.id}`}
          >
            {post.title}
          </h3>

          <div className="w-12 h-px bg-border mb-4" />

          <p 
            className="text-muted-foreground leading-relaxed line-clamp-3 mb-6"
            data-testid={`text-post-excerpt-${post.id}`}
          >
            {stripMarkdown(post.content, 160)}
          </p>

          <span className="inline-flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all duration-300">
            Read More
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </motion.article>
  );
}

function MinimalCard({ 
  post, 
  onClick, 
  variants 
}: { 
  post: Post; 
  onClick: (slug: string) => void;
  variants?: Variants;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article 
      variants={variants}
      className="group cursor-pointer py-6 border-b border-border/50 last:border-0 hover:bg-muted/30 -mx-4 px-4 transition-all duration-300"
      onClick={() => onClick(post.slug)}
      data-testid={`card-post-${post.id}`}
    >
      <div className="flex items-start gap-6">
        {post.imageUrl && (
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
            <motion.img 
              src={post.imageUrl} 
              alt={post.title} 
              className="absolute inset-0 w-full h-full object-cover"
              whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
              transition={prefersReducedMotion ? undefined : { duration: 0.3, ease: "easeOut" }}
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
            {post.tags[0] && (
              <>
                <span 
                  className="font-medium uppercase tracking-[0.1em] text-primary/70"
                  data-testid={`badge-post-category-${post.id}`}
                >
                  {post.tags[0]}
                </span>
                <span className="text-muted-foreground/40">·</span>
              </>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getReadingTime(post.content)} min read
            </span>
          </div>

          <h3 
            className="text-lg sm:text-xl font-semibold leading-snug tracking-tight line-clamp-2 group-hover:text-primary transition-colors duration-200 mb-2"
            style={{ fontFamily: "var(--public-heading-font)" }}
            data-testid={`text-post-title-${post.id}`}
          >
            {post.title}
          </h3>

          <p 
            className="text-muted-foreground text-sm leading-relaxed line-clamp-2 hidden sm:block"
            data-testid={`text-post-excerpt-${post.id}`}
          >
            {stripMarkdown(post.content, 100)}
          </p>

          <time 
            className="block text-xs text-muted-foreground/60 mt-2"
            data-testid={`text-post-date-${post.id}`}
          >
            {formatDate(post.createdAt)}
          </time>
        </div>

        <ArrowRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 flex-shrink-0 hidden sm:block" />
      </div>
    </motion.article>
  );
}

function OverlayCard({ 
  post, 
  onClick, 
  variants 
}: { 
  post: Post; 
  onClick: (slug: string) => void;
  variants?: Variants;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article 
      variants={variants}
      className="group cursor-pointer relative aspect-[4/3] rounded-xl overflow-hidden"
      onClick={() => onClick(post.slug)}
      data-testid={`card-post-${post.id}`}
    >
      {post.imageUrl ? (
        <motion.img 
          src={post.imageUrl} 
          alt={post.title} 
          className="absolute inset-0 w-full h-full object-cover"
          whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.5, ease: "easeOut" }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary/20 to-muted" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      
      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-end text-white">
        <div className="flex items-center gap-3 mb-3 text-xs text-white/70">
          {post.tags[0] && (
            <>
              <span 
                className="font-semibold uppercase tracking-[0.12em] text-white/90"
                data-testid={`badge-post-category-${post.id}`}
              >
                {post.tags[0]}
              </span>
              <span className="text-white/40">·</span>
            </>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {getReadingTime(post.content)} min
          </span>
        </div>

        <h3 
          className="text-xl sm:text-2xl font-bold leading-snug tracking-tight line-clamp-2 group-hover:text-primary-foreground transition-colors duration-300"
          style={{ fontFamily: "var(--public-heading-font)" }}
          data-testid={`text-post-title-${post.id}`}
        >
          {post.title}
        </h3>

        <p 
          className="text-white/70 text-sm leading-relaxed line-clamp-2 mt-2 hidden sm:block"
          data-testid={`text-post-excerpt-${post.id}`}
        >
          {stripMarkdown(post.content, 100)}
        </p>

        <time 
          className="block text-xs text-white/50 mt-3"
          data-testid={`text-post-date-${post.id}`}
        >
          {formatDate(post.createdAt)}
        </time>
      </div>
    </motion.article>
  );
}

function CompactCard({ 
  post, 
  onClick, 
  cardClasses,
  variants 
}: { 
  post: Post; 
  onClick: (slug: string) => void;
  cardClasses?: { container: string; image: string; hover: string };
  variants?: Variants;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.article 
      variants={variants}
      className={`group cursor-pointer h-full ${cardClasses?.container || ""} ${cardClasses?.hover || ""}`}
      onClick={() => onClick(post.slug)}
      data-testid={`card-secondary-post-${post.id}`}
    >
      <div className={`aspect-video bg-muted overflow-hidden ${cardClasses?.image || ""}`}>
        {post.imageUrl ? (
          <motion.img 
            src={post.imageUrl} 
            alt={post.title} 
            className="w-full h-full object-cover"
            whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.5, ease: "easeOut" }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted via-muted to-muted-foreground/5" />
        )}
      </div>

      <div className="p-3">
        {post.tags[0] && (
          <span 
            className="inline-block text-[10px] font-medium uppercase tracking-wider bg-secondary text-secondary-foreground px-2 py-0.5 rounded mb-2"
            data-testid={`badge-secondary-tag-${post.id}`}
          >
            {post.tags[0]}
          </span>
        )}
        
        <h3 
          className="text-sm font-semibold line-clamp-2 hover:opacity-80 transition-opacity"
          style={{ fontFamily: "var(--public-heading-font)" }}
          data-testid={`text-secondary-title-${post.id}`}
        >
          {post.title}
        </h3>
      </div>
    </motion.article>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsisStart = currentPage > 3;
    const showEllipsisEnd = currentPage < totalPages - 2;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (showEllipsisStart) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (showEllipsisEnd) {
        pages.push("...");
      }

      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <nav 
      className="flex items-center justify-center gap-1 sm:gap-2 mt-12 sm:mt-16"
      aria-label="Pagination"
      data-testid="pagination"
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-sm font-medium rounded-md border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        data-testid="button-pagination-prev"
        aria-label="Previous page"
      >
        Previous
      </button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => (
          typeof page === "number" ? (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[40px] h-10 text-sm font-medium rounded-md transition-colors ${
                currentPage === page
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card hover:bg-muted"
              }`}
              data-testid={`button-pagination-page-${page}`}
              aria-label={`Page ${page}`}
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </button>
          ) : (
            <span 
              key={`ellipsis-${index}`} 
              className="px-2 text-muted-foreground"
              aria-hidden="true"
            >
              ...
            </span>
          )
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-sm font-medium rounded-md border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        data-testid="button-pagination-next"
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
}
