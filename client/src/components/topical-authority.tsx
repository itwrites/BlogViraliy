import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { PaywallModal } from "@/components/paywall-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  Map, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Folder,
  Target,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  LayoutGrid,
  Languages,
  Sparkles
} from "lucide-react";
import type { Pillar, Cluster, PillarArticle } from "@shared/schema";
import { articleRoleDisplayNames, languageDisplayNames, type ContentLanguage } from "@shared/schema";
import { PACK_DEFINITIONS, type PackType, type CustomPackConfig } from "@shared/pack-definitions";
import { CustomPackCreator } from "./custom-pack-creator";
import { PillarLinkGraph } from "./pillar-link-graph";

interface PillarWithStats extends Pillar {
  stats: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
  };
  clusterCount: number;
}

interface ClusterWithArticles extends Cluster {
  articles: PillarArticle[];
}

interface PillarDetails extends Pillar {
  clusters: ClusterWithArticles[];
  pillarArticle?: PillarArticle;
  stats: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
  };
}

interface TopicalAuthorityProps {
  siteId: string;
  onPaywallRequired?: (feature: string) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  mapping: "bg-blue-500",
  mapped: "bg-purple-500",
  generating: "bg-yellow-500",
  completed: "bg-green-500",
  paused: "bg-orange-500",
  failed: "bg-red-500",
};

const articleStatusIcons: Record<string, JSX.Element> = {
  pending: <Clock className="h-3 w-3 text-muted-foreground" />,
  generating: <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />,
  completed: <CheckCircle className="h-3 w-3 text-green-500" />,
  failed: <XCircle className="h-3 w-3 text-red-500" />,
  skipped: <XCircle className="h-3 w-3 text-muted-foreground" />,
};

