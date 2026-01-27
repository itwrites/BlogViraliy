import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteEmblem } from "@/components/site-emblem";
import { 
  Plus, 
  Globe, 
  LogOut, 
  LayoutGrid, 
  ChevronRight, 
  CreditCard,
  FileText,
  Zap,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { PaywallModal } from "@/components/paywall-modal";
import type { Site } from "@shared/schema";
import { PLAN_LIMITS } from "@shared/schema";
import { useEffect, useState } from "react";

interface SubscriptionResponse {
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: number;
    plan: {
      id: string;
      nickname: string | null;
    };
  } | null;
  plan: string | null;
  status: string;
  postsUsed: number;
  postsLimit: number;
  sitesUsed: number;
  sitesLimit: number;
}

const sidebarVariants = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 120, damping: 20, duration: 0.5 }
  },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 18,
      duration: 0.4
    }
  }
};

const cardHover = {
  scale: 1.015,
  transition: { type: "spring", stiffness: 200, damping: 20 }
};

export default function OwnerDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, logout, isLoading: authLoading } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<SubscriptionResponse>({
    queryKey: ["/bv_api/subscription"],
    queryFn: async () => {
      const res = await fetch("/bv_api/subscription", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // Redirect unpaid owners to pricing page
  // No longer redirect to pricing - allow access to dashboard but with paywall on actions

  const { data: sites, isLoading: sitesLoading } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
    enabled: isAuthenticated,
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/bv_api/subscription/portal");
      return res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: () => {
      toast({ title: "Failed to open billing portal", variant: "destructive" });
    },
  });

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      toast({ title: "Failed to logout", variant: "destructive" });
    }
  };

  const handleManageBilling = () => {
    portalMutation.mutate();
  };

  const handleCreateSite = () => {
    // Check if owner has active subscription
    if (!hasActiveSubscription) {
      setShowPaywall(true);
      return;
    }

    const planKey = subscriptionData?.plan as keyof typeof PLAN_LIMITS | null;
    const maxSites = planKey ? PLAN_LIMITS[planKey]?.maxSites : 0;
    const sitesUsed = sites?.length || 0;

    if (maxSites !== -1 && sitesUsed >= maxSites) {
      toast({
        title: "Site limit reached",
        description: `Your ${planKey?.charAt(0).toUpperCase()}${planKey?.slice(1)} plan allows ${maxSites} site${maxSites === 1 ? '' : 's'}. Upgrade to add more.`,
        variant: "destructive",
      });
      return;
    }

    setLocation("/admin/sites/new");
  };

  const isLoading = subscriptionLoading || sitesLoading;

  // Show loading while checking auth or subscription status
  // This prevents flash of dashboard content before redirect
  if (authLoading || (user?.role === "owner" && subscriptionLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground/80">Loading...</p>
        </div>
      </div>
    );
  }

  // Owners can access the dashboard even without active subscription
  // They will see their sites but paywall will trigger on content creation actions
  const hasActiveSubscription = subscriptionData?.status === "active";

  const planKey = subscriptionData?.plan as keyof typeof PLAN_LIMITS | null;
  const planDetails = planKey ? PLAN_LIMITS[planKey] : null;
  const postsUsed = subscriptionData?.postsUsed || 0;
  const postsLimit = planDetails?.postsPerMonth || 0;
  const postsPercentage = postsLimit > 0 ? Math.min((postsUsed / postsLimit) * 100, 100) : 0;
  const sitesUsed = sites?.length || 0;
  const sitesLimit = planDetails?.maxSites || 0;
  const canCreateSite = sitesLimit === -1 || sitesUsed < sitesLimit;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-foreground">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-1/3 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-blue-400/5 via-purple-400/5 to-transparent rounded-full blur-3xl"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-purple-400/5 via-pink-400/5 to-transparent rounded-full blur-3xl"
          animate={{ rotate: [360, 0] }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10 flex">
        <motion.aside
          variants={sidebarVariants}
          initial="initial"
          animate="animate"
          className="fixed left-0 top-0 bottom-0 w-[280px] bg-sidebar backdrop-blur-xl border-r border-border z-50 flex flex-col"
        >
          <div className="p-5 pt-6">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted/70 to-muted/30 border border-border flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-[15px] font-bold tracking-tight text-foreground truncate" data-testid="text-app-title">
                  Blog Autopilot
                </h1>
                <p className="text-[11px] text-muted-foreground/70">Owner Dashboard</p>
              </div>
            </div>
          </div>

          <div className="flex-1 px-3 py-2 space-y-6 overflow-y-auto">
            <div className="space-y-1">
              <div className="px-3 mb-2">
                <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">My Account</span>
              </div>

              <button
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 bg-muted text-foreground shadow-sm"
                data-testid="nav-sites"
              >
                <Globe className="w-4 h-4 text-primary" />
                <span className="flex-1 text-left">My Sites</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-muted/60 text-muted-foreground/80 border border-border">
                  {sitesUsed}
                </span>
              </button>

              <button
                onClick={handleManageBilling}
                disabled={portalMutation.isPending}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 text-muted-foreground/80 hover:bg-muted/40 hover:text-foreground"
                data-testid="nav-billing"
              >
                <CreditCard className="w-4 h-4" />
                <span className="flex-1 text-left">Billing</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="px-3">
                <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Usage</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-border shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-muted-foreground/80">Articles This Month</span>
                  <span className="text-[13px] font-semibold text-foreground">
                    {postsUsed} / {postsLimit}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${postsPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
                  <span>{Math.round(postsPercentage)}% used</span>
                  <span>{postsLimit - postsUsed} remaining</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-center gap-3 px-2 py-1 mb-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-violet-500 flex items-center justify-center text-[13px] font-semibold text-white shadow-lg shadow-blue-500/20">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate text-foreground">{user?.username}</p>
                <p className="text-[11px] text-muted-foreground/70 truncate">
                  {planDetails?.name || 'No Plan'} Plan
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full h-9 justify-start gap-2.5 text-muted-foreground/80 hover:text-red-600 hover:bg-red-50 rounded-xl text-[13px]"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </motion.aside>

        <main className="flex-1 ml-[280px] min-h-screen p-8 lg:p-12 max-w-[1600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-10"
          >
            <div className="flex items-end justify-between gap-4 border-b border-border pb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="text-section-title">
                  Welcome back, {user?.username}
                </h1>
                <p className="text-[15px] text-muted-foreground/80 mt-2 max-w-2xl" data-testid="text-section-description">
                  Manage your sites and subscription from your dashboard.
                </p>
              </div>
            </div>
          </motion.div>

          {isLoading ? (
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-[140px] bg-white animate-pulse rounded-2xl border border-border" />
              ))}
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid gap-6 grid-cols-1 lg:grid-cols-3 mb-10"
            >
              <motion.div variants={item} className="col-span-1 lg:col-span-2">
                <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {planDetails?.name || 'No'} Plan
                        </h3>
                        <p className="text-[13px] text-muted-foreground/80">
                          {subscriptionData?.status === 'active' ? 'Active subscription' : 'No active subscription'}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700 font-medium border border-green-200 px-3 py-1 rounded-lg text-xs">
                      {subscriptionData?.status || 'none'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-muted/40 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-muted-foreground/70" />
                        <span className="text-[11px] font-medium text-muted-foreground/80 uppercase">Articles/mo</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">{postsLimit}</p>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="w-4 h-4 text-muted-foreground/70" />
                        <span className="text-[11px] font-medium text-muted-foreground/80 uppercase">Sites</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {sitesLimit === -1 ? 'Unlimited' : sitesLimit}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-muted-foreground/70" />
                        <span className="text-[11px] font-medium text-muted-foreground/80 uppercase">Price</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        ${planDetails ? (planDetails.price / 100).toFixed(0) : 0}/mo
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleManageBilling}
                    disabled={portalMutation.isPending}
                    variant="outline"
                    className="w-full h-11 rounded-xl font-medium"
                    data-testid="button-manage-billing"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {portalMutation.isPending ? 'Loading...' : 'Manage Billing'}
                  </Button>
                </div>
              </motion.div>

              <motion.div variants={item}>
                <div className="bg-white border border-border rounded-2xl p-6 shadow-sm h-full flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Site Summary</h3>
                    <p className="text-[13px] text-muted-foreground/80 mb-4">
                      {sitesUsed} of {sitesLimit === -1 ? 'unlimited' : sitesLimit} sites created
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-muted-foreground/80">Active Sites</span>
                      <span className="font-semibold text-foreground">{sitesUsed}</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-muted-foreground/80">Available Slots</span>
                      <span className="font-semibold text-foreground">
                        {sitesLimit === -1 ? 'Unlimited' : Math.max(0, sitesLimit - sitesUsed)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mb-6 flex items-end justify-between gap-4"
          >
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">My Sites</h2>
              <p className="text-[14px] text-muted-foreground/80 mt-1">
                Click on a site to manage content and settings
              </p>
            </div>
            <Button
              onClick={handleCreateSite}
              disabled={!canCreateSite}
              className="h-11 px-6 rounded-xl font-medium shadow-lg transition-all duration-300"
              data-testid="button-create-site"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Site
            </Button>
          </motion.div>

          {sitesLoading ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-[200px] bg-white animate-pulse rounded-2xl border border-border" />
              ))}
            </div>
          ) : sites && sites.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            >
              {sites.map((site) => (
                <motion.div
                  key={site.id}
                  variants={item}
                  whileHover={cardHover}
                  className="h-full"
                >
                  <div
                    data-testid={`card-site-${site.id}`}
                    className="group cursor-pointer bg-white border border-border rounded-2xl h-full flex flex-col overflow-hidden hover:shadow-md hover:border-muted transition-all duration-300"
                    onClick={() => setLocation(`/admin/sites/${site.id}`)}
                  >
                    <div className="p-6 flex-1">
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-16 h-16 flex items-center justify-center">
                          <SiteEmblem
                            title={site.title}
                            favicon={site.favicon}
                            className="h-16 w-16 rounded-2xl bg-muted/60"
                          />
                        </div>
                        <Badge className="bg-muted text-foreground font-medium border border-border px-3 py-1 rounded-lg text-xs">
                          {site.siteType}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-[19px] font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
                          {site.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[13px] text-muted-foreground/70 font-medium font-mono">
                          <Globe className="w-3 h-3" />
                          <span className="truncate">{site.domain || site.proxyVisitorHostname || 'No domain'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between mt-auto">
                      <span className="text-xs text-muted-foreground/70 font-medium">
                        Click to manage
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-muted-foreground/70 hover:bg-primary/10 hover:text-primary"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-32 text-center"
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-muted/70 to-muted/30 flex items-center justify-center mb-6 border border-border">
                <Globe className="w-10 h-10 text-muted-foreground/70" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground mb-3">No sites yet</h3>
              <p className="text-muted-foreground/80 text-[15px] max-w-md mb-8 leading-relaxed">
                Create your first site to start publishing AI-powered content.
              </p>
              <Button
                onClick={handleCreateSite}
                disabled={!canCreateSite}
                className="rounded-xl px-8 h-12 font-medium shadow-lg"
                data-testid="button-create-first-site"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create First Site
              </Button>
            </motion.div>
          )}
        </main>
      </div>

      {/* Paywall Modal */}
      <PaywallModal 
        open={showPaywall} 
        onOpenChange={setShowPaywall} 
        feature="Creating Sites"
      />
    </div>
  );
}
