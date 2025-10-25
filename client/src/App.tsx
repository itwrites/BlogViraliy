import { Switch, Route } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import SiteConfig from "@/pages/site-config";
import SiteNotFound from "@/pages/site-not-found";
import { PublicBlog } from "@/pages/public-blog";
import { PublicNews } from "@/pages/public-news";
import { PublicMagazine } from "@/pages/public-magazine";
import { PublicPortfolio } from "@/pages/public-portfolio";
import { PublicRestaurant } from "@/pages/public-restaurant";
import { PublicCrypto } from "@/pages/public-crypto";
import { PublicPost } from "@/pages/public-post";
import { PublicTagArchive } from "@/pages/public-tag-archive";
import type { Site } from "@shared/schema";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/sites/:id" component={SiteConfig} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PublicRouter({ site }: { site: Site }) {
  const layoutComponents = {
    blog: PublicBlog,
    news: PublicNews,
    magazine: PublicMagazine,
    portfolio: PublicPortfolio,
    restaurant: PublicRestaurant,
    crypto: PublicCrypto,
  };

  const LayoutComponent = layoutComponents[site.siteType as keyof typeof layoutComponents] || PublicBlog;

  return (
    <Switch>
      <Route path="/">
        <LayoutComponent site={site} />
      </Route>
      <Route path="/post/:slug">
        <PublicPost site={site} />
      </Route>
      <Route path="/tag/:tag">
        <PublicTagArchive site={site} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function RouterSwitch() {
  const { data: siteData, isLoading } = useQuery<{ isAdmin: boolean; site?: Site }>({
    queryKey: ["/api/domain-check"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!siteData) {
    return <SiteNotFound />;
  }

  if (siteData.isAdmin) {
    return <AdminRouter />;
  }

  if (!siteData.site) {
    return <SiteNotFound />;
  }

  return <PublicRouter site={siteData.site} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <RouterSwitch />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
