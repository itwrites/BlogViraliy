import { useLocation } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { motion, useReducedMotion } from "framer-motion";
import { getThemeManifest, getTypographyClasses, type ThemeManifest, type PostDetailVariant } from "@/lib/theme-manifest";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { stripMarkdown } from "@/lib/strip-markdown";
import { createLinkRewriter } from "@/lib/rewrite-links";

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'mark', 'u', 'del', 's'],
  attributes: { ...defaultSchema.attributes, mark: [], u: [], del: [], s: [] },
  clobberPrefix: '',
  clobber: [],
};

interface ThemePostDetailProps {
  site: Site;
  post: Post;
  relatedPosts?: Post[];
}

function estimateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function ThemePostDetail({ site, post, relatedPosts = [] }: ThemePostDetailProps) {
  const [, setLocation] = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const themeId = site.siteType || "blog";
  const manifest = getThemeManifest(themeId);
  const templateClasses = useTemplateClasses(site.templateSettings);
  
  if (!manifest) {
    return <StandardPostDetail site={site} post={post} relatedPosts={relatedPosts} />;
  }

  const variant = manifest.postDetail.variant;
  
  switch (variant) {
    case "centered":
      return <CenteredPostDetail site={site} post={post} relatedPosts={relatedPosts} manifest={manifest} />;
    case "minimal":
      return <MinimalPostDetail site={site} post={post} relatedPosts={relatedPosts} manifest={manifest} />;
    case "magazine":
      return <MagazinePostDetail site={site} post={post} relatedPosts={relatedPosts} manifest={manifest} />;
    case "immersive":
      return <ImmersivePostDetail site={site} post={post} relatedPosts={relatedPosts} manifest={manifest} />;
    case "wide":
      return <WidePostDetail site={site} post={post} relatedPosts={relatedPosts} manifest={manifest} />;
    default:
      return <StandardPostDetail site={site} post={post} relatedPosts={relatedPosts} manifest={manifest} />;
  }
}

