import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Layers, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

interface StrategyArticle {
  title: string;
  status: string | null;
  createdAt: string | null;
  source: string;
}

interface StrategyPillar {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  isAutomation: boolean;
  targetArticleCount: number | null;
  generatedCount: number;
  articleCount: number;
  recentCount: number;
  articles: StrategyArticle[];
}

interface StrategyResponse {
  siteId: string;
  generatedAt: string;
  totals: {
    pillars: number;
    articles: number;
    recent: number;
  };
  pillars: StrategyPillar[];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export function StrategyView({ siteId }: { siteId: string }) {
  const { data, isLoading } = useQuery<StrategyResponse>({
    queryKey: ["/api/sites", siteId, "strategy-view"],
    enabled: Boolean(siteId),
  });
  const [, setLocation] = useLocation();

  const [activePillarId, setActivePillarId] = useState<string | null>(null);
  const displayPillars = useMemo(
    () => (data?.pillars || []).filter((pillar) => pillar.articleCount > 0),
    [data]
  );
  const activePillar = useMemo(
    () => displayPillars.find((pillar) => pillar.id === activePillarId) ?? null,
    [displayPillars, activePillarId]
  );

  const goToArticles = (pillarId: string, pillarName: string) => {
    const params = new URLSearchParams({
      tab: "posts",
      pillarId,
      topic: pillarName,
    });
    setLocation(`/admin/sites/${siteId}?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="px-8 py-10">
        <div className="space-y-6 w-full">
          <div className="space-y-3">
            <div className="h-6 w-40 rounded-md bg-white border border-border/70 animate-pulse" />
            <div className="h-4 w-72 rounded-md bg-white border border-border/70 animate-pulse" />
          </div>

          <div className="space-y-5 2xl:grid 2xl:grid-cols-2 2xl:gap-6 2xl:space-y-0 2xl:items-start">
            {[0, 1, 2].map((index) => (
              <div
                key={`pillar-skeleton-${index}`}
                className="h-40 rounded-3xl border border-border/70 bg-white animate-pulse card-elevate"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 w-full"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[22px] font-semibold text-foreground">Content Map</h2>
            <p className="text-sm text-muted-foreground/80 mt-1">
              A simple view of how your topics are organized.
            </p>
          </div>
          <Badge variant="secondary" className="h-7 px-3 text-xs">Auto-growing</Badge>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-5 2xl:grid 2xl:grid-cols-2 2xl:gap-6 2xl:space-y-0 2xl:items-start"
        >
          {displayPillars.length === 0 && (
            <Card className="rounded-3xl border border-border/70 bg-white/80 shadow-sm card-elevate xl:col-span-2">
              <CardContent className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto mb-4">
                  <Layers className="w-6 h-6 text-muted-foreground/70" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No topics yet. Once your first posts are created, they will appear here.
                </p>
              </CardContent>
            </Card>
          )}

          {displayPillars.map((pillar) => {
            return (
              <motion.div key={pillar.id} variants={item}>
                <Card className="rounded-3xl border border-border/70 bg-white/85 shadow-sm card-elevate">
                  <CardContent className="p-6 flex flex-col min-h-[140px]">
                    <button
                      onClick={() => setActivePillarId(pillar.id)}
                      type="button"
                      className="w-full flex items-start justify-between gap-4 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground">{pillar.name}</h3>
                        {pillar.description && (
                          <p className="text-sm text-muted-foreground/80 mt-1 line-clamp-3 leading-snug min-h-[3.6rem]">
                            {pillar.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground/70">
                        <span className="text-xs">{pillar.articleCount} articles</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                    <div className="mt-4 text-xs text-muted-foreground/60">
                      Tap to see recent articles
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      <Dialog open={Boolean(activePillar)} onOpenChange={(open) => !open && setActivePillarId(null)}>
        <DialogContent className="max-w-xl bg-white/95 backdrop-blur-xl border border-border text-foreground max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg text-foreground">
              {activePillar?.name ?? "Topic"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              {activePillar?.description || "Recent articles in this topic."}
            </DialogDescription>
          </DialogHeader>

          {activePillar && (
            <div className="space-y-4 overflow-auto">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground/70 mb-2">
                  Recent articles
                </div>
                <div className="relative rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <div className="space-y-2">
                    {activePillar.articles.slice(0, 5).map((article) => (
                      <div
                        key={`${activePillar.id}-${article.title}`}
                        className="text-sm text-muted-foreground/80 truncate"
                        title={article.title}
                      >
                        {article.title}
                      </div>
                    ))}
                  </div>
                  {activePillar.articles.length > 5 && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-muted/70 via-muted/40 to-transparent" />
                  )}
                </div>
              </div>
              {activePillar.articles.length > 5 && (
                <span className="text-xs text-muted-foreground/60">
                  More articles are available.
                </span>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
