import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Globe, FileText, LogOut, Settings, ChevronRight } from "lucide-react";
import type { Site } from "@shared/schema";

interface SiteWithPermission extends Site {
  permission: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function EditorDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const { data: sites, isLoading } = useQuery<SiteWithPermission[]>({
    queryKey: ["/api/editor/sites"],
  });

  const handleSiteClick = (siteId: string) => {
    setLocation(`/editor/sites/${siteId}/posts`);
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const getPermissionLabel = (permission: string) => {
    const labels: Record<string, { text: string; variant: "default" | "secondary" | "outline" }> = {
      view: { text: "View Only", variant: "outline" },
      posts_only: { text: "Posts", variant: "default" },
      edit: { text: "Editor", variant: "secondary" },
      manage: { text: "Manager", variant: "default" },
    };
    return labels[permission] || { text: permission, variant: "outline" };
  };

  return (
    <div className="min-h-screen bg-background">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl"
      >
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Control Panel</h1>
                <p className="text-xs text-muted-foreground">Manage your sites</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.username}
              </span>
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

      <main className="max-w-5xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-semibold tracking-tight mb-1">Your Sites</h2>
          <p className="text-muted-foreground">
            Select a site to manage its content
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : sites && sites.length > 0 ? (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {sites.map((site) => {
              const permissionInfo = getPermissionLabel(site.permission);
              return (
                <motion.div key={site.id} variants={item}>
                  <Card
                    className="cursor-pointer hover-elevate group transition-all duration-200 ios-shadow"
                    onClick={() => handleSiteClick(site.id)}
                    data-testid={`card-site-${site.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {site.logoUrl ? (
                            <img
                              src={site.logoUrl}
                              alt={site.title}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Globe className="w-5 h-5 text-primary" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-base" data-testid={`text-site-title-${site.id}`}>
                              {site.title}
                            </CardTitle>
                            <CardDescription className="text-xs" data-testid={`text-site-domain-${site.id}`}>
                              {site.domain}
                            </CardDescription>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge variant={permissionInfo.variant} className="text-xs" data-testid={`badge-permission-${site.id}`}>
                          {permissionInfo.text}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No sites assigned</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              You don't have access to any sites yet. Contact your administrator to get started.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
