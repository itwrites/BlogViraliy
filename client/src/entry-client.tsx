import { hydrateRoot, createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider, HydrationBoundary } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PublicApp } from "@/public-app";
import { getQueryFn } from "@/lib/queryClient";
import type { Site } from "@shared/schema";
import "./index.css";

declare global {
  interface Window {
    __SSR_DATA__?: {
      site: Site;
      dehydratedState: unknown;
      ssrPath?: string;
    };
  }
}

const ssrData = window.__SSR_DATA__;

if (ssrData) {
  // Create QueryClient with the same default queryFn as the main app
  // This ensures client-side navigation can fetch data for pages not prefetched by SSR
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: getQueryFn({ on401: "throw" }),
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: false,
      },
    },
  });

  hydrateRoot(
    document.getElementById("root")!,
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={ssrData.dehydratedState}>
        <TooltipProvider>
          <PublicApp site={ssrData.site} ssrPath={ssrData.ssrPath} />
        </TooltipProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
} else {
  import("./App").then(({ default: App }) => {
    createRoot(document.getElementById("root")!).render(<App />);
  });
}
