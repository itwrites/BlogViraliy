import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Globe, Users, LogOut, Settings, ChevronRight, LayoutGrid, FileText, Bot, Rss, PenLine, TrendingUp, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Site } from "@shared/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect, useMemo } from "react";

const sidebarVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 }
  },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08,
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 25,
      duration: 0.3
    } 
  }
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isAdmin, logout, isLoading: authLoading } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const { data: sites, isLoading } = useQuery<Site[]>({
    queryKey: ["/api/sites"],
    enabled: isAuthenticated,
  });

  const stats = useMemo(() => {
    if (!sites) return { total: 0, blog: 0, news: 0, magazine: 0 };
    return {
      total: sites.length,
      blog: sites.filter(s => s.siteType === "blog").length,
      news: sites.filter(s => s.siteType === "news").length,
      magazine: sites.filter(s => s.siteType === "magazine").length,
    };
  }, [sites]);

  const handleDelete = async () => {
    if (!siteToDelete) return;

    try {
      await apiRequest("DELETE", `/api/sites/${siteToDelete.id}`, undefined);
      toast({ title: "Site deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      setDeleteDialogOpen(false);
      setSiteToDelete(null);
    } catch (error) {
      toast({ title: "Failed to delete site", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      toast({ title: "Failed to logout", variant: "destructive" });
    }
  };

  const openDeleteDialog = (site: Site) => {
    setSiteToDelete(site);
    setDeleteDialogOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="flex">
        <motion.aside
          variants={sidebarVariants}
          initial="initial"
          animate="animate"
          className="fixed left-0 top-0 bottom-0 w-72 bg-card/50 backdrop-blur-xl border-r z-40 flex flex-col"
        >
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold truncate" data-testid="text-app-title">
                  Blog Virality
                </h1>
                <p className="text-xs text-muted-foreground truncate">Admin Dashboard</p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
              Navigation
            </p>
            <div className="space-y-1 mb-4">
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 bg-primary text-primary-foreground"
                data-testid="nav-sites"
              >
                <Globe className="w-4 h-4" />
                <span className="flex-1 text-left">Websites</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-foreground/20 text-primary-foreground">
                  {stats.total}
                </span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => setLocation("/admin/users")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground"
                  data-testid="nav-users"
                >
                  <Users className="w-4 h-4" />
                  <span className="flex-1 text-left">Manage Users</span>
                </button>
              )}
            </div>

            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
              Quick Stats
            </p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl p-3 text-center border border-primary/20">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Sites</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-background/60 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-emerald-500">{stats.blog}</p>
                  <p className="text-[10px] text-muted-foreground">Blog</p>
                </div>
                <div className="bg-background/60 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-violet-500">{stats.news}</p>
                  <p className="text-[10px] text-muted-foreground">News</p>
                </div>
                <div className="bg-background/60 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-orange-500">{stats.magazine}</p>
                  <p className="text-[10px] text-muted-foreground">Magazine</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="p-4 border-t space-y-2">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.username}</p>
                {isAdmin && (
                  <Badge variant="secondary" className="text-[10px]">Admin</Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </motion.aside>

        <main className="flex-1 ml-72 min-h-screen p-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-8 flex items-center justify-between"
          >
            <div>
              <h2 className="text-2xl font-medium tracking-tight mb-1.5" data-testid="text-section-title">Your Websites</h2>
              <p className="text-muted-foreground/80" data-testid="text-section-description">
                {isAdmin 
                  ? "Manage all multi-tenant websites from one dashboard"
                  : "Manage the websites you have access to"
                }
              </p>
            </div>
            <Button
              onClick={() => setLocation("/admin/sites/new")}
              className="gap-2"
              data-testid="button-add-site"
            >
              <Plus className="h-4 w-4" />
              New Site
            </Button>
          </motion.div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-44 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : sites && sites.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {sites.map((site) => (
                <motion.div key={site.id} variants={item}>
                  <Card 
                    data-testid={`card-site-${site.id}`} 
                    className="hover-elevate group transition-all duration-300 cursor-pointer border-border/40 shadow-sm hover:shadow-md bg-card/80 backdrop-blur-sm rounded-xl"
                    onClick={() => setLocation(`/admin/sites/${site.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {site.logoUrl ? (
                            <img 
                              src={site.logoUrl} 
                              alt={`${site.title} logo`} 
                              className="h-12 w-12 rounded-xl object-cover flex-shrink-0"
                              data-testid={`img-site-logo-${site.id}`}
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Globe className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate" data-testid={`text-site-title-${site.id}`}>
                              {site.title}
                            </CardTitle>
                            <CardDescription className="font-mono text-xs truncate mt-0.5" data-testid={`text-site-domain-${site.id}`}>
                              {site.domain}
                            </CardDescription>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {site.siteType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/admin/sites/${site.id}`);
                            }}
                            data-testid={`button-edit-${site.id}`}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog(site);
                              }}
                              data-testid={`button-delete-${site.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                <Globe className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-state-title">No websites yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6" data-testid="text-empty-state-description">
                {isAdmin 
                  ? "Get started by creating your first multi-tenant website"
                  : "You don't have access to any websites yet. Contact an admin to get access."
                }
              </p>
              <Button onClick={() => setLocation("/admin/sites/new")} size="lg" data-testid="button-add-first-site">
                <Plus className="h-5 w-5 mr-2" />
                Add New Site
              </Button>
            </motion.div>
          )}
        </main>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-dialog-title">Delete Website</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-dialog-description">
              Are you sure you want to delete <strong data-testid="text-delete-site-name">{siteToDelete?.title}</strong>? This will permanently remove all posts and configuration. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
