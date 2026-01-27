import { Switch, Route, Router, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { BasePathProvider, normalizeBasePath } from "@/components/base-path-provider";
import NotFound from "@/pages/not-found";
import AdminLogin from "@/pages/admin-login";
import Signup from "@/pages/signup";
import Pricing from "@/pages/pricing";
import AdminDashboard from "@/pages/admin-dashboard";
import SiteConfig from "@/pages/site-config";
import UserManagement from "@/pages/user-management";
import AdminWiki from "@/pages/admin-wiki";
import OwnerWiki from "@/pages/owner-wiki";
import EditorDashboard from "@/pages/editor-dashboard";
import EditorPosts from "@/pages/editor-posts";
import EditorAnalytics from "@/pages/editor-analytics";
import SiteNotFound from "@/pages/site-not-found";
import OwnerDashboard from "@/pages/owner-dashboard";
import CheckoutSuccess from "@/pages/checkout-success";
import { PublicApp } from "@/public-app";
import type { Site } from "@shared/schema";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={AdminLogin} />
      <Route path="/signup" component={Signup} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/owner" component={OwnerDashboard} />
      <Route path="/owner/checkout-success" component={CheckoutSuccess} />
      <Route path="/owner/wiki" component={OwnerWiki} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/sites/:id" component={EditorPosts} />
      <Route path="/admin/sites/:id/settings" component={SiteConfig} />
      <Route path="/admin/sites/:id/posts" component={EditorPosts} />
      <Route path="/admin/sites/:id/analytics" component={EditorAnalytics} />
      <Route path="/admin/users" component={UserManagement} />
      <Route path="/admin/wiki" component={AdminWiki} />
      <Route component={NotFound} />
    </Switch>
  );
}


interface DomainCheckResponse {
  isAdmin: boolean;
  site?: Site;
  allowAdminAccess?: boolean;
  siteId?: string;
}

function SiteContextAdminRouter({ site }: { site: Site }) {
  const basePath = normalizeBasePath(site.basePath);
  
  return (
    <BasePathProvider site={site}>
      <Router base={basePath}>
        <Switch>
          <Route path="/signup" component={Signup} />
          <Route path="/admin" component={AdminLogin} />
          <Route path="/admin/dashboard">
            <EditorDashboard />
          </Route>
          <Route path="/admin/sites/:id" component={EditorPosts} />
          <Route path="/admin/sites/:id/settings" component={SiteConfig} />
          <Route path="/admin/sites/:id/posts" component={EditorPosts} />
          <Route path="/admin/sites/:id/analytics" component={EditorAnalytics} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    </BasePathProvider>
  );
}

function RouterSwitch() {
  const browserHostname = window.location.hostname;
  const browserPath = window.location.pathname;
  
  // Allow signup, pricing, owner and admin paths without domain check
  if (browserPath.startsWith('/signup') || browserPath.startsWith('/pricing') || browserPath.startsWith('/owner') || browserPath.startsWith('/admin') || browserPath === '/') {
    return <AdminRouter />;
  }
  
  const { data: siteData, isLoading } = useQuery<DomainCheckResponse>({
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

  // Check if we're trying to access admin routes
  // The path might include basePath (e.g., /blog/admin), so we need to check both
  const basePath = siteData.site ? normalizeBasePath(siteData.site.basePath) : "";
  const pathWithoutBase = basePath && browserPath.startsWith(basePath) 
    ? browserPath.slice(basePath.length) || "/"
    : browserPath;
  
  const isAdminPath = pathWithoutBase.startsWith('/admin');
  
  // If accessing from a pure admin domain (no site context)
  if (siteData.isAdmin) {
    return <AdminRouter />;
  }
  
  // If accessing admin routes from a site domain
  if (isAdminPath && siteData.allowAdminAccess && siteData.site) {
    // Show admin routes but with site context
    return <SiteContextAdminRouter site={siteData.site} />;
  }

  if (!siteData.site) {
    return <SiteNotFound />;
  }

  return <PublicApp site={siteData.site} />;
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
