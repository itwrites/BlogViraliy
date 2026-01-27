import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useSiteContext, useBasePath } from "@/components/base-path-provider";
import { 
  Globe, 
  FileText, 
  LogOut, 
  ChevronRight, 
  Sparkles,
  LayoutDashboard,
  ExternalLink,
} from "lucide-react";
import type { Site } from "@shared/schema";

interface SiteWithPermission extends Site {
  permission: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 28 
    } 
  }
};

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  }
};

export default function EditorDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const siteContext = useSiteContext();
  const { basePath } = useBasePath();

  const { data: sites, isLoading } = useQuery<SiteWithPermission[]>({
    queryKey: ["/api/editor/sites"],
  });

  useEffect(() => {
    if (siteContext && siteContext.id) {
      setLocation(`/admin/sites/${siteContext.id}/posts`);
    }
  }, [siteContext, setLocation]);

  const handleSiteClick = (siteId: string) => {
    setLocation(`/admin/sites/${siteId}/posts`);
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      view: { text: "View Only", color: "bg-muted text-muted-foreground/80 border-border" },
      posts_only: { text: "Articles", color: "bg-primary/10 text-primary border-primary/20" },
      edit: { text: "Editor", color: "bg-violet-50 text-violet-700 border-violet-200" },
      manage: { text: "Manager", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    };
    return labels[permission] || { text: permission, color: "bg-muted text-muted-foreground/80 border-border" };
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
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

      <div className="relative z-10">
        <motion.header 
          variants={headerVariants}
          initial="hidden"
          animate="show"
          className="sticky top-0 z-50 border-b border-border bg-sidebar backdrop-blur-xl"
        >
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-muted/60 border border-border flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">Control Panel</h1>
                  <p className="text-sm text-muted-foreground/80">Manage your content</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-border shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium text-foreground">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{user?.username}</p>
                    <p className="text-xs text-muted-foreground/80 capitalize">{user?.role}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2 text-muted-foreground/80 hover:text-foreground hover:bg-muted"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="max-w-6xl mx-auto px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 30 }}
            className="mb-10"
          >
            <h2 className="text-3xl font-bold tracking-tight mb-2 text-foreground">Your Sites</h2>
            <p className="text-muted-foreground/80 text-lg">
              Select a site to manage its content and settings
            </p>
          </motion.div>

          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="h-48 bg-white animate-pulse rounded-2xl border border-border"
                />
              ))}
            </div>
          ) : sites && sites.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {sites.map((site) => {
                const permissionInfo = getPermissionLabel(site.permission);
                return (
                  <motion.div key={site.id} variants={item}>
                    <div
                      className="cursor-pointer group transition-all duration-300 overflow-hidden h-full rounded-2xl bg-white border border-border hover:border-muted hover:shadow-md"
                      onClick={() => handleSiteClick(site.id)}
                      data-testid={`card-site-${site.id}`}
                    >
                      <div className="p-5 pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-4">
                            {site.logoUrl ? (
                              <div className="relative">
                                <img
                                  src={site.logoUrl}
                                  alt={site.title}
                                  className="w-14 h-14 rounded-xl object-cover ring-2 ring-border"
                                />
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                                  <span className="text-[10px] text-white font-bold">
                                    {site.siteType.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="relative">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-muted/70 to-muted/30 border border-border flex items-center justify-center">
                                  <Globe className="w-7 h-7 text-muted-foreground/80" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gray-900 border-2 border-white flex items-center justify-center">
                                  <span className="text-[10px] text-white font-bold">
                                    {site.siteType.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold line-clamp-1 text-foreground" data-testid={`text-site-title-${site.id}`}>
                                {site.title}
                              </h3>
                              <p className="text-sm flex items-center gap-1.5 mt-1 text-muted-foreground/80" data-testid={`text-site-domain-${site.id}`}>
                                <ExternalLink className="w-3 h-3" />
                                <span className="truncate">{site.domain}</span>
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground/70 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
                        </div>
                      </div>
                      <div className="px-5 pb-5 pt-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge 
                            className={`text-xs border ${permissionInfo.color}`}
                            data-testid={`badge-permission-${site.id}`}
                          >
                            {permissionInfo.text}
                          </Badge>
                          <Badge className="text-xs capitalize font-normal bg-muted text-muted-foreground/80 border border-border">
                            {site.siteType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-muted/70 to-muted/30 border border-border flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-12 h-12 text-muted-foreground/70" />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-foreground">No sites assigned</h3>
              <p className="text-muted-foreground/80 max-w-md mx-auto text-lg">
                You don't have access to any sites yet. Contact your administrator to get started.
              </p>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
