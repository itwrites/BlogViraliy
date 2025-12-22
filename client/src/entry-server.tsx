import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider, dehydrate } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PublicApp } from "@/public-app";
import type { Site, Post } from "@shared/schema";

export interface SSRContext {
  site: Site;
  path: string;
  ssrPath?: string;
  posts?: Post[];
  post?: Post;
  relatedPosts?: Post[];
  tagPosts?: Post[];
  currentTag?: string;
}

export function render(ctx: SSRContext): { html: string; dehydratedState: unknown } {
  const { site, path, ssrPath, posts, post, relatedPosts, tagPosts, currentTag } = ctx;
  
  // Use ssrPath (full path with basePath) for wouter routing, fallback to path
  const routerPath = ssrPath || path;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    },
  });

  if (posts) {
    queryClient.setQueryData(["/api/public/sites", site.id, "posts"], posts);
  }

  if (post) {
    // Extract slug from the stripped path (without basePath)
    const postSlug = path.match(/^\/post\/(.+)$/)?.[1] || 
                     (site.postUrlFormat === "root" ? path.match(/^\/([^\/]+)$/)?.[1] : null);
    console.log(`[SSR entry-server] Post found, path="${path}", extracted slug="${postSlug}", post.slug="${post.slug}"`);
    if (postSlug) {
      queryClient.setQueryData(["/api/public/sites", site.id, "posts", postSlug], post);
      console.log(`[SSR entry-server] Set query data for slug "${postSlug}"`);
    } else {
      console.log(`[SSR entry-server] WARNING: Could not extract slug from path "${path}"`);
    }
    if (relatedPosts) {
      queryClient.setQueryData(["/api/public/sites", site.id, "related-posts", post.id], relatedPosts);
    }
  }

  if (tagPosts && currentTag) {
    queryClient.setQueryData(["/api/public/sites", site.id, "posts", "tag", currentTag], tagPosts);
  }

  const html = renderToString(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PublicApp site={site} ssrPath={routerPath} />
      </TooltipProvider>
    </QueryClientProvider>
  );

  const dehydratedState = dehydrate(queryClient);

  return { html, dehydratedState };
}