function StandardPostDetail({ site, post, relatedPosts, manifest }: ThemePostDetailProps & { manifest?: ThemeManifest }) {
  const [, setLocation] = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const templateClasses = useTemplateClasses(site.templateSettings);
  const readingTime = estimateReadingTime(post.content);
  const typography = manifest ? getTypographyClasses(manifest) : null;

  const handleTagClick = (tag: string) => setLocation(`/tag/${encodeURIComponent(tag)}`);
  const handleBack = () => setLocation("/");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {post.imageUrl && (
        <motion.div 
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={prefersReducedMotion ? false : { opacity: 1 }}
          transition={prefersReducedMotion ? {} : { duration: 0.5 }}
          className="relative w-full h-[35vh] sm:h-[45vh] md:h-[55vh] overflow-hidden"
        >
          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" data-testid="img-post-hero" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        </motion.div>
      )}

      <main className={`${post.imageUrl ? '-mt-32 relative z-10' : 'pt-8'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.article 
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? {} : { delay: 0.2, duration: 0.4 }}
            data-testid={`article-${post.id}`}
          >
            <div className={`${post.imageUrl ? `bg-card ${templateClasses.cardStyle.radiusLg} p-6 sm:p-10 shadow-xl border` : 'pb-8'}`}>
              <div className="flex flex-wrap gap-2 mb-5">
                {post.tags.map((tag, index) => (
                  <motion.div
                    key={tag}
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
                    animate={prefersReducedMotion ? false : { opacity: 1, scale: 1 }}
                    transition={prefersReducedMotion ? {} : { delay: 0.3 + index * 0.05 }}
                  >
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover-elevate text-xs px-3 py-1"
                      onClick={() => handleTagClick(tag)}
                      data-testid={`tag-${tag}`}
                    >
                      {tag}
                    </Badge>
                  </motion.div>
                ))}
              </div>

              <h1 
                className={`text-2xl sm:text-3xl md:text-4xl mb-5 leading-tight ${typography?.headingClass || 'font-bold tracking-tight'}`}
                style={{ fontFamily: "var(--public-heading-font)" }}
                data-testid="text-post-title"
              >
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-6 border-b">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={post.createdAt.toString()} data-testid="text-post-date">
                    {new Date(post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </time>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span data-testid="text-reading-time">{readingTime} min read</span>
                </div>
              </div>

              <PostContent post={post} basePath={site.basePath} />

              <PostTags tags={post.tags} onTagClick={handleTagClick} />
            </div>
          </motion.article>

          {manifest?.postDetail.showRelatedPosts && (relatedPosts?.length ?? 0) > 0 && (
            <RelatedPosts posts={relatedPosts || []} style={manifest.postDetail.relatedPostsStyle} onPostClick={(slug) => setLocation(`/post/${slug}`)} />
          )}
        </div>
      </main>
    </div>
  );
}

function CenteredPostDetail({ site, post, relatedPosts, manifest }: ThemePostDetailProps & { manifest: ThemeManifest }) {
  const [, setLocation] = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const readingTime = estimateReadingTime(post.content);
  const typography = getTypographyClasses(manifest);

  const handleTagClick = (tag: string) => setLocation(`/tag/${encodeURIComponent(tag)}`);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="pt-12 pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <motion.article 
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? {} : { duration: 0.5 }}
            className="text-center"
            data-testid={`article-${post.id}`}
          >
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {post.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer text-xs px-3 py-1 font-medium"
                  onClick={() => handleTagClick(tag)}
                  data-testid={`tag-${tag}`}
                >
                  {tag}
                </Badge>
              ))}
            </div>

            <h1 
              className={`${typography.titleSizeClass} ${typography.headingClass} mb-6 leading-tight`}
              style={{ fontFamily: "var(--public-heading-font)" }}
              data-testid="text-post-title"
            >
              {post.title}
            </h1>

            <div className="flex justify-center items-center gap-6 text-sm text-muted-foreground mb-10">
              <time dateTime={post.createdAt.toString()} data-testid="text-post-date">
                {new Date(post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </time>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <span data-testid="text-reading-time">{readingTime} min read</span>
            </div>

            {post.imageUrl && manifest.postDetail.heroImageStyle !== "none" && (
              <motion.div 
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
                animate={prefersReducedMotion ? false : { opacity: 1, scale: 1 }}
                transition={prefersReducedMotion ? {} : { delay: 0.2, duration: 0.5 }}
                className="relative aspect-[16/9] overflow-hidden rounded-lg mb-12"
              >
                <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" data-testid="img-post-hero" />
              </motion.div>
            )}

            <div className="text-left">
              <PostContent post={post} basePath={site.basePath} typographyScale="spacious" />
            </div>

            <div className="mt-12 pt-8 border-t text-left">
              <PostTags tags={post.tags} onTagClick={handleTagClick} />
            </div>
          </motion.article>

          {manifest.postDetail.showRelatedPosts && (relatedPosts?.length ?? 0) > 0 && (
            <div className="mt-16">
              <RelatedPosts posts={relatedPosts || []} style="minimal" onPostClick={(slug) => setLocation(`/post/${slug}`)} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function MinimalPostDetail({ site, post, relatedPosts, manifest }: ThemePostDetailProps & { manifest: ThemeManifest }) {
  const [, setLocation] = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const readingTime = estimateReadingTime(post.content);
  const typography = getTypographyClasses(manifest);

  const handleTagClick = (tag: string) => setLocation(`/tag/${encodeURIComponent(tag)}`);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="py-16">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <motion.article 
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={prefersReducedMotion ? false : { opacity: 1 }}
            transition={prefersReducedMotion ? {} : { duration: 0.4 }}
            data-testid={`article-${post.id}`}
          >
            <time 
              className="block text-sm text-muted-foreground mb-4"
              dateTime={post.createdAt.toString()} 
              data-testid="text-post-date"
            >
              {new Date(post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </time>

            <h1 
              className={`${typography.titleSizeClass} ${typography.headingClass} mb-8`}
              style={{ fontFamily: "var(--public-heading-font)" }}
              data-testid="text-post-title"
            >
              {post.title}
            </h1>

            <PostContent post={post} basePath={site.basePath} typographyScale="spacious" />

            <div className="mt-12 pt-6 border-t flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleTagClick(tag)}
                  data-testid={`tag-${tag}`}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </motion.article>
        </div>
      </main>
    </div>
  );
}

function MagazinePostDetail({ site, post, relatedPosts, manifest }: ThemePostDetailProps & { manifest: ThemeManifest }) {
  const [, setLocation] = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const readingTime = estimateReadingTime(post.content);
  const typography = getTypographyClasses(manifest);

  const handleTagClick = (tag: string) => setLocation(`/tag/${encodeURIComponent(tag)}`);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {post.imageUrl && (
        <motion.div 
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={prefersReducedMotion ? false : { opacity: 1 }}
          transition={prefersReducedMotion ? {} : { duration: 0.6 }}
          className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden"
        >
          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" data-testid="img-post-hero" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
            <div className="max-w-4xl mx-auto text-white">
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs"
                    data-testid={`tag-${tag}`}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <h1 
                className={`${typography.titleSizeClass} ${typography.headingClass} text-white mb-4`}
                style={{ fontFamily: "var(--public-heading-font)" }}
                data-testid="text-post-title"
              >
                {post.title}
              </h1>
              <div className="flex items-center gap-4 text-white/80 text-sm">
                <time dateTime={post.createdAt.toString()} data-testid="text-post-date">
                  {new Date(post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </time>
                <span className="w-1 h-1 rounded-full bg-white/50" />
                <span data-testid="text-reading-time">{readingTime} min read</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <main className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.article 
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? {} : { delay: 0.3, duration: 0.4 }}
            data-testid={`article-${post.id}`}
          >
            {!post.imageUrl && (
              <>
                <h1 
                  className={`${typography.titleSizeClass} ${typography.headingClass} mb-6`}
                  style={{ fontFamily: "var(--public-heading-font)" }}
                  data-testid="text-post-title"
                >
                  {post.title}
                </h1>
                <div className="flex items-center gap-4 text-muted-foreground text-sm mb-8 pb-8 border-b">
                  <time dateTime={post.createdAt.toString()}>
                    {new Date(post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </time>
                  <span data-testid="text-reading-time">{readingTime} min read</span>
                </div>
              </>
            )}

            <PostContent post={post} basePath={site.basePath} />

            <PostTags tags={post.tags} onTagClick={handleTagClick} />
          </motion.article>

          {manifest.postDetail.showRelatedPosts && (relatedPosts?.length ?? 0) > 0 && (
            <div className="mt-16">
              <RelatedPosts posts={relatedPosts || []} style="cards" onPostClick={(slug) => setLocation(`/post/${slug}`)} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ImmersivePostDetail({ site, post, relatedPosts, manifest }: ThemePostDetailProps & { manifest: ThemeManifest }) {
  const [, setLocation] = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const readingTime = estimateReadingTime(post.content);
  const typography = getTypographyClasses(manifest);

  const handleTagClick = (tag: string) => setLocation(`/tag/${encodeURIComponent(tag)}`);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {post.imageUrl && (
        <motion.div 
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.05 }}
          animate={prefersReducedMotion ? false : { opacity: 1, scale: 1 }}
          transition={prefersReducedMotion ? {} : { duration: 0.8 }}
          className="relative w-full h-screen overflow-hidden"
        >
          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" data-testid="img-post-hero" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
            <div className="max-w-4xl mx-auto text-white">
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
                animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
                transition={prefersReducedMotion ? {} : { delay: 0.4, duration: 0.6 }}
              >
                <h1 
                  className={`text-4xl md:text-5xl lg:text-6xl ${typography.headingClass} text-white mb-6`}
                  style={{ fontFamily: "var(--public-heading-font)" }}
                  data-testid="text-post-title"
                >
                  {post.title}
                </h1>
                <div className="flex items-center gap-4 text-white/80">
                  <time dateTime={post.createdAt.toString()} data-testid="text-post-date">
                    {new Date(post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </time>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                  <span data-testid="text-reading-time">{readingTime} min read</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      <main className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.article 
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? {} : { delay: 0.2, duration: 0.4 }}
            data-testid={`article-${post.id}`}
          >
            {!post.imageUrl && (
              <div className="mb-12">
                <h1 
                  className={`${typography.titleSizeClass} ${typography.headingClass} mb-6`}
                  style={{ fontFamily: "var(--public-heading-font)" }}
                  data-testid="text-post-title"
                >
                  {post.title}
                </h1>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <time dateTime={post.createdAt.toString()}>
                    {new Date(post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </time>
                  <span data-testid="text-reading-time">{readingTime} min read</span>
                </div>
              </div>
            )}

            <PostContent post={post} basePath={site.basePath} />

            <PostTags tags={post.tags} onTagClick={handleTagClick} />
          </motion.article>

          {manifest.postDetail.showRelatedPosts && (relatedPosts?.length ?? 0) > 0 && (
            <div className="mt-20">
              <RelatedPosts posts={relatedPosts || []} style="cards" onPostClick={(slug) => setLocation(`/post/${slug}`)} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function WidePostDetail({ site, post, relatedPosts, manifest }: ThemePostDetailProps & { manifest: ThemeManifest }) {
  const [, setLocation] = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const readingTime = estimateReadingTime(post.content);
  const typography = getTypographyClasses(manifest);

  const handleTagClick = (tag: string) => setLocation(`/tag/${encodeURIComponent(tag)}`);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {post.imageUrl && (
        <motion.div 
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={prefersReducedMotion ? false : { opacity: 1 }}
          transition={prefersReducedMotion ? {} : { duration: 0.5 }}
          className="w-full aspect-[21/9] overflow-hidden"
        >
          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" data-testid="img-post-hero" />
        </motion.div>
      )}

      <main className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.article 
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? {} : { delay: 0.2, duration: 0.4 }}
            data-testid={`article-${post.id}`}
          >
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer text-xs"
                  onClick={() => handleTagClick(tag)}
                  data-testid={`tag-${tag}`}
                >
                  {tag}
                </Badge>
              ))}
            </div>

            <h1 
              className={`${typography.titleSizeClass} ${typography.headingClass} mb-6`}
              style={{ fontFamily: "var(--public-heading-font)" }}
              data-testid="text-post-title"
            >
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-muted-foreground text-sm mb-10 pb-6 border-b">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <time dateTime={post.createdAt.toString()} data-testid="text-post-date">
                  {new Date(post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </time>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span data-testid="text-reading-time">{readingTime} min read</span>
              </div>
            </div>

            <div className="max-w-3xl mx-auto">
              <PostContent post={post} basePath={site.basePath} />
            </div>
          </motion.article>

          {manifest.postDetail.showRelatedPosts && (relatedPosts?.length ?? 0) > 0 && (
            <div className="mt-16">
              <RelatedPosts posts={relatedPosts || []} style="cards" onPostClick={(slug) => setLocation(`/post/${slug}`)} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PostContent({ post, basePath, typographyScale = "normal" }: { post: Post; basePath?: string; typographyScale?: "compact" | "normal" | "spacious" }) {
  const scaleClasses = {
    compact: "prose-sm",
    normal: "prose-lg",
    spacious: "prose-xl",
  };

  return (
    <div 
      className={`prose dark:prose-invert max-w-none mt-8
        ${scaleClasses[typographyScale]}
        prose-headings:font-semibold prose-headings:tracking-tight
        prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
        prose-p:text-base prose-p:leading-relaxed prose-p:text-foreground/90
        prose-a:text-foreground prose-a:underline prose-a:underline-offset-2 hover:prose-a:opacity-70
        prose-strong:text-foreground prose-strong:font-semibold
        prose-blockquote:border-l-accent prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-md
        prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-muted prose-pre:border
        prose-img:rounded-lg prose-img:shadow-md
        prose-ul:my-4 prose-ol:my-4
        prose-li:text-foreground/90`}
      style={{ fontFamily: "var(--public-body-font)" }}
      data-testid="text-post-content"
    >
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={{
          a: createLinkRewriter(basePath) as any
        }}
      >
        {post.content}
      </ReactMarkdown>
    </div>
  );
}

function PostTags({ tags, onTagClick }: { tags: string[]; onTagClick: (tag: string) => void }) {
  return (
    <div className="mt-10 pt-6 border-t">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">Tags:</span>
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="cursor-pointer hover-elevate"
            onClick={() => onTagClick(tag)}
            data-testid={`tag-link-${tag}`}
          >
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function RelatedPosts({ 
  posts, 
  style, 
  onPostClick 
}: { 
  posts: Post[]; 
  style: "cards" | "list" | "minimal"; 
  onPostClick: (slug: string) => void;
}) {
  if (posts.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t">
      <h3 className="text-lg font-semibold mb-6" style={{ fontFamily: "var(--public-heading-font)" }}>
        Related Posts
      </h3>
      
      {style === "minimal" ? (
        <div className="space-y-4">
          {posts.slice(0, 4).map((post) => (
            <div 
              key={post.id}
              className="group cursor-pointer"
              onClick={() => onPostClick(post.slug)}
              data-testid={`related-post-${post.id}`}
            >
              <h4 className="font-medium group-hover:text-primary transition-colors line-clamp-2">
                {post.title}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      ) : style === "list" ? (
        <div className="space-y-4">
          {posts.slice(0, 5).map((post) => (
            <div 
              key={post.id}
              className="flex gap-4 group cursor-pointer"
              onClick={() => onPostClick(post.slug)}
              data-testid={`related-post-${post.id}`}
            >
              {post.imageUrl && (
                <div className="w-20 h-16 rounded overflow-hidden flex-shrink-0">
                  <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium group-hover:text-primary transition-colors line-clamp-2">
                  {post.title}
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {posts.slice(0, 3).map((post) => (
            <Card 
              key={post.id}
              className="overflow-hidden cursor-pointer hover-elevate"
              onClick={() => onPostClick(post.slug)}
              data-testid={`related-post-${post.id}`}
            >
              {post.imageUrl && (
                <div className="aspect-[16/10] overflow-hidden">
                  <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <h4 className="font-medium line-clamp-2">{post.title}</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
