import { Switch, Route, Router, useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { BasePathProvider, normalizeBasePath } from "@/components/base-path-provider";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import SiteConfig from "@/pages/site-config";
import UserManagement from "@/pages/user-management";
import EditorDashboard from "@/pages/editor-dashboard";
import EditorPosts from "@/pages/editor-posts";
import SiteNotFound from "@/pages/site-not-found";
import { PublicBlogContent } from "@/pages/public-blog";
import { PublicNewsContent } from "@/pages/public-news";
import { PublicMagazineContent } from "@/pages/public-magazine";
import { PublicPortfolioContent } from "@/pages/public-portfolio";
import { PublicRestaurantContent } from "@/pages/public-restaurant";
import { PublicCryptoContent } from "@/pages/public-crypto";
import { PublicNovaPressContent } from "@/pages/public-novapress";
import { PublicPostContent } from "@/pages/public-post";
import { PublicTagArchiveContent } from "@/pages/public-tag-archive";
import { PublicShell } from "@/components/public-shell";
import type { Site } from "@shared/schema";
import { useMemo, memo } from "react";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/sites/:id" component={SiteConfig} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/editor" component={EditorDashboard} />
      <Route path="/editor/sites/:id/posts" component={EditorPosts} />
      <Route component={NotFound} />
    </Switch>
  );
}

const layoutComponents = {
  blog: PublicBlogContent,
  news: PublicNewsContent,
  magazine: PublicMagazineContent,
  novapress: PublicNovaPressContent,
  portfolio: PublicPortfolioContent,
  restaurant: PublicRestaurantContent,
  crypto: PublicCryptoContent,
};

const PublicRoutes = memo(function PublicRoutes({ site }: { site: Site }) {
  const LayoutComponent = layoutComponents[site.siteType as keyof typeof layoutComponents] || PublicBlogContent;
  
  return (
    <Switch>
      <Route path="/">
        <LayoutComponent site={site} />
      </Route>
      <Route path="/post/:slug">
        {(params) => <PublicPostContent site={site} slug={params.slug} />}
      </Route>
      <Route path="/tag/:tag">
        {(params) => <PublicTagArchiveContent site={site} tag={params.tag} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
});

function PublicShellWrapper({ site }: { site: Site }) {
  const [matchTag, paramsTag] = useRoute("/tag/:tag");
  const currentTag = matchTag ? paramsTag?.tag : null;

  return (
    <PublicShell site={site} currentTag={currentTag}>
      <PublicRoutes site={site} />
    </PublicShell>
  );
}

function PublicRouter({ site }: { site: Site }) {
  const basePath = normalizeBasePath(site.basePath);

  return (
    <BasePathProvider site={site}>
      <Router base={basePath}>
        <PublicShellWrapper site={site} />
      </Router>
    </BasePathProvider>
  );
}

function RouterSwitch() {
  const browserHostname = window.location.hostname;
  const { data: siteData, isLoading } = useQuery<{ isAdmin: boolean; site?: Site }>({
    queryKey: ["/api/domain-check", browserHostname],
    queryFn: () => fetch(`/bv_api/domain-check?hostname=${encodeURIComponent(browserHostname)}`).then(res => res.json()),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
        <AuthProvider>
          <Toaster />
          <RouterSwitch />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
