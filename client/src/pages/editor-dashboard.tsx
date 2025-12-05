import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      setLocation(`/editor/sites/${siteContext.id}/posts`);
    }
  }, [siteContext, setLocation]);

  const handleSiteClick = (siteId: string) => {
    setLocation(`/editor/sites/${siteId}/posts`);
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, { text: string; variant: "default" | "secondary" | "outline"; color: string }> = {
      view: { text: "View Only", variant: "outline", color: "text-muted-foreground" },
      posts_only: { text: "Posts", variant: "default", color: "text-primary" },
      edit: { text: "Editor", variant: "secondary", color: "text-blue-500" },
      manage: { text: "Manager", variant: "default", color: "text-emerald-500" },
    };
    return labels[permission] || { text: permission, variant: "outline", color: "text-muted-foreground" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <motion.header 
        variants={headerVariants}
        initial="hidden"
        animate="show"
        className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl"
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Control Panel</h1>
                <p className="text-sm text-muted-foreground">Manage your content</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.username}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
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
          <h2 className="text-3xl font-bold tracking-tight mb-2">Your Sites</h2>
          <p className="text-muted-foreground text-lg">
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
                className="h-48 bg-muted/50 animate-pulse rounded-2xl"
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
                  <Card
                    className="cursor-pointer hover-elevate group transition-all duration-300 overflow-hidden border-0 shadow-lg shadow-black/5 h-full"
                    onClick={() => handleSiteClick(site.id)}
                    data-testid={`card-site-${site.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-4">
                          {site.logoUrl ? (
                            <div className="relative">
                              <img
                                src={site.logoUrl}
                                alt={site.title}
                                className="w-14 h-14 rounded-xl object-cover ring-2 ring-primary/10"
                              />
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                                <span className="text-[10px] text-white font-bold">
                                  {site.siteType.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <Globe className="w-7 h-7 text-primary" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                                <span className="text-[10px] text-primary-foreground font-bold">
                                  {site.siteType.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg line-clamp-1" data-testid={`text-site-title-${site.id}`}>
                              {site.title}
                            </CardTitle>
                            <CardDescription className="text-sm flex items-center gap-1.5 mt-1" data-testid={`text-site-domain-${site.id}`}>
                              <ExternalLink className="w-3 h-3" />
                              <span className="truncate">{site.domain}</span>
                            </CardDescription>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant={permissionInfo.variant} 
                          className={`text-xs ${permissionInfo.color}`}
                          data-testid={`badge-permission-${site.id}`}
                        >
                          {permissionInfo.text}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize font-normal">
                          {site.siteType}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
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
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-12 h-12 text-primary/50" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">No sites assigned</h3>
            <p className="text-muted-foreground max-w-md mx-auto text-lg">
              You don't have access to any sites yet. Contact your administrator to get started.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
