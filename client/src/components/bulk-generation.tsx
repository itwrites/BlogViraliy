import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { PaywallModal } from "@/components/paywall-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Play, X, Clock, CheckCircle, XCircle, Loader2, Trash2, Languages, Link2, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { KeywordBatch, KeywordJob, Pillar, ArticleRole } from "@shared/schema";
import { languageDisplayNames, type ContentLanguage, articleRoleDisplayNames, articleRoleEnum } from "@shared/schema";

const ARTICLE_ROLES = articleRoleEnum.options.map((value) => ({
  value,
  label: articleRoleDisplayNames[value as ArticleRole],
}));

interface BatchWithJobs extends KeywordBatch {
  jobs: Array<{
    id: string;
    keyword: string;
    status: string;
    postId?: string | null;
    error?: string | null;
  }>;
}

interface BulkGenerationProps {
  siteId: string;
  onPaywallRequired?: (feature: string) => void;
}

export function BulkGeneration({ siteId, onPaywallRequired }: BulkGenerationProps) {
  const { toast } = useToast();
  const { canCreateContent, isOwner } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [masterPrompt, setMasterPrompt] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [pillarId, setPillarId] = useState<string>("none");
  const [articleRole, setArticleRole] = useState<string>("auto");

  const { data: batches, isLoading: batchesLoading, refetch } = useQuery<BatchWithJobs[]>({
    queryKey: ["/api/sites", siteId, "keyword-batches"],
    refetchInterval: 5000,
  });

  const { data: pillars } = useQuery<Pillar[]>({
    queryKey: ["/api/sites", siteId, "pillars"],
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: { keywords: string[]; masterPrompt?: string; targetLanguage?: string; pillarId?: string; articleRole?: string }) => {
      const res = await apiRequest("POST", `/api/sites/${siteId}/keyword-batches`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Batch created",
        description: "Your keywords are being processed. Posts will be generated automatically.",
      });
      setKeywordsInput("");
      setMasterPrompt("");
      setTargetLanguage("en");
      setPillarId("");
      setArticleRole("auto");
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "keyword-batches"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create batch",
        variant: "destructive",
      });
    },
  });

  const cancelBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await apiRequest("POST", `/api/keyword-batches/${batchId}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Batch cancelled",
        description: "Remaining keywords will not be processed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "keyword-batches"] });
    },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await apiRequest("DELETE", `/api/keyword-batches/${batchId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Batch deleted",
        description: "The batch has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "keyword-batches"] });
    },
  });

  const handleSubmit = () => {
    // Check paywall for owners without subscription
    if (isOwner && !canCreateContent) {
      setShowPaywall(true);
      return;
    }

    const keywords = keywordsInput
      .split("\n")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keywords.length === 0) {
      toast({
        title: "No keywords",
        description: "Please enter at least one keyword.",
        variant: "destructive",
      });
      return;
    }

    createBatchMutation.mutate({
      keywords,
      masterPrompt: masterPrompt || undefined,
      targetLanguage,
      pillarId: pillarId === "none" ? undefined : pillarId,
      articleRole: articleRole === "auto" ? undefined : articleRole,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/[\r\n,]+/).map(l => l.trim()).filter(l => l.length > 0);
      setKeywordsInput(lines.join("\n"));
      toast({
        title: "File loaded",
        description: `${lines.length} keywords imported from file.`,
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "processing":
        return <Badge variant="default" className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "cancelled":
        return <Badge variant="outline"><X className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case "queued":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Queued</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const keywordCount = keywordsInput.split("\n").filter((k) => k.trim().length > 0).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Keyword Upload
          </CardTitle>
          <CardDescription>
            Upload a list of keywords to generate AI posts for each one. One keyword per line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="masterPrompt">Master Prompt (Optional)</Label>
              <Textarea
                id="masterPrompt"
                data-testid="textarea-bulk-master-prompt"
                placeholder="Enter a custom prompt to guide AI content generation for all keywords in this batch..."
                value={masterPrompt}
                onChange={(e) => setMasterPrompt(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                If left empty, the default AI prompt from the AI Content tab will be used.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulkLanguage">
                <span className="flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  Content Language
                </span>
              </Label>
              <Select
                value={targetLanguage}
                onValueChange={setTargetLanguage}
              >
                <SelectTrigger id="bulkLanguage" data-testid="select-bulk-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(languageDisplayNames).map(([code, name]) => (
                    <SelectItem key={code} value={code}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">All posts will be written in this language</p>
            </div>

            {pillars && pillars.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="bulkPillar">
                  <span className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Link to Pillar (Optional)
                  </span>
                </Label>
                <Select
                  value={pillarId}
                  onValueChange={setPillarId}
                >
                  <SelectTrigger id="bulkPillar" data-testid="select-bulk-pillar">
                    <SelectValue placeholder="No pillar - standalone posts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No pillar - standalone posts</SelectItem>
                    {pillars.map((pillar) => (
                      <SelectItem key={pillar.id} value={pillar.id}>
                        {pillar.name} ({pillar.packType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Link posts to a pillar for internal linking and pack-based content structure
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="bulkArticleRole">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Article Role
                </span>
              </Label>
              <Select
                value={articleRole}
                onValueChange={setArticleRole}
              >
                <SelectTrigger id="bulkArticleRole" data-testid="select-bulk-article-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect from keyword</SelectItem>
                  {ARTICLE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Determines content structure and SEO schema. Auto-detect analyzes keywords.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="keywords">Keywords</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  data-testid="input-bulk-file-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  data-testid="button-upload-csv"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload CSV/TXT
                </Button>
              </div>
            </div>
            <Textarea
              id="keywords"
              data-testid="textarea-bulk-keywords"
              placeholder="Enter one keyword per line:

best coffee maker 2024
how to make espresso
coffee grinder reviews
..."
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {keywordCount} keyword{keywordCount !== 1 ? "s" : ""} ready to process
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={keywordCount === 0 || createBatchMutation.isPending}
            className="w-full"
            data-testid="button-start-bulk-generation"
          >
            {createBatchMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Start Generating {keywordCount} Post{keywordCount !== 1 ? "s" : ""}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generation Batches</CardTitle>
          <CardDescription>
            Track the progress of your bulk generation jobs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {batchesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !batches || batches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No batches yet. Upload keywords above to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {batches.map((batch) => {
                const progress = batch.totalKeywords > 0
                  ? (batch.processedCount / batch.totalKeywords) * 100
                  : 0;
                const isActive = batch.status === "pending" || batch.status === "processing";

                return (
                  <Card key={batch.id} className="bg-muted/30" data-testid={`card-batch-${batch.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(batch.status)}
                          <span className="text-sm text-muted-foreground">
                            {new Date(batch.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelBatchMutation.mutate(batch.id)}
                              disabled={cancelBatchMutation.isPending}
                              data-testid={`button-cancel-batch-${batch.id}`}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBatchMutation.mutate(batch.id)}
                            disabled={deleteBatchMutation.isPending || isActive}
                            data-testid={`button-delete-batch-${batch.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>
                            {batch.processedCount} / {batch.totalKeywords}
                            {batch.successCount > 0 && (
                              <span className="text-green-500 ml-2">
                                ({batch.successCount} success)
                              </span>
                            )}
                            {batch.failedCount > 0 && (
                              <span className="text-red-500 ml-2">
                                ({batch.failedCount} failed)
                              </span>
                            )}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {batch.jobs && batch.jobs.length > 0 && (
                        <div className="mt-4">
                          <details className="cursor-pointer">
                            <summary className="text-sm text-muted-foreground hover:text-foreground">
                              View keywords ({batch.jobs.length})
                            </summary>
                            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                              {batch.jobs.map((job) => (
                                <div
                                  key={job.id}
                                  className="flex items-center justify-between py-1 px-2 rounded text-sm bg-background"
                                  data-testid={`job-${job.id}`}
                                >
                                  <span className="truncate flex-1">{job.keyword}</span>
                                  <div className="flex items-center gap-2 ml-2">
                                    {getStatusBadge(job.status)}
                                    {job.error && (
                                      <span className="text-xs text-red-500" title={job.error}>
                                        Error
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paywall Modal */}
      <PaywallModal 
        open={showPaywall} 
        onOpenChange={setShowPaywall} 
        feature="Bulk Content Generation"
      />
    </div>
  );
}
