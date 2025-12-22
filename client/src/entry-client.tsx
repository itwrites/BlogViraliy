import { hydrateRoot, createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider, HydrationBoundary } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PublicApp } from "@/public-app";
import type { Site } from "@shared/schema";
import "./index.css";

declare global {
  interface Window {
    __SSR_DATA__?: {
      site: Site;
      dehydratedState: unknown;
    };
  }
}

const ssrData = window.__SSR_DATA__;

if (ssrData) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });

  hydrateRoot(
    document.getElementById("root")!,
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={ssrData.dehydratedState}>
        <TooltipProvider>
          <PublicApp site={ssrData.site} />
        </TooltipProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
} else {
  import("./App").then(({ default: App }) => {
    createRoot(document.getElementById("root")!).render(<App />);
  });
}
