import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTemplateClasses } from "@/components/public-theme-provider";
import { PublicLayout } from "@/components/public-layout";
import { stripMarkdown } from "@/lib/strip-markdown";
import { PublicHeader } from "@/components/public-header";
import { motion, useReducedMotion } from "framer-motion";

interface PublicPostProps {
  site: Site;
}

export function PublicPost({ site }: PublicPostProps) {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const templateClasses = useTemplateClasses(site.templateSettings);
  const prefersReducedMotion = useReducedMotion();

  const { data: post, isLoading } = useQuery<Post>({
    queryKey: ["/api/public/sites", site.id, "posts", slug],
  });

  const { data: relatedPosts } = useQuery<Post[]>({
    queryKey: ["/api/public/sites", site.id, "related-posts", post?.id],
    enabled: !!post,
  });

  const { data: allPosts } = useQuery<Post[]>({
    queryKey: ["/api/public/sites", site.id, "posts"],
  });

  const { data: topTags } = useQuery<string[]>({
    queryKey: ["/api/public/sites", site.id, "top-tags"],
  });

  const handleTagClick = (tag: string) => {
    setLocation(`/tag/${encodeURIComponent(tag)}`);
  };

  const handleBack = () => {
    setLocation("/");
  };

  const estimateReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  };

  const latestPosts = allPosts?.filter(p => p.id !== post?.id).slice(0, 5) || [];

  if (isLoading) {
    return (
      <PublicLayout site={site}>
        <div className="min-h-screen bg-background">
          <div className="animate-pulse">
            <div className="h-14 bg-card border-b" />
            <div className="h-[50vh] bg-muted" />
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-muted rounded-full" />
                <div className="h-6 w-20 bg-muted rounded-full" />
              </div>
              <div className="h-12 bg-muted rounded w-3/4" />
              <div className="h-6 bg-muted rounded w-1/4" />
              <div className="space-y-4 mt-8">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-5/6" />
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!post) {
    return (
      <PublicLayout site={site}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center px-6">
            <h2 className="text-2xl font-semibold mb-2" data-testid="text-not-found-title">Post not found</h2>
            <p className="text-muted-foreground mb-4" data-testid="text-not-found-message">The post you're looking for doesn't exist</p>
            <Button onClick={handleBack} data-testid="button-go-home">Go back home</Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const readingTime = estimateReadingTime(post.content);

  return (
    <PublicLayout site={site} post={post}>
      <div className="min-h-screen bg-background text-foreground">
        <PublicHeader
          site={site}
          topTags={topTags || []}
          onTagClick={handleTagClick}
          onLogoClick={handleBack}
          templateClasses={templateClasses}
        />

        {post.imageUrl && (
          <motion.div 
            initial={prefersReducedMotion ? false : { opacity: 0 }}
            animate={prefersReducedMotion ? false : { opacity: 1 }}
            transition={prefersReducedMotion ? {} : { duration: 0.5 }}
            className="relative w-full h-[35vh] sm:h-[45vh] md:h-[55vh] overflow-hidden"
          >
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
              data-testid="img-post-hero"
            />
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
              <div className={`${post.imageUrl ? 'bg-card rounded-2xl p-6 sm:p-10 shadow-xl border' : 'pb-8'}`}>
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
                  className="text-2xl sm:text-3xl md:text-4xl font-bold mb-5 leading-tight tracking-tight"
                  style={{ fontFamily: "var(--public-heading-font)" }}
                  data-testid="text-post-title"
                >
                  {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-6 border-b">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={post.createdAt.toString()} data-testid="text-post-date">
                      {new Date(post.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span data-testid="text-reading-time">{readingTime} min read</span>
                  </div>
                </div>

                <div 
                  className="prose prose-lg dark:prose-invert max-w-none mt-8
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
                    prose-li:text-foreground/90"
                  style={{ fontFamily: "var(--public-body-font)" }}
                  data-testid="text-post-content"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {post.content}
                  </ReactMarkdown>
                </div>

                <div className="mt-10 pt-6 border-t">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground mr-2">Tags:</span>
                    {post.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover-elevate"
                        onClick={() => handleTagClick(tag)}
                        data-testid={`footer-tag-${tag}`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </motion.article>

            {latestPosts.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="mt-12 bg-card rounded-xl p-6 border"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <h3 
                      className="font-semibold"
                      style={{ fontFamily: "var(--public-heading-font)" }}
                      data-testid="text-latest-title"
                    >
                      More from {site.title}
                    </h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-sm"
                    onClick={() => setLocation("/")}
                    data-testid="button-view-all-posts"
                  >
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {latestPosts.slice(0, 3).map((latestPost, index) => (
                    <motion.div 
                      key={latestPost.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className="group cursor-pointer p-4 rounded-lg hover:bg-muted/50 transition-colors"
                      onClick={() => setLocation(`/post/${latestPost.slug}`)}
                      data-testid={`latest-post-${latestPost.id}`}
                    >
                      {latestPost.imageUrl && (
                        <div className="aspect-video rounded-lg overflow-hidden mb-3">
                          <img 
                            src={latestPost.imageUrl} 
                            alt={latestPost.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <h4 
                        className="font-medium text-sm line-clamp-2 group-hover:opacity-70 transition-opacity"
                        style={{ fontFamily: "var(--public-heading-font)" }}
                      >
                        {latestPost.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(latestPost.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {relatedPosts && relatedPosts.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="max-w-6xl mx-auto px-4 sm:px-6 mt-16 pb-8"
            >
              <div className="border-t pt-12">
                <h2 
                  className="text-xl font-semibold mb-8"
                  style={{ fontFamily: "var(--public-heading-font)" }}
                  data-testid="text-related-title"
                >
                  Related Articles
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedPosts.slice(0, 6).map((relatedPost, index) => (
                    <motion.div
                      key={relatedPost.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                    >
                      <Card
                        className="cursor-pointer hover-elevate overflow-hidden group h-full"
                        onClick={() => setLocation(`/post/${relatedPost.slug}`)}
                        data-testid={`card-related-${relatedPost.id}`}
                      >
                        <div className="aspect-video overflow-hidden">
                          {relatedPost.imageUrl ? (
                            <img 
                              src={relatedPost.imageUrl} 
                              alt={relatedPost.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              data-testid={`img-related-${relatedPost.id}`}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <span className="text-muted-foreground text-sm">No image</span>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          {relatedPost.tags[0] && (
                            <Badge variant="secondary" className="text-xs mb-2" data-testid={`badge-related-tag-${relatedPost.id}`}>
                              {relatedPost.tags[0]}
                            </Badge>
                          )}
                          <h3 
                            className="font-semibold line-clamp-2 group-hover:opacity-70 transition-opacity"
                            style={{ fontFamily: "var(--public-heading-font)" }}
                            data-testid={`text-related-title-${relatedPost.id}`}
                          >
                            {relatedPost.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {stripMarkdown(relatedPost.content).slice(0, 100)}...
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </main>

        <footer className="border-t py-8 bg-card mt-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-sm text-muted-foreground">
            <p data-testid="text-footer-copyright">&copy; {new Date().getFullYear()} {site.title}. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </PublicLayout>
  );
}
