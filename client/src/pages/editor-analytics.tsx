import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useSiteContext } from "@/components/base-path-provider";
import {
  ArrowLeft,
  Globe,
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

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/editor/sites", siteId, "posts"],
    enabled: !!siteId,
  });

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
      totalViews: posts.reduce((sum, p) => sum + (p.viewCount || 0), 0),
    };
  }, [posts]);

  const topPosts = useMemo(() => {
    if (!posts) return [];
    return [...posts]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 10);
  }, [posts]);

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
        posts: dayPosts.length,
      };
    });
    return last7Days;
  }, [posts]);

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
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              {site?.logoUrl ? (
                <img 
                  src={site.logoUrl} 
                  alt={site.title} 
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-primary/10" 
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold truncate" data-testid="text-site-title">
                  {site?.title || "Loading..."}
                </h1>
                <p className="text-xs text-muted-foreground truncate">{site?.domain}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
              Navigation
            </p>
            <div className="space-y-1">
              <button
                onClick={() => setLocation(`/editor/sites/${siteId}/posts`)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground"
                data-testid="nav-posts"
              >
                <FileText className="w-4 h-4" />
                <span className="flex-1 text-left">Posts</span>
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
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-xl p-3 text-center border border-blue-500/20">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Eye className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-500">{stats.totalViews.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-background/60 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Posts</p>
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

          <div className="p-4 border-t space-y-2">
            {!hasSiteContext && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => setLocation("/editor")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sites
              </Button>
            )}
            {site && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => window.open(`https://${site.domain}`, "_blank")}
                data-testid="button-view-site"
              >
                <ExternalLink className="w-4 h-4" />
                View Live Site
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </Button>
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
                    <Eye className="w-5 h-5 text-blue-500" />
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
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                          stroke="#3b82f6" 
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
                      <p className="text-muted-foreground">No posts yet</p>
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
                          onClick={() => setLocation(`/editor/sites/${siteId}/posts`)}
                          data-testid={`top-post-${post.id}`}
                        >
                          <span className="text-lg font-bold text-muted-foreground w-6">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate group-hover:text-primary transition-colors">
                              {post.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs">
                                {post.source}
                              </Badge>
                            </div>
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
                    <p className="text-muted-foreground text-center py-8">No posts yet</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Recent Posts
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
                          onClick={() => setLocation(`/editor/sites/${siteId}/posts`)}
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
                    <p className="text-muted-foreground text-center py-8">No posts yet</p>
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
