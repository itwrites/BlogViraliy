import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Layers, Leaf } from "lucide-react";

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
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
};

export function StrategyView({ siteId }: { siteId: string }) {
  const { data, isLoading } = useQuery<StrategyResponse>({
    queryKey: ["/api/sites", siteId, "strategy-view"],
    enabled: Boolean(siteId),
  });

  const totals = data?.totals;

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-semibold text-foreground">Strategy View</h2>
            <p className="text-sm text-muted-foreground/80 mt-1">
              Your content is organized into clear pillars. Growth happens automatically behind the scenes.
            </p>
          </div>
          <Badge variant="secondary" className="h-7 px-3 text-xs">Read-only</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-elevate">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground/70">
                <Layers className="w-4 h-4" />
                Pillars
              </div>
              <div className="text-2xl font-semibold mt-2 text-foreground">{totals?.pillars ?? 0}</div>
            </CardContent>
          </Card>
          <Card className="card-elevate">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground/70">
                <Sparkles className="w-4 h-4" />
                Articles in pillars
              </div>
              <div className="text-2xl font-semibold mt-2 text-foreground">{totals?.articles ?? 0}</div>
            </CardContent>
          </Card>
          <Card className="card-elevate">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground/70">
                <Leaf className="w-4 h-4" />
                New (30 days)
              </div>
              <div className="text-2xl font-semibold mt-2 text-foreground">{totals?.recent ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
          {isLoading && (
            <Card className="card-elevate">
              <CardContent className="p-6 text-sm text-muted-foreground">Loading strategy…</CardContent>
            </Card>
          )}

          {!isLoading && data?.pillars?.length === 0 && (
            <Card className="card-elevate">
              <CardContent className="p-6 text-sm text-muted-foreground">
                No pillars yet. Once Autopilot or Topical Authority creates them, they will appear here.
              </CardContent>
            </Card>
          )}

          {!isLoading && data?.pillars?.map((pillar) => {
            const list = pillar.articles.slice(0, 8);
            const remaining = Math.max(0, pillar.articles.length - list.length);
            const target = pillar.targetArticleCount || 0;
            const progress = target > 0 ? Math.min((pillar.articleCount / target) * 100, 100) : 0;

            return (
              <motion.div key={pillar.id} variants={item}>
                <Card className="card-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground">{pillar.name}</h3>
                          {pillar.isAutomation && (
                            <Badge variant="outline" className="text-xs">Auto</Badge>
                          )}
                        </div>
                        {pillar.description && (
                          <p className="text-sm text-muted-foreground/80 mt-1">{pillar.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground/70">Articles</div>
                        <div className="text-xl font-semibold text-foreground">{pillar.articleCount}</div>
                        <div className="text-xs text-muted-foreground/70">+{pillar.recentCount} in 30 days</div>
                      </div>
                    </div>

                    {target > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground/70 mb-2">
                          <span>Coverage</span>
                          <span>{pillar.articleCount}/{target}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    <div className="mt-4">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground/70 mb-2">Articles in this pillar</div>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground/80">
                        {list.map((article) => (
                          <li key={`${pillar.id}-${article.title}`} className="truncate">• {article.title}</li>
                        ))}
                        {remaining > 0 && (
                          <li className="text-xs text-muted-foreground/60">…and {remaining} more</li>
                        )}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </div>
  );
}
