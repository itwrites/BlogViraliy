import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteEmblem } from "@/components/site-emblem";
import { Plus, Trash2, Globe, Users, LogOut, LayoutGrid, ChevronRight, BookOpen } from "lucide-react";
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

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isAdmin, isOwner, logout, isLoading: authLoading } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        setLocation("/");
      } else if (isOwner) {
        // Owners should use the owner dashboard, not admin dashboard
        setLocation("/owner");
      }
    }
  }, [authLoading, isAuthenticated, isOwner, setLocation]);

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground/80">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-foreground">
      {/* Animated gradient background */}
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
        {/* Sidebar */}
        <motion.aside
          variants={sidebarVariants}
          initial="initial"
          animate="animate"
          className="fixed left-0 top-0 bottom-0 w-[280px] bg-sidebar backdrop-blur-xl border-r border-border z-50 flex flex-col"
        >
          <div className="p-5 pt-6">
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-xl bg-muted/60 border border-border flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-[15px] font-bold tracking-tight text-foreground truncate" data-testid="text-app-title">
                  Blog Autopilot
                </h1>
                <p className="text-[11px] text-muted-foreground/70">Multi-tenant CMS</p>
              </div>
            </div>
          </div>

          <div className="flex-1 px-3 py-2 space-y-6 overflow-y-auto">
            <div className="space-y-1">
              <div className="px-3 mb-2">
                <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Platform</span>
              </div>

              <button
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 bg-primary/10 text-primary shadow-sm"
                data-testid="nav-sites"
              >
                <Globe className="w-4 h-4 text-primary" />
                <span className="flex-1 text-left">Websites</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-primary/15 text-primary border border-border">
                  {stats.total}
                </span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => setLocation("/admin/users")}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 text-muted-foreground/80 hover:bg-muted/40 hover:text-foreground"
                  data-testid="nav-users"
                >
                  <Users className="w-4 h-4" />
                  <span className="flex-1 text-left">Users</span>
                </button>
              )}

              <button
                onClick={() => setLocation("/admin/wiki")}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 text-muted-foreground/80 hover:bg-muted/40 hover:text-foreground"
                data-testid="nav-wiki"
              >
                <BookOpen className="w-4 h-4" />
                <span className="flex-1 text-left">Documentation</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="px-3">
                <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Overview</span>
              </div>

              <div className="grid grid-cols-2 gap-2 px-1">
                <div className="bg-white p-3 rounded-xl border border-border shadow-sm">
                  <div className="text-2xl font-semibold tracking-tight text-foreground">{stats.blog}</div>
                  <div className="text-[11px] font-medium text-muted-foreground/70 mt-0.5">Blogs</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-border shadow-sm">
                  <div className="text-2xl font-semibold tracking-tight text-foreground">{stats.news}</div>
                  <div className="text-[11px] font-medium text-muted-foreground/70 mt-0.5">News</div>
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
                  {isAdmin ? 'Administrator' : 'Editor'}
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

        {/* Main Content */}
        <main className="flex-1 ml-[280px] min-h-screen p-8 lg:p-12 max-w-[1600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-10 flex items-end justify-between gap-4 border-b border-border pb-6"
          >
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="text-section-title">Websites</h1>
              <p className="text-[15px] text-muted-foreground/80 mt-2 max-w-2xl" data-testid="text-section-description">
                {isAdmin
                  ? "Manage and configure your multi-tenant digital properties."
                  : "Access and manage your assigned websites."
                }
              </p>
            </div>
            <Button
              onClick={() => setLocation("/admin/sites/new")}
              className="h-11 px-6 rounded-xl font-medium shadow-lg transition-all duration-300"
              data-testid="button-add-site"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Site
            </Button>
          </motion.div>

          {isLoading ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
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
                    onClick={() => setLocation(`/admin/sites/${site.id}/posts`)}
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
                        Last updated recently
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground/70 hover:bg-red-50 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteDialog(site);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
              <h3 className="text-2xl font-bold tracking-tight text-foreground mb-3">No websites created</h3>
              <p className="text-muted-foreground/80 text-[15px] max-w-md mb-8 leading-relaxed">
                {isAdmin
                  ? "Start building your network by creating your first multi-tenant website."
                  : "You don't have access to any websites yet."
                }
              </p>
              <Button
                onClick={() => setLocation("/admin/sites/new")}
                className="rounded-xl px-8 h-12 font-medium shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create First Site
              </Button>
            </motion.div>
          )}
        </main>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent className="rounded-2xl max-w-md bg-white/95 backdrop-blur-xl border border-border text-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Delete Website?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground/80">
            This action cannot be undone. This will permanently delete <strong className="text-foreground">{siteToDelete?.title}</strong> and remove all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl bg-muted border-border text-foreground hover:bg-muted/70">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 text-white hover:bg-red-600 rounded-xl"
            >
              Delete Website
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