export function TopicalAuthority({ siteId, onPaywallRequired }: TopicalAuthorityProps) {
  const { toast } = useToast();
  const { canCreateContent, isOwner } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Array<{
    id: string;
    name: string;
    description: string;
    packType: string;
    suggestedArticleCount: number;
    used?: boolean;
  }>>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  const [newPillar, setNewPillar] = useState<{
    name: string;
    description: string;
    masterPrompt: string;
    targetArticleCount: number;
    publishSchedule: string;
    targetLanguage: string;
    defaultPostStatus: string;
    packType: PackType;
    customPackConfig: CustomPackConfig | null;
  }>({
    name: "",
    description: "",
    masterPrompt: "",
    targetArticleCount: 50,
    publishSchedule: "1_per_day",
    targetLanguage: "en",
    defaultPostStatus: "published",
    packType: "authority",
    customPackConfig: null,
  });

  const { data: pillars, isLoading: pillarsLoading } = useQuery<PillarWithStats[]>({
    queryKey: ["/api/sites", siteId, "pillars"],
    refetchInterval: 10000,
  });

  const { data: pillarDetails, isLoading: detailsLoading } = useQuery<PillarDetails>({
    queryKey: ["/api/pillars", selectedPillar],
    enabled: !!selectedPillar,
    refetchInterval: 5000,
  });

  const { data: storedSuggestions } = useQuery<{ suggestions: any[] }>({
    queryKey: ['/api/sites', siteId, 'topic-suggestions'],
    enabled: !!siteId,
  });

  useEffect(() => {
    if (storedSuggestions?.suggestions) {
      setSuggestions(storedSuggestions.suggestions);
    }
  }, [storedSuggestions]);

  const createPillarMutation = useMutation({
    mutationFn: async (data: typeof newPillar) => {
      const res = await apiRequest("POST", `/api/sites/${siteId}/pillars`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Authority topic launched", description: "Your authority topic is ready to grow." });
      setIsCreateOpen(false);
      setNewPillar({
        name: "",
        description: "",
        masterPrompt: "",
        targetArticleCount: 50,
        publishSchedule: "1_per_day",
        targetLanguage: "en",
        defaultPostStatus: "published",
        packType: "authority",
        customPackConfig: null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "pillars"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to launch authority topic", variant: "destructive" });
    },
  });

  const deletePillarMutation = useMutation({
    mutationFn: async (pillarId: string) => {
      const res = await apiRequest("DELETE", `/api/pillars/${pillarId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Authority topic deleted" });
      setSelectedPillar(null);
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "pillars"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const generateMapMutation = useMutation({
    mutationFn: async (pillarId: string) => {
      const res = await apiRequest("POST", `/api/pillars/${pillarId}/generate-map`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Authority map built", 
        description: `Created ${data.categories} content streams with ${data.totalArticles} total assets.` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "pillars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pillars", selectedPillar] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to build authority map", variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "pillars"] });
    },
  });

  const startGenerationMutation = useMutation({
    mutationFn: async (pillarId: string) => {
      const res = await apiRequest("POST", `/api/pillars/${pillarId}/start-generation`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Production started", description: "Asset production is now running." });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "pillars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pillars", selectedPillar] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const pauseGenerationMutation = useMutation({
    mutationFn: async (pillarId: string) => {
      const res = await apiRequest("POST", `/api/pillars/${pillarId}/pause-generation`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Production paused" });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "pillars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pillars", selectedPillar] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleCluster = (clusterId: string) => {
    setExpandedClusters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clusterId)) {
        newSet.delete(clusterId);
      } else {
        newSet.add(clusterId);
      }
      return newSet;
    });
  };

  const getProgressPercentage = (stats: { total: number; completed: number }) => {
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  };

  const fetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const response = await apiRequest("POST", `/api/sites/${siteId}/topic-suggestions`);
      const data = await response.json();
      setSuggestions(data.suggestions || []);
      queryClient.invalidateQueries({ queryKey: ['/api/sites', siteId, 'topic-suggestions'] });
      toast({ title: "Opportunities discovered", description: `${data.suggestions?.length || 0} authority ideas ready` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const useSuggestion = async (suggestion: typeof suggestions[0]) => {
    // Mark as used in backend
    try {
      await apiRequest("PATCH", `/api/topic-suggestions/${suggestion.id}/used`);
      queryClient.invalidateQueries({ queryKey: ['/api/sites', siteId, 'topic-suggestions'] });
    } catch (e) {
      console.warn("Failed to mark suggestion as used:", e);
    }
    
    // Pre-fill and open modal
    setNewPillar({
      ...newPillar,
      name: suggestion.name,
      description: suggestion.description,
      packType: suggestion.packType as PackType,
      targetArticleCount: suggestion.suggestedArticleCount,
    });
    setSuggestions(prev => prev.map(s => 
      s.id === suggestion.id ? { ...s, used: true } : s
    ));
    setIsCreateOpen(true);
  };

  const hasPillars = (pillars?.length || 0) > 0;
  const totalAssets = pillars?.reduce((sum, pillar) => sum + (pillar.stats?.total || 0), 0) || 0;
  const totalCompleted = pillars?.reduce((sum, pillar) => sum + (pillar.stats?.completed || 0), 0) || 0;
  const totalPending = pillars?.reduce((sum, pillar) => sum + (pillar.stats?.pending || 0), 0) || 0;
  const totalFailed = pillars?.reduce((sum, pillar) => sum + (pillar.stats?.failed || 0), 0) || 0;
  const automationTopics = pillars?.filter((pillar) => ["mapping", "mapped", "generating", "paused"].includes(pillar.status)).length || 0;
  const activeAutomation = pillars?.some((pillar) => pillar.status === "generating" || pillar.status === "mapping") || false;
  const hasIssues = pillars?.some((pillar) => pillar.status === "failed") || false;
  const formatCount = (value: number) => value.toLocaleString();

  const systemStatusItems = [
    hasPillars ? {
      label: activeAutomation ? "Automation running" : "Automation idle",
      value: activeAutomation ? "Active" : "Standby",
      tone: activeAutomation ? "text-emerald-600" : "text-muted-foreground",
      dot: activeAutomation ? "bg-emerald-500" : "bg-muted-foreground",
    } : null,
    totalPending > 0 ? {
      label: "Assets in queue",
      value: formatCount(totalPending),
      tone: "text-muted-foreground",
      dot: "bg-blue-500",
    } : null,
    totalFailed > 0 || hasIssues ? {
      label: "Attention needed",
      value: totalFailed > 0 ? `${formatCount(totalFailed)} failed` : "Review",
      tone: "text-amber-600",
      dot: "bg-amber-500",
    } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; tone: string; dot: string }>;

  if (pillarsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Authority Workspace</h2>
          <p className="text-sm text-muted-foreground">Autonomous authority growth system</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-pillar">
              <Plus className="h-4 w-4 mr-2" />
              New Authority Topic
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Authority Topic</DialogTitle>
              <DialogDescription>
                Define the main market you want to dominate. We will automatically build a complete content ecosystem and growth engine around it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pillar-name">Authority Topic Name</Label>
                <Input
                  id="pillar-name"
                  placeholder="e.g., AI Meditation, Luxury Real Estate, Remote Hiring"
                  value={newPillar.name}
                  onChange={(e) => setNewPillar({ ...newPillar, name: e.target.value })}
                  data-testid="input-pillar-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pillar-description">Business Focus (optional)</Label>
                <Textarea
                  id="pillar-description"
                  placeholder="Describe what this authority topic represents for your business."
                  value={newPillar.description}
                  onChange={(e) => setNewPillar({ ...newPillar, description: e.target.value })}
                  data-testid="input-pillar-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pillar-prompt">AI Instructions (optional)</Label>
                <Textarea
                  id="pillar-prompt"
                  placeholder="Custom guidance for how the AI should generate content and messaging."
                  value={newPillar.masterPrompt}
                  onChange={(e) => setNewPillar({ ...newPillar, masterPrompt: e.target.value })}
                  rows={3}
                  data-testid="input-pillar-prompt"
                />
              </div>
              <div className="space-y-2">
                <Label>Growth Volume: {newPillar.targetArticleCount} assets</Label>
                <Slider
                  value={[newPillar.targetArticleCount]}
                  onValueChange={(value) => setNewPillar({ ...newPillar, targetArticleCount: value[0] })}
                  min={10}
                  max={200}
                  step={10}
                  data-testid="slider-article-count"
                />
                <p className="text-xs text-muted-foreground">
                  Controls how aggressively this authority topic expands its market presence.
                </p>
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wide">
                  <span>Light</span>
                  <span>Standard</span>
                  <span>Aggressive</span>
                  <span>Dominant</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Growth Strategy</Label>
                <Select
                  value={newPillar.packType}
                  onValueChange={(value) => setNewPillar({ ...newPillar, packType: value as PackType })}
                >
                  <SelectTrigger data-testid="select-pack-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PACK_DEFINITIONS).map(([key, pack]) => (
                      <SelectItem key={key} value={key}>
                        {pack.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose how this authority topic should grow and convert traffic.
                </p>
                {newPillar.packType && newPillar.packType !== "custom" && PACK_DEFINITIONS[newPillar.packType] && (
                  <p className="text-xs text-muted-foreground">
                    {PACK_DEFINITIONS[newPillar.packType].description}
                  </p>
                )}
                {newPillar.packType === "custom" && (
                  <CustomPackCreator
                    value={newPillar.customPackConfig}
                    onChange={(config) => setNewPillar({ ...newPillar, customPackConfig: config })}
                  />
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Automation Pace</Label>
                  <Select
                    value={newPillar.publishSchedule}
                    onValueChange={(value) => setNewPillar({ ...newPillar, publishSchedule: value })}
                  >
                    <SelectTrigger data-testid="select-publish-schedule">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_per_hour">1 per hour</SelectItem>
                      <SelectItem value="2_per_day">2 per day</SelectItem>
                      <SelectItem value="1_per_day">1 per day</SelectItem>
                      <SelectItem value="3_per_week">3 per week</SelectItem>
                      <SelectItem value="1_per_week">1 per week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    <span className="flex items-center gap-2">
                      <Languages className="h-4 w-4" />
                      Content Language
                    </span>
                  </Label>
                  <Select
                    value={newPillar.targetLanguage}
                    onValueChange={(value) => setNewPillar({ ...newPillar, targetLanguage: value })}
                  >
                    <SelectTrigger data-testid="select-pillar-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(languageDisplayNames).map(([code, name]) => (
                        <SelectItem key={code} value={code}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Initial Publishing State</Label>
                  <Select
                    value={newPillar.defaultPostStatus}
                    onValueChange={(value) => setNewPillar({ ...newPillar, defaultPostStatus: value })}
                  >
                    <SelectTrigger data-testid="select-pillar-post-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Choose whether new assets start published or draft.</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Discard
              </Button>
              <Button
                onClick={() => createPillarMutation.mutate(newPillar)}
                disabled={!newPillar.name.trim() || createPillarMutation.isPending}
                data-testid="button-submit-pillar"
              >
                {createPillarMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Launch Authority
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Authority Topics</p>
                    <p className="text-xl font-semibold">{formatCount(pillars?.length || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Assets</p>
                    <p className="text-xl font-semibold">{formatCount(totalAssets)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {hasPillars && (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Play className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">In Automation</p>
                      <p className="text-xl font-semibold">{formatCount(automationTopics)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {hasPillars && (
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Assets Produced</p>
                      <p className="text-xl font-semibold">{formatCount(totalCompleted)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {hasPillars ? (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Growth Pulse</CardTitle>
                <CardDescription>Live system activity across your authority topics.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Assets Produced</p>
                    <p className="text-lg font-semibold">{formatCount(totalCompleted)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Assets in Queue</p>
                    <p className="text-lg font-semibold">{formatCount(totalPending)}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Attention Needed</p>
                    <p className="text-lg font-semibold">{formatCount(totalFailed)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {systemStatusItems.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">System Status</CardTitle>
              <CardDescription>Automation health and activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {systemStatusItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                  <span className={`font-medium ${item.tone}`}>{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold">Content Opportunities</h3>
          <p className="text-sm text-muted-foreground">Discover new authority ideas powered by your business profile.</p>
        </div>
        <Button
          onClick={fetchSuggestions}
          disabled={isLoadingSuggestions}
          variant="outline"
          className="gap-2"
          data-testid="button-get-suggestions"
        >
          {isLoadingSuggestions ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Discovering...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Discover Topics
            </>
          )}
        </Button>
      </div>

      {suggestions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {suggestions.map((suggestion) => (
            <Card
              key={suggestion.id}
              className={`transition-all cursor-pointer ${suggestion.used ? "opacity-60" : "hover-elevate"}`}
              onClick={() => !suggestion.used && useSuggestion(suggestion)}
              data-testid={`suggestion-card-${suggestion.id}`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {PACK_DEFINITIONS[suggestion.packType as PackType]?.name || suggestion.packType}
                    </p>
                    <h4 className="font-medium text-foreground line-clamp-2">{suggestion.name}</h4>
                  </div>
                  {suggestion.used ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {suggestion.description}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{suggestion.suggestedArticleCount} assets</span>
                  <span>Tap to prefill</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !isLoadingSuggestions ? (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="p-6 text-sm text-muted-foreground">
            No opportunities yet. Discover topics to generate tailored authority ideas.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle data-testid="text-topical-authority-title">All Authority Topics</CardTitle>
            <CardDescription data-testid="text-topical-authority-description">
              Build market authority with an automated growth system
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!pillars || pillars.length === 0 ? (
            <div className="py-8">
              <div className="grid gap-6 md:grid-cols-[220px,1fr] items-center rounded-2xl border border-dashed bg-muted/10 p-6">
                <div className="flex items-center justify-center">
                  <img
                    src="https://i.ibb.co/mVt2W1yk/3fa43b55-0e16-465a-acef-0ecf8020818c.png"
                    alt="Authority map illustration"
                    className="w-40 h-auto"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-semibold">No authority topics yet</p>
                    <p className="text-sm text-muted-foreground">
                      Launch your first authority topic to start building market leadership.
                    </p>
                  </div>
                  <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Launch Authority Topic
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {pillars.map((pillar) => (
                <Card
                  key={pillar.id}
                  className={`cursor-pointer transition-all ${selectedPillar === pillar.id ? 'ring-2 ring-primary' : 'hover-elevate'}`}
                  onClick={() => setSelectedPillar(selectedPillar === pillar.id ? null : pillar.id)}
                  data-testid={`card-pillar-${pillar.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <LayoutGrid className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium" data-testid={`text-pillar-name-${pillar.id}`}>{pillar.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{pillar.clusterCount} content streams</span>
                            <span>•</span>
                            <span>{pillar.stats.total} assets</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {pillar.packType && PACK_DEFINITIONS[pillar.packType as PackType] && (
                          <Badge variant="outline" data-testid={`badge-pillar-pack-${pillar.id}`}>
                            {PACK_DEFINITIONS[pillar.packType as PackType].name}
                          </Badge>
                        )}
                        <Badge className={`${statusColors[pillar.status]} text-white`} data-testid={`badge-pillar-status-${pillar.id}`}>
                          {pillar.status}
                        </Badge>
                        {pillar.stats.total > 0 && (
                          <div className="w-24">
                            <Progress value={getProgressPercentage(pillar.stats)} className="h-2" />
                            <span className="text-xs text-muted-foreground">
                              {pillar.stats.completed}/{pillar.stats.total}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPillar && pillarDetails && (
        <>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle data-testid="text-pillar-details-title">{pillarDetails.name}</CardTitle>
                <CardDescription>{pillarDetails.description || "No business focus yet."}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {pillarDetails.status === "draft" && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      generateMapMutation.mutate(pillarDetails.id);
                    }}
                    disabled={generateMapMutation.isPending}
                    data-testid="button-generate-map"
                  >
                    {generateMapMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Map className="h-4 w-4 mr-2" />
                    )}
                    Build Authority Map
                  </Button>
                )}
                {(pillarDetails.status === "mapped" || pillarDetails.status === "paused") && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isOwner && !canCreateContent) {
                        setPaywallFeature("AI Content Generation");
                        setShowPaywall(true);
                      } else {
                        startGenerationMutation.mutate(pillarDetails.id);
                      }
                    }}
                    disabled={startGenerationMutation.isPending}
                    data-testid="button-start-generation"
                  >
                    {startGenerationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Start Production
                  </Button>
                )}
                {pillarDetails.status === "generating" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      pauseGenerationMutation.mutate(pillarDetails.id);
                    }}
                    disabled={pauseGenerationMutation.isPending}
                    data-testid="button-pause-generation"
                  >
                    {pauseGenerationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Pause className="h-4 w-4 mr-2" />
                    )}
                    Pause Automation
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete this authority topic?")) {
                      deletePillarMutation.mutate(pillarDetails.id);
                    }
                  }}
                  disabled={deletePillarMutation.isPending}
                  data-testid="button-delete-pillar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {detailsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pillarDetails.clusters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Map className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No authority map yet.</p>
                <p className="text-sm">Click "Build Authority Map" to create the growth structure.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pillarDetails.pillarArticle && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium flex-1">{pillarDetails.pillarArticle.title}</span>
                    {articleStatusIcons[pillarDetails.pillarArticle.status]}
                    <Badge variant="outline" className="text-xs">
                      {articleRoleDisplayNames[pillarDetails.pillarArticle.articleRole as keyof typeof articleRoleDisplayNames] || "Core Authority Page"}
                    </Badge>
                  </div>
                )}

                {pillarDetails.clusters.map((cluster) => (
                  <Collapsible 
                    key={cluster.id}
                    open={expandedClusters.has(cluster.id)}
                    onOpenChange={() => toggleCluster(cluster.id)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        {expandedClusters.has(cluster.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium flex-1 text-left">{cluster.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {cluster.generatedCount}/{cluster.articleCount} assets
                        </span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-6 mt-1 space-y-1">
                        {cluster.articles.map((article) => (
                          <div 
                            key={article.id}
                            className="flex items-center gap-2 p-2 pl-4 rounded text-sm hover:bg-muted/30"
                          >
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="flex-1 truncate">{article.title}</span>
                            {articleStatusIcons[article.status]}
                            <Badge variant="outline" className="text-xs">
                              {articleRoleDisplayNames[article.articleRole as keyof typeof articleRoleDisplayNames] || article.articleRole}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {pillarDetails.clusters.length > 0 && (
          <PillarLinkGraph
            pillar={pillarDetails}
            articles={[
              ...(pillarDetails.pillarArticle ? [pillarDetails.pillarArticle] : []),
              ...pillarDetails.clusters.flatMap((c) => c.articles),
            ]}
          />
        )}
        </>
      )}

      {/* Paywall Modal */}
      <PaywallModal 
        open={showPaywall} 
        onOpenChange={setShowPaywall} 
        feature={paywallFeature}
      />
    </div>
  );
}






