import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import type { Site, Post } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, Share2, Bookmark, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PublicThemeProvider, useTemplateClasses } from "@/components/public-theme-provider";
import { SeoHead } from "@/components/seo-head";
import { stripMarkdown } from "@/lib/strip-markdown";
import { MobileNav } from "@/components/mobile-nav";

interface PublicPostProps {
  site: Site;
}

export function PublicPost({ site }: PublicPostProps) {
  const { slug } = useParams();
  const [, setLocation] = useLocation();
  const templateClasses = useTemplateClasses(site.templateSettings);

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
  const popularTags = post?.tags.slice(0, 3) || [];

  if (isLoading) {
    return (
      <PublicThemeProvider settings={site.templateSettings}>
        <div className="min-h-screen bg-background">
          <div className="animate-pulse">
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
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-4/5" />
              </div>
            </div>
          </div>
        </div>
      </PublicThemeProvider>
    );
  }

  if (!post) {
    return (
      <PublicThemeProvider settings={site.templateSettings}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center px-6">
            <h2 className="text-2xl font-semibold mb-2" data-testid="text-not-found-title">Post not found</h2>
            <p className="text-muted-foreground mb-4" data-testid="text-not-found-message">The post you're looking for doesn't exist</p>
            <Button onClick={handleBack} data-testid="button-go-home">Go back home</Button>
          </div>
        </div>
      </PublicThemeProvider>
    );
  }

  const readingTime = estimateReadingTime(post.content);

  return (
    <PublicThemeProvider settings={site.templateSettings}>
      <SeoHead site={site} post={post} />
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 sticky top-0 z-50">
          <div className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 py-3`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MobileNav 
                  tags={topTags || []} 
                  onTagClick={handleTagClick} 
                  siteTitle={site.title} 
                />
                <Button variant="ghost" size="icon" onClick={handleBack} className="hidden md:flex" data-testid="button-back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                {site.logoUrl && (
                  <img
                    src={site.logoUrl}
                    alt={`${site.title} logo`}
                    style={templateClasses.logoSize.style}
                    className="object-cover rounded cursor-pointer"
                    onClick={handleBack}
                    data-testid="img-site-logo"
                  />
                )}
                <span 
                  className="text-lg font-semibold hidden sm:inline cursor-pointer" 
                  style={{ fontFamily: "var(--public-heading-font)" }}
                  onClick={handleBack}
                  data-testid="text-site-title"
                >
                  {site.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="hidden sm:flex" data-testid="button-share">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="hidden sm:flex" data-testid="button-bookmark">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {post.imageUrl && (
          <div className="relative w-full h-[40vh] sm:h-[50vh] md:h-[60vh] overflow-hidden">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
              data-testid="img-post-hero"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          </div>
        )}

        <main className={`${post.imageUrl ? '-mt-24 relative z-10' : 'pt-8'}`}>
          <div className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6`}>
            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              <article className="lg:col-span-8" data-testid={`article-${post.id}`}>
                <div className={`${post.imageUrl ? 'bg-card rounded-t-2xl p-6 sm:p-8 shadow-lg' : 'pb-8'}`}>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover-elevate text-xs sm:text-sm"
                        onClick={() => handleTagClick(tag)}
                        data-testid={`tag-${tag}`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <h1 
                    className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight"
                    style={{ fontFamily: "var(--public-heading-font)" }}
                    data-testid="text-post-title"
                  >
                    {post.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
                </div>

                <div className={`${post.imageUrl ? 'bg-card px-6 sm:px-8 pb-8 rounded-b-2xl shadow-lg' : ''}`}>
                  <div 
                    className="prose prose-lg dark:prose-invert max-w-none
                      prose-headings:font-semibold prose-headings:tracking-tight
                      prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                      prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                      prose-p:text-base prose-p:leading-relaxed prose-p:text-foreground/90
                      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                      prose-strong:text-foreground prose-strong:font-semibold
                      prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-md
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
                </div>

                <div className="mt-8 pt-6 border-t">
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
              </article>

              <aside className="lg:col-span-4 mt-12 lg:mt-0 space-y-8">
                {latestPosts.length > 0 && (
                  <div className="bg-card rounded-xl p-5 border">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <h3 
                        className="font-semibold"
                        style={{ fontFamily: "var(--public-heading-font)" }}
                        data-testid="text-latest-title"
                      >
                        Latest Posts
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {latestPosts.map((latestPost, index) => (
                        <div 
                          key={latestPost.id}
                          className="group cursor-pointer"
                          onClick={() => setLocation(`/post/${latestPost.slug}`)}
                          data-testid={`latest-post-${latestPost.id}`}
                        >
                          <div className="flex gap-3">
                            <span className="text-2xl font-bold text-muted-foreground/30 w-6 flex-shrink-0">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                                {latestPost.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(latestPost.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button 
                      variant="ghost" 
                      className="w-full mt-4 text-sm"
                      onClick={() => setLocation("/")}
                      data-testid="button-view-all-posts"
                    >
                      View All Posts
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}

                {popularTags.length > 0 && (
                  <div className="bg-card rounded-xl p-5 border">
                    <h3 
                      className="font-semibold mb-4"
                      style={{ fontFamily: "var(--public-heading-font)" }}
                      data-testid="text-explore-tags-title"
                    >
                      Explore Topics
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer hover-elevate"
                          onClick={() => handleTagClick(tag)}
                          data-testid={`explore-tag-${tag}`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>

          {relatedPosts && relatedPosts.length > 0 && (
            <div className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 mt-16 pb-8`}>
              <div className="border-t pt-12">
                <h2 
                  className="text-2xl font-semibold mb-8"
                  style={{ fontFamily: "var(--public-heading-font)" }}
                  data-testid="text-related-title"
                >
                  Related Articles
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedPosts.slice(0, 6).map((relatedPost) => (
                    <Card
                      key={relatedPost.id}
                      className="cursor-pointer hover-elevate overflow-hidden group"
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
                          className="font-semibold line-clamp-2 group-hover:text-primary transition-colors"
                          style={{ fontFamily: "var(--public-heading-font)" }}
                          data-testid={`text-related-title-${relatedPost.id}`}
                        >
                          {relatedPost.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {stripMarkdown(relatedPost.content).slice(0, 100)}...
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(relatedPost.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="border-t py-8 bg-card mt-8">
          <div className={`${templateClasses.contentWidth} mx-auto px-4 sm:px-6 text-center text-sm text-muted-foreground`}>
            <p data-testid="text-footer-copyright">&copy; {new Date().getFullYear()} {site.title}. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </PublicThemeProvider>
  );
}
