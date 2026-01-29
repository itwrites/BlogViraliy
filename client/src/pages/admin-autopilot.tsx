import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, Users, LogOut, BookOpen, Activity } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface AutopilotStatusRow {
  ownerId: string;
  ownerEmail: string | null;
  ownerPlan: string | null;
  subscriptionStatus: string | null;
  postsUsedThisMonth: number;
  remainingPlanQuota: number;
  postsResetDate: string | null;
  siteId: string;
  siteTitle: string;
  siteDomain: string | null;
  siteOnboarded: boolean;
  hasBusinessProfile: boolean;
  sitesCount: number;
  allocationForSite: number | null;
  targetForSite: number;
  createdAutopilotThisCycle: number;
  missingToTarget: number;
  cycleStart: string;
}

interface AutopilotStatusResponse {
  generatedAt: string;
  rows: AutopilotStatusRow[];
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

export default function AdminAutopilot() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isAdmin, isOwner, logout, isLoading: authLoading } = useAuth();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        setLocation("/");
      } else if (isOwner) {
        setLocation("/owner");
      } else if (!isAdmin) {
        setLocation("/admin");
      }
    }
  }, [authLoading, isAuthenticated, isOwner, isAdmin, setLocation]);

  const { data, isLoading, refetch } = useQuery<AutopilotStatusResponse>({
    queryKey: ["/api/admin/autopilot-status"],
    enabled: isAuthenticated && isAdmin,
    refetchInterval: 30000,
  });

  const filteredRows = useMemo(() => {
    const rows = data?.rows || [];
    if (!search.trim()) return rows;
    const query = search.toLowerCase();
    return rows.filter((row) => {
      return (
        row.siteTitle.toLowerCase().includes(query) ||
        (row.siteDomain || "").toLowerCase().includes(query) ||
        (row.ownerEmail || "").toLowerCase().includes(query) ||
        row.ownerId.toLowerCase().includes(query)
      );
    });
  }, [data, search]);

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (error) {
      toast({ title: "Failed to logout", variant: "destructive" });
    }
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
              <img 
                src="/assets/blog-autopilot-mark.svg" 
                alt="Blog Autopilot" 
                className="w-10 h-10"
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-foreground truncate" style={{ fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, "Segoe UI", Roboto, Helvetica, Arial' }} data-testid="text-app-title">
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
                onClick={() => setLocation("/admin")}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 text-muted-foreground/80 hover:bg-muted/40 hover:text-foreground"
                data-testid="nav-sites"
              >
                <Globe className="w-4 h-4" />
                <span className="flex-1 text-left">Websites</span>
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
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 bg-primary/10 text-primary shadow-sm"
                data-testid="nav-autopilot"
              >
                <Activity className="w-4 h-4 text-primary" />
                <span className="flex-1 text-left">Autopilot Health</span>
              </button>

              <button
                onClick={() => setLocation("/admin/wiki")}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 text-muted-foreground/80 hover:bg-muted/40 hover:text-foreground"
                data-testid="nav-wiki"
              >
                <BookOpen className="w-4 h-4" />
                <span className="flex-1 text-left">Documentation</span>
              </button>
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
                  {isAdmin ? "Administrator" : "Editor"}
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
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Autopilot Health</h2>
                <p className="text-sm text-muted-foreground/80 mt-1">
                  Per-site autopilot targets, progress, and missing counts for the current billing cycle.
                </p>
              </div>
              <Button onClick={() => refetch()} variant="outline" className="h-9">Refresh</Button>
            </div>

            <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
              <motion.div variants={item} className="flex items-center gap-3">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by site, domain, or owner email"
                  className="max-w-md"
                />
                <Badge variant="outline" className="text-xs">
                  {filteredRows.length} sites
                </Badge>
                {data?.generatedAt && (
                  <span className="text-xs text-muted-foreground/70">
                    Updated: {new Date(data.generatedAt).toLocaleString()}
                  </span>
                )}
              </motion.div>

              <motion.div variants={item} className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Site</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Missing</TableHead>
                      <TableHead>Eligible</TableHead>
                      <TableHead>Plan Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-sm text-muted-foreground">
                          Loading autopilot status...
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && filteredRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-sm text-muted-foreground">
                          No autopilot data found.
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && filteredRows.map((row) => {
                      const eligible = row.siteOnboarded && row.hasBusinessProfile;
                      const ownerLabel = row.ownerEmail || row.ownerId;
                      return (
                        <TableRow key={`${row.siteId}-${row.ownerId}`}>
                          <TableCell>
                            <div className="text-sm font-medium text-foreground">{row.siteTitle}</div>
                            <div className="text-xs text-muted-foreground/70">{row.siteDomain || row.siteId}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-foreground">{ownerLabel}</div>
                            <div className="text-xs text-muted-foreground/70">{row.ownerId}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {row.ownerPlan || "unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{row.targetForSite}</TableCell>
                          <TableCell className="text-sm">{row.createdAutopilotThisCycle}</TableCell>
                          <TableCell>
                            <Badge variant={row.missingToTarget > 0 ? "destructive" : "secondary"} className="text-xs">
                              {row.missingToTarget}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={eligible ? "secondary" : "outline"} className="text-xs">
                              {eligible ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{row.remainingPlanQuota}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </motion.div>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
