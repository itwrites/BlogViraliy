import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteEmblem } from "@/components/site-emblem";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useSiteContext } from "@/components/base-path-provider";
import {
  ArrowLeft,
  Eye,
  TrendingUp,
  FileText,
  Bot,
  Rss,
  PenLine,
  BarChart3,
  ExternalLink,
  LogOut,
  ChevronRight,
  Settings,
  Globe,
} from "lucide-react";
import type { Site, Post } from "@shared/schema";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsData {
  totalViews: number;
  totalPosts: number;
  popularPosts: Array<{
    id: string;
    title: string;
    slug: string;
    viewCount: number;
  }>;
  deviceBreakdown?: Array<{ name: string; value: number }>;
  browserBreakdown?: Array<{ name: string; value: number }>;
  countryBreakdown?: Array<{ name: string; value: number }>;
  viewsOverTime?: Array<{ date: string; views: number }>;
}

const sidebarVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0, 
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } 
  },
};

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const isAiSource = (source: string) => 
  source === "ai" || source === "ai-bulk" || source === "topical-authority";

const COLORS = ['#10b981', '#8b5cf6', '#f97316', '#3b82f6'];

export default function EditorAnalytics() {
  const { id: siteId } = useParams();
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const siteContext = useSiteContext();

  const { data: site } = useQuery<Site>({
    queryKey: ["/api/editor/sites", siteId],
    enabled: !!siteId,
  });

  const { data: posts, isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["/api/editor/sites", siteId, "posts"],
    enabled: !!siteId,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/sites", siteId, "analytics"],
    enabled: !!siteId,
  });

  const isLoading = postsLoading || analyticsLoading;

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const stats = useMemo(() => {
    if (!posts) return { total: 0, manual: 0, ai: 0, rss: 0, totalViews: 0 };
    return {
      total: posts.length,
      manual: posts.filter(p => p.source === "manual").length,
      ai: posts.filter(p => isAiSource(p.source)).length,
      rss: posts.filter(p => p.source === "rss").length,
      totalViews: analytics?.totalViews ?? posts.reduce((sum, p) => sum + (p.viewCount || 0), 0),
    };
  }, [posts, analytics]);

  const topPosts = useMemo(() => {
    if (analytics?.popularPosts && analytics.popularPosts.length > 0) {
      return analytics.popularPosts;
    }
    if (!posts) return [];
    return [...posts]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        viewCount: p.viewCount || 0,
      }));
  }, [posts, analytics]);

  const recentPosts = useMemo(() => {
    if (!posts) return [];
    return [...posts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [posts]);

  const pieData = useMemo(() => {
    return [
      { name: 'Manual', value: stats.manual, color: '#10b981' },
      { name: 'AI Generated', value: stats.ai, color: '#8b5cf6' },
      { name: 'RSS Imports', value: stats.rss, color: '#f97316' },
    ].filter(d => d.value > 0);
  }, [stats]);

  const viewsOverTime = useMemo(() => {
    // Prefer API data if available
    if (analytics?.viewsOverTime && analytics.viewsOverTime.length > 0) {
      return analytics.viewsOverTime.map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        views: d.views,
      }));
    }
    // Fallback to client-side calculation from posts
    if (!posts) return [];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayPosts = posts.filter(p => {
        const postDate = new Date(p.createdAt);
        return postDate.toDateString() === date.toDateString();
      });
      const dayViews = dayPosts.reduce((sum, p) => sum + (p.viewCount || 0), 0);
      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        views: dayViews,
      };
    });
    return last7Days;
  }, [posts, analytics]);
  
  const deviceData = useMemo(() => {
    if (!analytics?.deviceBreakdown) return [];
    return analytics.deviceBreakdown.map((d, i) => ({
      ...d,
      color: ['#3b82f6', '#10b981', '#f97316', '#8b5cf6'][i % 4],
    }));
  }, [analytics]);
  
  const browserData = useMemo(() => {
    if (!analytics?.browserBreakdown) return [];
    return analytics.browserBreakdown.slice(0, 5).map((d, i) => ({
      ...d,
      color: ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444'][i % 5],
    }));
  }, [analytics]);
  
  const countryData = useMemo(() => {
    if (!analytics?.countryBreakdown) return [];
    return analytics.countryBreakdown.slice(0, 8).map((d, i) => ({
      ...d,
      color: ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#14b8a6', '#f59e0b', '#6366f1'][i % 8],
    }));
  }, [analytics]);

  const hasSiteContext = !!siteContext;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="flex">
        <motion.aside
          variants={sidebarVariants}
          initial="initial"
          animate="animate"
          className="fixed left-0 top-0 bottom-0 w-72 bg-card/50 backdrop-blur-xl border-r z-40 flex flex-col"
        >
          <div className="p-4 border-b">
            <div className="flex items-center gap-2.5">
              <img 
                src="/assets/blog-autopilot-mark.svg" 
                alt="Blog Autopilot" 
                className="w-8 h-8"
              />
              <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground" style={{ fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, "Segoe UI", Roboto, Helvetica, Arial' }}>
                Blog Autopilot
              </span>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
              Navigation
            </p>
            <div className="space-y-1">
              <button
                onClick={() => setLocation(`/admin/sites/${siteId}/posts`)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground"
                data-testid="nav-posts"
              >
                <FileText className="w-4 h-4" />
                <span className="flex-1 text-left">Articles</span>
                <Badge variant="secondary" className="text-xs">{stats.total}</Badge>
              </button>
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 bg-primary text-primary-foreground"
                data-testid="nav-analytics"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="flex-1 text-left">Analytics</span>
              </button>
            </div>

            <div className="pt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
                Overview
              </p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <div className="bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl p-3 text-center border border-primary/20">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Eye className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-primary">{stats.totalViews.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-background/60 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Articles</p>
                  </div>
                  <div className="bg-background/60 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-500">
                      {stats.total > 0 ? Math.round(stats.totalViews / stats.total) : 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Views</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="p-4 border-t space-y-3">
            {!hasSiteContext && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => setLocation("/admin")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sites
              </Button>
            )}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-background/60">
              <SiteEmblem title={site?.title} favicon={site?.favicon} />
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-semibold truncate text-foreground" data-testid="text-site-title">
                  {site?.title || "Loading..."}
                </h1>
                <p className="text-xs text-muted-foreground truncate">{site?.domain}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted"
                    data-testid="button-site-settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={() => setLocation(`/admin/sites/${siteId}/settings`)}
                    data-testid="menu-blog-settings"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Blog Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocation("/admin")}
                    data-testid="menu-plan-center"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Plan Center
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive"
                    data-testid="menu-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.aside>

        <main className="flex-1 ml-72 p-8">
          <motion.div
            variants={pageTransition}
            initial="initial"
            animate="animate"
            className="max-w-6xl mx-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold" data-testid="text-page-title">Analytics</h2>
                <p className="text-muted-foreground">Track your site performance and content metrics</p>
              </div>
              <div className="flex items-center gap-2">
                {user && (
                  <Badge variant="outline" className="gap-1">
                    {user.username}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4 mb-8">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    <span className="text-3xl font-bold">{stats.totalViews.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-3xl font-bold">{stats.total}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">AI Generated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-violet-500" />
                    <span className="text-3xl font-bold">{stats.ai}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">RSS Imports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Rss className="w-5 h-5 text-orange-500" />
                    <span className="text-3xl font-bold">{stats.rss}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2 mb-8">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Views Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={viewsOverTime}>
                        <defs>
                          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="views" 
                          stroke="hsl(var(--primary))" 
                          fillOpacity={1} 
                          fill="url(#colorViews)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Content Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] flex items-center justify-center">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-muted-foreground">No articles yet</p>
                    )}
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-sm text-muted-foreground">Manual ({stats.manual})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                      <span className="text-sm text-muted-foreground">AI ({stats.ai})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm text-muted-foreground">RSS ({stats.rss})</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {(deviceData.length > 0 || browserData.length > 0 || countryData.length > 0) && (
              <div className="grid gap-6 md:grid-cols-3 mb-8">
                {deviceData.length > 0 && (
                  <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Device Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={deviceData}
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={55}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {deviceData.map((entry, index) => (
                                <Cell key={`device-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }} 
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap justify-center gap-3 mt-2">
                        {deviceData.map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                            <span className="text-xs text-muted-foreground capitalize">{d.name} ({d.value})</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {browserData.length > 0 && (
                  <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Browsers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={browserData}
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={55}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {browserData.map((entry, index) => (
                                <Cell key={`browser-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }} 
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap justify-center gap-3 mt-2">
                        {browserData.map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                            <span className="text-xs text-muted-foreground">{d.name} ({d.value})</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {countryData.length > 0 && (
                  <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Top Countries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {countryData.slice(0, 5).map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-sm font-medium w-8">{d.name}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${Math.min(100, (d.value / (countryData[0]?.value || 1)) * 100)}%`,
                                  backgroundColor: d.color 
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Top Performing Posts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded-lg"></div>
                      ))}
                    </div>
                  ) : topPosts.length > 0 ? (
                    <div className="space-y-2">
                      {topPosts.map((post, index) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer group"
                          onClick={() => setLocation(`/admin/sites/${siteId}/posts`)}
                          data-testid={`top-post-${post.id}`}
                        >
                          <span className="text-lg font-bold text-muted-foreground w-6">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate group-hover:text-primary transition-colors">
                              {post.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              /{post.slug}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Eye className="w-4 h-4" />
                            <span className="font-medium">{(post.viewCount || 0).toLocaleString()}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No articles yet</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Recent Articles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded-lg"></div>
                      ))}
                    </div>
                  ) : recentPosts.length > 0 ? (
                    <div className="space-y-2">
                      {recentPosts.map((post, index) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer group"
                          onClick={() => setLocation(`/admin/sites/${siteId}/posts`)}
                          data-testid={`recent-post-${post.id}`}
                        >
                          {post.imageUrl ? (
                            <img 
                              src={post.imageUrl} 
                              alt="" 
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate group-hover:text-primary transition-colors">
                              {post.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No articles yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
