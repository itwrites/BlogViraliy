import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Plus, X, Save, Palette, Search, Type, Layout, Globe, Settings, Menu, ExternalLink, GripVertical, Trash2, Link, Check, ChevronsUpDown, Rss, Sparkles, FileText, BookOpen, Users, Key, Copy, Eye, EyeOff, RefreshCw, AlertTriangle, Building2, Wrench, ImageIcon, Replace, Wand2, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Site, AiAutomationConfig, RssAutomationConfig, TemplateSettings, SiteMenuItem, SiteAuthor, Pillar } from "@shared/schema";
import { defaultTemplateSettings } from "@shared/schema";
import { BulkGeneration } from "@/components/bulk-generation";
import { TopicalAuthority } from "@/components/topical-authority";
import { SetupWizard } from "@/pages/setup-wizard";
import { GeneralSection } from "@/components/site-config/GeneralSection";
import { BusinessSection } from "@/components/site-config/BusinessSection";
import { NavigationSection } from "@/components/site-config/NavigationSection";
import { DesignSection } from "@/components/site-config/DesignSection";
import { SeoSection } from "@/components/site-config/SeoSection";
import { AuthorsSection } from "@/components/site-config/AuthorsSection";
import { AiSection } from "@/components/site-config/AiSection";
import { RssSection } from "@/components/site-config/RssSection";
import { OnboardingModal } from "@/components/onboarding-modal";
import { PaywallModal } from "@/components/paywall-modal";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import type { AiConfigState, MenuItemDraft, NewAuthorState, RssConfigState, SiteDataState } from "@/components/site-config/types";

type ActiveSection = "general" | "navigation" | "design" | "seo" | "authors" | "ai" | "rss" | "topical" | "bulk" | "posts" | "api" | "business" | "troubleshooting";

interface ApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[] | null;
  rateLimit: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  requestCount: number;
}

const AVAILABLE_PERMISSIONS = [
  { id: "posts_read", label: "Read Posts", description: "List and read published posts" },
  { id: "posts_write", label: "Write Posts", description: "Create, update, and delete posts" },
  { id: "pillars_read", label: "Read Pillars", description: "View topical authority pillars and articles" },
  { id: "pillars_manage", label: "Manage Pillars", description: "Create and manage pillars" },
  { id: "stats_read", label: "Read Stats", description: "Access site statistics and analytics" },
];

function ApiKeysSection({ siteId }: { siteId: string }) {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(["posts_read"]);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(1000);
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const { data: apiKeys = [], isLoading } = useQuery<ApiKeyData[]>({
    queryKey: ["/api/sites", siteId, "api-keys"],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/api-keys`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch API keys");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; permissions: string[]; rateLimit: number; expiresAt?: string }) => {
      const res = await apiRequest("POST", `/api/sites/${siteId}/api-keys`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "api-keys"] });
      setCreatedKey(data.key);
      setShowCreateForm(false);
      setNewKeyName("");
      setNewKeyPermissions(["posts_read"]);
      setNewKeyRateLimit(1000);
      setNewKeyExpiry("");
      toast({ title: "API key created", description: "Copy your key now - it won't be shown again" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create API key", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await apiRequest("DELETE", `/api/sites/${siteId}/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "api-keys"] });
      toast({ title: "API key deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete API key", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ keyId, isActive }: { keyId: string; isActive: boolean }) => {
      await apiRequest("PUT", `/api/sites/${siteId}/api-keys/${keyId}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "api-keys"] });
    },
  });

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      toast({ title: "Name required", description: "Please enter a name for the API key", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      name: newKeyName,
      permissions: newKeyPermissions,
      rateLimit: newKeyRateLimit,
      expiresAt: newKeyExpiry || undefined,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-xl p-4 border border-border">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">API keys allow external applications to read or write content on your site</p>
            <p className="text-xs text-muted-foreground mt-1">Treat keys like passwords - never share them publicly.</p>
          </div>
        </div>
      </div>

      {createdKey && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              API Key Created
            </CardTitle>
            <CardDescription>
              Copy this key now. For security, it will never be shown again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-3 rounded font-mono text-sm break-all">
                {showKey ? createdKey : createdKey.replace(/./g, "*")}
              </code>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowKey(!showKey)}
                data-testid="button-toggle-key-visibility"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => copyToClipboard(createdKey)}
                data-testid="button-copy-key"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCreatedKey(null)}
              data-testid="button-dismiss-key"
            >
              I've copied the key
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" data-testid="text-api-title">
                <Key className="w-5 h-5" />
                Public API Keys
              </CardTitle>
              <CardDescription data-testid="text-api-description">
                Generate API keys to access your site's content programmatically. Use these for integrations, mobile apps, or third-party services.
              </CardDescription>
            </div>
            {!showCreateForm && (
              <Button onClick={() => setShowCreateForm(true)} data-testid="button-create-api-key">
                <Plus className="w-4 h-4 mr-2" />
                Create Key
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {showCreateForm && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
              <h4 className="font-medium">Create New API Key</h4>

              <div className="space-y-2">
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Mobile App, External Service"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  data-testid="input-api-key-name"
                />
                <p className="text-xs text-muted-foreground">A label to identify this key (e.g., 'Mobile App', 'Zapier Integration')</p>
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
                <p className="text-xs text-muted-foreground mb-2">Select what this key can access. Use minimal permissions for security.</p>
                <div className="space-y-2">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <div key={perm.id} className="flex items-start gap-3">
                      <Checkbox
                        id={perm.id}
                        checked={newKeyPermissions.includes(perm.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewKeyPermissions([...newKeyPermissions, perm.id]);
                          } else {
                            setNewKeyPermissions(newKeyPermissions.filter((p) => p !== perm.id));
                          }
                        }}
                        data-testid={`checkbox-permission-${perm.id}`}
                      />
                      <div className="flex-1">
                        <label htmlFor={perm.id} className="text-sm font-medium cursor-pointer">
                          {perm.label}
                        </label>
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="rateLimit">Rate Limit (requests/hour)</Label>
                  <Input
                    id="rateLimit"
                    type="number"
                    min={100}
                    max={10000}
                    value={newKeyRateLimit}
                    onChange={(e) => setNewKeyRateLimit(parseInt(e.target.value) || 1000)}
                    data-testid="input-rate-limit"
                  />
                  <p className="text-xs text-muted-foreground">Maximum requests per hour. Higher limits may impact performance.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiration Date (optional)</Label>
                  <Input
                    id="expiry"
                    type="date"
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(e.target.value)}
                    data-testid="input-expiry-date"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-create-key">
                  {createMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create Key
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)} data-testid="button-cancel-create-key">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading API keys...</div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No API keys yet</p>
              <p className="text-sm text-muted-foreground">Create a key to enable external API access</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={`border rounded-lg p-4 ${!key.isActive ? "opacity-60 bg-muted/30" : ""}`}
                  data-testid={`api-key-item-${key.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{key.name}</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">{key.keyPrefix}...</code>
                        {!key.isActive && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                        {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                          <Badge variant="destructive" className="text-xs">Expired</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(key.permissions || []).map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {AVAILABLE_PERMISSIONS.find((p) => p.id === perm)?.label || perm}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground space-x-4">
                        <span>Created: {formatDate(key.createdAt)}</span>
                        <span>Last used: {formatDate(key.lastUsedAt)}</span>
                        <span>Requests: {key.requestCount.toLocaleString()}</span>
                        <span>Limit: {key.rateLimit.toLocaleString()}/hr</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={key.isActive}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ keyId: key.id, isActive: checked })}
                        data-testid={`switch-active-${key.id}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
                            deleteMutation.mutate(key.id);
                          }
                        }}
                        data-testid={`button-delete-key-${key.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" data-testid="text-api-usage-title">
            <Globe className="w-5 h-5" />
            API Usage
          </CardTitle>
          <CardDescription>Quick reference for using the public API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Base URL</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-2 rounded text-sm font-mono">
                https://your-domain.com/bv_api/v1
              </code>
              <Button size="icon" variant="ghost" onClick={() => copyToClipboard("https://your-domain.com/bv_api/v1")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Authentication</Label>
            <code className="block bg-muted p-2 rounded text-sm font-mono">
              Authorization: Bearer bv_your_api_key_here
            </code>
          </div>
          <div className="space-y-2">
            <Label>Example Request</Label>
            <code className="block bg-muted p-2 rounded text-sm font-mono whitespace-pre">
              {`curl -X GET "https://your-domain.com/bv_api/v1/posts" \\
  -H "Authorization: Bearer bv_..." \\
  -H "Content-Type: application/json"`}
            </code>
          </div>
          <p className="text-sm text-muted-foreground">
            See the Admin Wiki for full API documentation including all endpoints, request/response formats, and error handling.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface ImageInfo {
  url: string;
  count: number;
}

interface PostWithImage {
  id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
}

interface AutoFixResult {
  postId: string;
  title: string;
  success: boolean;
  newImageUrl?: string;
  error?: string;
}

function TroubleshootingSection({ siteId }: { siteId: string }) {
  const { toast } = useToast();
  const [searchImageUrl, setSearchImageUrl] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [matchingPosts, setMatchingPosts] = useState<PostWithImage[]>([]);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isFetchingPexels, setIsFetchingPexels] = useState(false);
  const [pexelsKeywords, setPexelsKeywords] = useState("");
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [autoFixResults, setAutoFixResults] = useState<AutoFixResult[] | null>(null);
  const [autoFixProgress, setAutoFixProgress] = useState<{ current: number; total: number } | null>(null);

  const { data: featuredImages = [], isLoading: loadingImages } = useQuery<ImageInfo[]>({
    queryKey: ["/api/sites", siteId, "featured-images"],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/featured-images`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch featured images");
      return res.json();
    },
  });

  const searchByImage = async (imageUrlOverride?: string) => {
    const urlToSearch = imageUrlOverride ?? searchImageUrl;
    if (!urlToSearch.trim()) {
      toast({ title: "Enter an image URL to search", variant: "destructive" });
      return;
    }

    if (imageUrlOverride) {
      setSearchImageUrl(imageUrlOverride);
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/posts/search-by-image?imageUrl=${encodeURIComponent(urlToSearch)}`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Search failed");
      const posts = await res.json();
      setMatchingPosts(posts);
      setSelectedPostIds(new Set(posts.map((p: PostWithImage) => p.id)));

      if (posts.length === 0) {
        toast({ title: "No articles found with that image" });
      } else {
        toast({ title: `Found ${posts.length} article(s) with that image` });
      }
    } catch (error) {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const bulkReplaceImages = async () => {
    if (!newImageUrl.trim()) {
      toast({ title: "Enter a new image URL", variant: "destructive" });
      return;
    }

    if (selectedPostIds.size === 0) {
      toast({ title: "Select at least one article", variant: "destructive" });
      return;
    }

    setIsReplacing(true);
    try {
      const res = await apiRequest("POST", `/api/sites/${siteId}/posts/bulk-replace-image`, {
        oldImageUrl: searchImageUrl,
        newImageUrl: newImageUrl,
        postIds: Array.from(selectedPostIds),
      });
      const result = await res.json();

      toast({
        title: "Images replaced",
        description: `Updated ${result.updatedCount} post(s)`
      });

      setMatchingPosts([]);
      setSelectedPostIds(new Set());
      setSearchImageUrl("");
      setNewImageUrl("");

      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "featured-images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "posts"] });
    } catch (error) {
      toast({ title: "Replace failed", variant: "destructive" });
    } finally {
      setIsReplacing(false);
    }
  };

  const togglePostSelection = (postId: string) => {
    const newSelected = new Set(selectedPostIds);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPostIds(newSelected);
  };

  const selectAll = () => {
    setSelectedPostIds(new Set(matchingPosts.map(p => p.id)));
  };

  const selectNone = () => {
    setSelectedPostIds(new Set());
  };

  // Extract keywords from post titles for Pexels search
  const extractKeywordsFromPosts = () => {
    if (matchingPosts.length === 0) return "";
    // Take first post's title and extract key words
    const title = matchingPosts[0].title;
    // Remove common words and get first 3-4 meaningful words
    const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare", "ought", "used", "how", "what", "why", "when", "where", "who", "which", "that", "this", "these", "those", "your", "our", "my"]);
    const words = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w))
      .slice(0, 4);
    return words.join(" ");
  };

  const fetchFromPexels = async () => {
    const keywords = pexelsKeywords.trim() || extractKeywordsFromPosts();
    if (!keywords) {
      toast({ title: "Enter keywords or search for posts first", variant: "destructive" });
      return;
    }

    setIsFetchingPexels(true);
    try {
      const res = await apiRequest("POST", `/api/sites/${siteId}/pexels-search`, { keywords });
      const data = await res.json();

      if (data.imageUrl) {
        setNewImageUrl(data.imageUrl);
        toast({ title: "Found image from Pexels", description: `Keywords: ${keywords}` });
      }
    } catch (error) {
      toast({ title: "No images found", description: "Try different keywords", variant: "destructive" });
    } finally {
      setIsFetchingPexels(false);
    }
  };

  const autoFixAllImages = async () => {
    if (!searchImageUrl.trim()) {
      toast({ title: "Search for articles first", variant: "destructive" });
      return;
    }

    if (matchingPosts.length === 0) {
      toast({ title: "No articles to fix", variant: "destructive" });
      return;
    }

    setIsAutoFixing(true);
    setAutoFixResults(null);
    setAutoFixProgress({ current: 0, total: matchingPosts.length });

    try {
      const res = await apiRequest("POST", `/api/sites/${siteId}/bulk-auto-replace`, {
        oldImageUrl: searchImageUrl,
      });
      const data = await res.json();

      setAutoFixResults(data.results);
      setAutoFixProgress(null);

      // Always invalidate caches after the operation
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "featured-images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId, "posts"] });

      if (data.failed > 0) {
        // Mixed or full failure - show error and keep results visible
        toast({
          title: data.updated > 0 ? "Partial success" : "Auto-fix failed",
          description: `Updated ${data.updated} of ${data.total} articles. ${data.failed} failed. Review results below.`,
          variant: "destructive"
        });
        // Do NOT clear the search/posts - let user review what happened
      } else if (data.updated > 0) {
        // Full success
        toast({
          title: "Auto-fix complete",
          description: `Successfully updated all ${data.updated} articles with unique Pexels images`
        });
        // Clear only on full success
        setMatchingPosts([]);
        setSelectedPostIds(new Set());
        setSearchImageUrl("");
      } else {
        toast({
          title: "No articles updated",
          description: "No matching articles found or all updates failed",
          variant: "destructive"
        });
      }
    } catch (error) {
      setAutoFixProgress(null);
      toast({ title: "Auto-fix failed", variant: "destructive" });
    } finally {
      setIsAutoFixing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Replace className="w-5 h-5" />
            Bulk Image Replacement
          </CardTitle>
          <CardDescription>
            Find all posts using a specific featured image and replace it with a different one
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="searchImage">Image URL to Find</Label>
              <div className="flex gap-2">
                <Input
                  id="searchImage"
                  placeholder="https://example.com/old-image.jpg"
                  value={searchImageUrl}
                  onChange={(e) => setSearchImageUrl(e.target.value)}
                  data-testid="input-search-image-url"
                />
                <Button
                  onClick={() => searchByImage()}
                  disabled={isSearching}
                  data-testid="button-search-image"
                >
                  {isSearching ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {matchingPosts.length > 0 && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Matching Articles ({matchingPosts.length})</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={selectAll}>
                        Select All
                      </Button>
                      <Button size="sm" variant="outline" onClick={selectNone}>
                        Select None
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    {matchingPosts.map((post) => (
                      <div
                        key={post.id}
                        className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                        data-testid={`post-item-${post.id}`}
                      >
                        <Checkbox
                          checked={selectedPostIds.has(post.id)}
                          onCheckedChange={() => togglePostSelection(post.id)}
                          data-testid={`checkbox-post-${post.id}`}
                        />
                        {post.imageUrl && (
                          <img
                            src={post.imageUrl}
                            alt=""
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{post.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{post.slug}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-2 border-primary/50 rounded-lg bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold">Auto-Fix All ({matchingPosts.length} posts)</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Automatically assigns a unique Pexels image to each post based on its title
                      </p>
                    </div>
                    <Button
                      onClick={autoFixAllImages}
                      disabled={isAutoFixing || matchingPosts.length === 0}
                      size="lg"
                      data-testid="button-auto-fix-all"
                    >
                      {isAutoFixing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Auto-Fix All
                        </>
                      )}
                    </Button>
                  </div>
                  {isAutoFixing && autoFixProgress && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing {autoFixProgress.total} posts... This may take a minute.
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
                        <div className="absolute inset-0 h-full w-1/3 rounded-full bg-primary animate-[progress-indeterminate_1.5s_ease-in-out_infinite]"
                          style={{ animation: "progress-indeterminate 1.5s ease-in-out infinite" }} />
                      </div>
                      <style>{`
                        @keyframes progress-indeterminate {
                          0% { transform: translateX(-100%); }
                          50% { transform: translateX(200%); }
                          100% { transform: translateX(-100%); }
                        }
                      `}</style>
                      <p className="text-xs text-muted-foreground">
                        Extracting keywords from each post title and finding unique images from Pexels
                      </p>
                    </div>
                  )}
                </div>

                {autoFixResults && autoFixResults.length > 0 && (
                  <div className="space-y-2">
                    <Label>Auto-Fix Results</Label>
                    <div className="border rounded-lg max-h-64 overflow-y-auto">
                      {autoFixResults.map((result, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-3 p-3 border-b last:border-b-0 ${result.success ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}
                        >
                          {result.success ? (
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{result.title}</p>
                            {result.success ? (
                              <p className="text-xs text-green-600 truncate">New image assigned</p>
                            ) : (
                              <p className="text-xs text-red-600">{result.error}</p>
                            )}
                          </div>
                          {result.success && result.newImageUrl && (
                            <img
                              src={result.newImageUrl}
                              alt=""
                              className="w-12 h-12 object-cover rounded flex-shrink-0"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or manually select one image for all</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    <Label className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Manual: Fetch Single Image from Pexels
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder={extractKeywordsFromPosts() || "Enter keywords (e.g., nature, business, technology)"}
                        value={pexelsKeywords}
                        onChange={(e) => setPexelsKeywords(e.target.value)}
                        data-testid="input-pexels-keywords"
                      />
                      <Button
                        onClick={fetchFromPexels}
                        disabled={isFetchingPexels}
                        variant="secondary"
                        data-testid="button-fetch-pexels"
                      >
                        {isFetchingPexels ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          "Fetch"
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Keywords are auto-extracted from post titles. Click Fetch to get a random matching image.
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">or enter URL manually</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newImage">New Image URL</Label>
                    <Input
                      id="newImage"
                      placeholder="https://example.com/new-image.jpg"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      data-testid="input-new-image-url"
                    />
                  </div>
                </div>

                {newImageUrl && (
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <img
                      src={newImageUrl}
                      alt="New image preview"
                      className="max-w-xs max-h-40 object-cover rounded border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                <Button
                  onClick={bulkReplaceImages}
                  disabled={isReplacing || selectedPostIds.size === 0 || !newImageUrl.trim()}
                  className="w-full"
                  data-testid="button-replace-images"
                >
                  {isReplacing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Replacing...
                    </>
                  ) : (
                    <>
                      <Replace className="w-4 h-4 mr-2" />
                      Replace Image in {selectedPostIds.size} Post(s)
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            All Featured Images
          </CardTitle>
          <CardDescription>
            Click on an image URL to search for posts using it
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingImages ? (
            <div className="text-center py-8 text-muted-foreground">Loading images...</div>
          ) : featuredImages.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No featured images found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {featuredImages.map((img, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => searchByImage(img.url)}
                  data-testid={`image-item-${idx}`}
                >
                  <img
                    src={img.url}
                    alt=""
                    className="w-10 h-10 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21,15 16,10 5,21'/%3E%3C/svg%3E";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono truncate text-muted-foreground">{img.url}</p>
                  </div>
                  <Badge variant="secondary">{img.count} post{img.count !== 1 ? "s" : ""}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const sidebarVariants = {
  initial: { opacity: 0, x: -24 },
  animate: { 
    opacity: 1, 
    x: 0, 
    transition: { 
      duration: 0.5, 
      ease: [0.32, 0.72, 0, 1] 
    } 
  }
};

const contentVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      delay: 0.15, 
      duration: 0.5, 
      ease: [0.32, 0.72, 0, 1] 
    } 
  }
};

const navItemVariants = {
  initial: { opacity: 0, x: -12 },
  animate: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.2 + i * 0.05,
      duration: 0.3,
      ease: [0.32, 0.72, 0, 1]
    }
  })
};

export default function SiteConfig() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isOwner, isLoading: authLoading, logout } = useAuth();
  
  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };
  const isNewSite = id === "new";
  

  const [siteData, setSiteData] = useState<SiteDataState>({
    domain: "",
    domainAliases: [] as string[],
    basePath: "", // Optional path prefix for reverse proxy (e.g., "/blog")
    deploymentMode: "standalone" as "standalone" | "reverse_proxy",
    proxyVisitorHostname: "", // Visitor hostname for reverse_proxy mode
    title: "",
    logoUrl: "",
    logoTargetUrl: "", // Custom URL for logo click (empty = homepage)
    menuMode: "automatic" as "automatic" | "manual",
    siteType: "forbis",
    postUrlFormat: "with-prefix" as "with-prefix" | "root",
    displayLanguage: "en",
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
    favicon: "",
    analyticsId: "",
    businessDescription: "",
    targetAudience: "",
    brandVoice: "",
    valuePropositions: "",
    industry: "",
    competitors: "",
  });

  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>(defaultTemplateSettings);

  const [aiConfig, setAiConfig] = useState<AiConfigState>({
    enabled: false,
    schedule: "1_per_day",
    masterPrompt: "",
    keywords: [] as string[],
    targetLanguage: "en",
  });

  const [rssConfig, setRssConfig] = useState<RssConfigState>({
    enabled: false,
    schedule: "every_6_hours",
    feedUrls: [] as string[],
    articlesToFetch: 3,
    targetLanguage: "en",
    masterPrompt: "",
    pillarId: "" as string,
    articleRole: "" as string,
  });

  const [newKeyword, setNewKeyword] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newDomainAlias, setNewDomainAlias] = useState("");

  const [menuItems, setMenuItems] = useState<SiteMenuItem[]>([]);
  const [editingMenuItem, setEditingMenuItem] = useState<SiteMenuItem | null>(null);
  const [newMenuItem, setNewMenuItem] = useState<MenuItemDraft>({
    label: "",
    type: "url" as "url" | "tag_group",
    href: "",
    tagSlugs: [] as string[],
    groupSlug: "",
    openInNewTab: false,
  });

  // Authors state
  const [authors, setAuthors] = useState<SiteAuthor[]>([]);
  const [editingAuthor, setEditingAuthor] = useState<SiteAuthor | null>(null);
  const [newAuthor, setNewAuthor] = useState<NewAuthorState>({
    name: "",
    slug: "",
    bio: "",
    avatarUrl: "",
    isDefault: false,
  });

  const [activeSection, setActiveSection] = useState<ActiveSection>("general");
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState("");

  const { canCreateContent, isOwner: subscriptionOwner } = useSubscription();

  const { data: site, isLoading: siteLoading } = useQuery<Site>({
    queryKey: ["/api/sites", id],
    enabled: !isNewSite,
  });

  const { data: existingAiConfig } = useQuery<AiAutomationConfig>({
    queryKey: ["/api/sites", id, "ai-config"],
    enabled: !isNewSite,
  });

  const { data: existingRssConfig } = useQuery<RssAutomationConfig>({
    queryKey: ["/api/sites", id, "rss-config"],
    enabled: !isNewSite,
  });

  const { data: existingMenuItems } = useQuery<SiteMenuItem[]>({
    queryKey: ["/api/sites", id, "menu-items"],
    enabled: !isNewSite,
  });

  const { data: existingAuthors } = useQuery<SiteAuthor[]>({
    queryKey: ["/api/sites", id, "authors"],
    enabled: !isNewSite,
  });

  // Fetch all existing tags for the site (for tag group dropdown)
  const { data: allTags = [] } = useQuery<string[]>({
    queryKey: ["/api/sites", id, "all-tags"],
    enabled: !isNewSite,
  });

  // Fetch pillars for RSS internal linking dropdown
  const { data: pillars = [] } = useQuery<Pillar[]>({
    queryKey: ["/api/sites", id, "pillars"],
    enabled: !isNewSite,
  });

  // State for tag selector popover
  const [tagSelectorOpen, setTagSelectorOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");

  // Filter tags based on search query
  const filteredTags = useMemo(() => {
    const query = tagSearchQuery.toLowerCase().trim();
    if (!query) return allTags;
    return allTags.filter(tag => tag.toLowerCase().includes(query));
  }, [allTags, tagSearchQuery]);

  // Check if we can create a new tag (query doesn't match any existing tag)
  const canCreateNewTag = useMemo(() => {
    const normalizedQuery = tagSearchQuery.toLowerCase().trim().replace(/\s+/g, "-");
    if (!normalizedQuery) return false;
    return !allTags.some(tag => tag.toLowerCase() === normalizedQuery);
  }, [allTags, tagSearchQuery]);

  useEffect(() => {
    if (existingAuthors) {
      setAuthors(existingAuthors);
    }
  }, [existingAuthors]);

  useEffect(() => {
    if (site) {
      setSiteData({
        domain: site.domain || "",
        domainAliases: site.domainAliases || [],
        basePath: site.basePath || "",
        deploymentMode: (site.deploymentMode as "standalone" | "reverse_proxy") || "standalone",
        proxyVisitorHostname: site.proxyVisitorHostname || "",
        title: site.title,
        logoUrl: site.logoUrl || "",
        logoTargetUrl: site.logoTargetUrl || "",
        menuMode: (site.menuMode as "automatic" | "manual") || "automatic",
        siteType: site.siteType,
        postUrlFormat: (site.postUrlFormat as "with-prefix" | "root") || "with-prefix",
        displayLanguage: (site.displayLanguage as SiteDataState["displayLanguage"]) || "en",
        metaTitle: site.metaTitle || "",
        metaDescription: site.metaDescription || "",
        ogImage: site.ogImage || "",
        favicon: site.favicon || "",
        analyticsId: site.analyticsId || "",
        businessDescription: site.businessDescription || "",
        targetAudience: site.targetAudience || "",
        brandVoice: site.brandVoice || "",
        valuePropositions: site.valuePropositions || "",
        industry: site.industry || "",
        competitors: site.competitors || "",
      });
      if (site.templateSettings) {
        setTemplateSettings({ ...defaultTemplateSettings, ...site.templateSettings });
      }
    }
  }, [site]);

  useEffect(() => {
    if (existingMenuItems) {
      setMenuItems(existingMenuItems);
    }
  }, [existingMenuItems]);

  const addDomainAlias = () => {
    let alias = newDomainAlias.trim().toLowerCase();

    // Extract domain from URL if user enters a full URL
    // Handles: https://example.com/path, http://example.com, //example.com, example.com/path
    try {
      // Check if it looks like a URL (has protocol or starts with //)
      if (alias.includes("://") || alias.startsWith("//")) {
        const url = new URL(alias.startsWith("//") ? `https:${alias}` : alias);
        alias = url.hostname;
      } else if (alias.includes("/")) {
        // Handle case like "example.com/path" without protocol
        alias = alias.split("/")[0];
      }
    } catch {
      // If URL parsing fails, try to extract domain manually
      alias = alias.replace(/^(https?:)?\/\//, "").split("/")[0];
    }

    // Remove any remaining path, query string, or port
    alias = alias.split(":")[0].split("?")[0].split("#")[0];

    if (alias && !siteData.domainAliases.includes(alias) && alias !== siteData.domain) {
      setSiteData({ ...siteData, domainAliases: [...siteData.domainAliases, alias] });
      setNewDomainAlias("");
    }
  };

  const removeDomainAlias = (alias: string) => {
    setSiteData({ ...siteData, domainAliases: siteData.domainAliases.filter(a => a !== alias) });
  };

  useEffect(() => {
    if (existingAiConfig) {
      setAiConfig({
        enabled: existingAiConfig.enabled,
        schedule: existingAiConfig.schedule,
        masterPrompt: existingAiConfig.masterPrompt,
        keywords: existingAiConfig.keywords,
        targetLanguage: existingAiConfig.targetLanguage || "en",
      });
    }
  }, [existingAiConfig]);

  useEffect(() => {
    if (existingRssConfig) {
      setRssConfig({
        enabled: existingRssConfig.enabled,
        schedule: existingRssConfig.schedule,
        feedUrls: existingRssConfig.feedUrls,
        articlesToFetch: existingRssConfig.articlesToFetch,
        targetLanguage: existingRssConfig.targetLanguage || "en",
        masterPrompt: existingRssConfig.masterPrompt || "",
        pillarId: (existingRssConfig as any).pillarId || "",
        articleRole: (existingRssConfig as any).articleRole || "",
      });
    }
  }, [existingRssConfig]);


  const handleSave = async () => {
    try {
      let siteId = id;

      const fullSiteData = {
        ...siteData,
        templateSettings,
      };

      if (isNewSite) {
        const response = await apiRequest("POST", "/api/sites", fullSiteData);
        const newSite = await response.json();
        siteId = newSite.id;
      } else {
        await apiRequest("PUT", `/api/sites/${id}`, fullSiteData);
      }

      await apiRequest("PUT", `/api/sites/${siteId}/ai-config`, aiConfig);
      await apiRequest("PUT", `/api/sites/${siteId}/rss-config`, rssConfig);

      toast({ title: isNewSite ? "Site created successfully" : "Site updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", id] });

      if (isNewSite) {
        setLocation(`/admin/sites/${siteId}/settings`);
      }
    } catch (error) {
      toast({ title: "Failed to save site", variant: "destructive" });
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !aiConfig.keywords.includes(newKeyword.trim())) {
      setAiConfig({ ...aiConfig, keywords: [...aiConfig.keywords, newKeyword.trim()] });
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setAiConfig({ ...aiConfig, keywords: aiConfig.keywords.filter(k => k !== keyword) });
  };

  const addFeedUrl = () => {
    const feedUrls = rssConfig.feedUrls || [];
    if (newFeedUrl.trim() && !feedUrls.includes(newFeedUrl.trim())) {
      setRssConfig({ ...rssConfig, feedUrls: [...feedUrls, newFeedUrl.trim()] });
      setNewFeedUrl("");
    }
  };

  const removeFeedUrl = (url: string) => {
    setRssConfig({ ...rssConfig, feedUrls: (rssConfig.feedUrls || []).filter(u => u !== url) });
  };

  const addMenuItem = async () => {
    if (!newMenuItem.label.trim()) return;
    try {
      const response = await apiRequest("POST", `/api/sites/${id}/menu-items`, {
        ...newMenuItem,
        sortOrder: menuItems.length,
      });
      const item = await response.json();
      setMenuItems([...menuItems, item]);
      setNewMenuItem({
        label: "",
        type: "url",
        href: "",
        tagSlugs: [],
        groupSlug: "",
        openInNewTab: false,
      });
      toast({ title: "Menu item added" });
    } catch (error) {
      toast({ title: "Failed to add menu item", variant: "destructive" });
    }
  };

  const updateMenuItem = async (item: SiteMenuItem) => {
    try {
      await apiRequest("PUT", `/api/sites/${id}/menu-items/${item.id}`, item);
      setMenuItems(menuItems.map(m => m.id === item.id ? item : m));
      setEditingMenuItem(null);
      toast({ title: "Menu item updated" });
    } catch (error) {
      toast({ title: "Failed to update menu item", variant: "destructive" });
    }
  };

  const deleteMenuItem = async (itemId: string) => {
    try {
      await apiRequest("DELETE", `/api/sites/${id}/menu-items/${itemId}`);
      setMenuItems(menuItems.filter(m => m.id !== itemId));
      toast({ title: "Menu item deleted" });
    } catch (error) {
      toast({ title: "Failed to delete menu item", variant: "destructive" });
    }
  };

  const moveMenuItem = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= menuItems.length) return;

    const newItems = [...menuItems];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setMenuItems(newItems);

    try {
      await apiRequest("POST", `/api/sites/${id}/menu-items/reorder`, {
        itemIds: newItems.map(item => item.id),
      });
    } catch (error) {
      toast({ title: "Failed to reorder menu items", variant: "destructive" });
    }
  };

  const removeTagSlugFromNewItem = (slug: string) => {
    setNewMenuItem({ ...newMenuItem, tagSlugs: newMenuItem.tagSlugs.filter(s => s !== slug) });
  };

  // Author functions
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };

  const addAuthor = async () => {
    if (!newAuthor.name.trim() || !newAuthor.slug.trim()) return;
    try {
      const response = await apiRequest("POST", `/api/sites/${id}/authors`, newAuthor);
      const author = await response.json();
      setAuthors([...authors, author]);
      setNewAuthor({ name: "", slug: "", bio: "", avatarUrl: "", isDefault: false });
      queryClient.invalidateQueries({ queryKey: ["/api/sites", id, "authors"] });
      toast({ title: "Author added" });
    } catch (error) {
      toast({ title: "Failed to add author", variant: "destructive" });
    }
  };

  const updateAuthor = async (author: SiteAuthor) => {
    try {
      await apiRequest("PUT", `/api/sites/${id}/authors/${author.id}`, author);
      setAuthors(authors.map(a => a.id === author.id ? author : a));
      setEditingAuthor(null);
      queryClient.invalidateQueries({ queryKey: ["/api/sites", id, "authors"] });
      toast({ title: "Author updated" });
    } catch (error) {
      toast({ title: "Failed to update author", variant: "destructive" });
    }
  };

  const deleteAuthor = async (authorId: string) => {
    try {
      await apiRequest("DELETE", `/api/sites/${id}/authors/${authorId}`);
      setAuthors(authors.filter(a => a.id !== authorId));
      queryClient.invalidateQueries({ queryKey: ["/api/sites", id, "authors"] });
      toast({ title: "Author deleted" });
    } catch (error) {
      toast({ title: "Failed to delete author", variant: "destructive" });
    }
  };

  const setAsDefaultAuthor = async (authorId: string) => {
    try {
      const author = authors.find(a => a.id === authorId);
      if (!author) return;
      await apiRequest("PUT", `/api/sites/${id}/authors/${authorId}`, { ...author, isDefault: true });
      setAuthors(authors.map(a => ({ ...a, isDefault: a.id === authorId })));
      queryClient.invalidateQueries({ queryKey: ["/api/sites", id, "authors"] });
      toast({ title: "Default author set" });
    } catch (error) {
      toast({ title: "Failed to set default author", variant: "destructive" });
    }
  };

  // Paywall check helper function
  const checkPaywall = (feature: string, action: () => void) => {
    if (subscriptionOwner && !canCreateContent) {
      setPaywallFeature(feature);
      setShowPaywall(true);
      return;
    }
    action();
  };

  // Navigation items for sidebar
  const navItems: { id: ActiveSection; label: string; description: string; icon: typeof Settings; disabled?: boolean }[] = [
    { id: "general", label: "Site Info", description: "Domain, title, and routing", icon: Settings },
    { id: "business", label: "Business Profile", description: "Brand voice and target audience", icon: Building2 },
    { id: "navigation", label: "Menu & Navigation", description: "Configure your site's menu", icon: Menu },
    { id: "design", label: "Look & Feel", description: "Theme, branding, colors, and typography", icon: Palette },
    { id: "seo", label: "SEO & Meta", description: "Search engine optimization", icon: Search },
    { id: "rss", label: "RSS Imports", description: "Import from external feeds", icon: Rss },
    { id: "api", label: "Public API", description: "API access for developers", icon: Key, disabled: isNewSite },
    { id: "troubleshooting", label: "Tools & Debug", description: "Diagnostics and tools", icon: Wrench, disabled: isNewSite },
  ];

  const handleNavClick = (section: ActiveSection) => {
    if (section === "posts" && id && !isNewSite) {
      setLocation(`/admin/sites/${id}/posts`);
    } else {
      setActiveSection(section);
    }
  };

  if (!isNewSite && siteLoading) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif" }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading site configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif" }}
    >
      <div className="flex">
        {/* macOS-style Sidebar */}
        <motion.aside
          variants={sidebarVariants}
          initial="initial"
          animate="animate"
          className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar backdrop-blur-xl border-r border-border z-40 flex flex-col"
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
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

          {/* Navigation */}
          <div className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-3 mb-4">
              Settings
            </p>
            {navItems.map((item, index) => (
              <motion.button
                key={item.id}
                custom={index}
                variants={navItemVariants}
                initial="initial"
                animate="animate"
                onClick={() => !item.disabled && handleNavClick(item.id)}
                disabled={item.disabled}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-300 ${activeSection === item.id
                  ? "bg-muted text-foreground shadow-sm"
                  : item.disabled
                    ? "opacity-30 cursor-not-allowed text-muted-foreground/70"
                    : "hover:bg-muted/40 text-muted-foreground/80 hover:text-foreground"
                  }`}
                data-testid={`nav-${item.id}`}
              >
                <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                  activeSection === item.id 
                    ? "bg-primary/20 text-primary" 
                    : "bg-muted text-muted-foreground/80"
                }`}>
                  <item.icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 text-left">
                  <span className="block font-medium">{item.label}</span>
                  <span className="block text-[11px] text-muted-foreground/70 leading-tight mt-0.5">{item.description}</span>
                </div>
                {activeSection === item.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </motion.button>
            ))}
          </div>

          {/* Save Button and Site Info at Bottom */}
          <div className="p-4 border-t border-border bg-muted/30 space-y-3">
            <Button 
              onClick={handleSave} 
              size="lg"
              className="w-full gap-2 rounded-xl shadow-lg shadow-primary/20" 
              data-testid="button-save"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
            {!isNewSite && (
              <Button
                variant="ghost"
                onClick={() => setLocation(`/admin/sites/${id}/posts`)}
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Articles
              </Button>
            )}
            {isNewSite && (
              <Button
                variant="ghost"
                onClick={() => setLocation("/admin")}
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sites
              </Button>
            )}
            {!isNewSite && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white card-elevate">
                {site?.favicon ? (
                  <img src={site.favicon} alt="" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {site?.title?.charAt(0).toUpperCase() || "?"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="text-sm font-semibold truncate text-foreground" data-testid="text-site-title">
                    {site?.title || "Loading..."}
                  </h1>
                  <p className="text-xs text-muted-foreground/80 truncate">{site?.domain}</p>
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
                      onClick={() => setLocation(`/admin/sites/${id}/posts`)}
                      data-testid="menu-articles"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Articles
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
            )}
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 ml-72 min-h-screen p-10 bg-background">
          <motion.div
            key={activeSection}
            variants={contentVariants}
            initial="initial"
            animate="animate"
            className="max-w-4xl mx-auto"
          >
            {activeSection === "general" && (
              <GeneralSection
                siteData={siteData}
                setSiteData={setSiteData}
                newDomainAlias={newDomainAlias}
                setNewDomainAlias={setNewDomainAlias}
                addDomainAlias={addDomainAlias}
                removeDomainAlias={removeDomainAlias}
              />
            )}

            {activeSection === "business" && (
              <BusinessSection
                siteData={siteData}
                setSiteData={setSiteData}
              />
            )}

            {activeSection === "navigation" && (
              <NavigationSection
                siteData={siteData}
                setSiteData={setSiteData}
                templateSettings={templateSettings}
                setTemplateSettings={setTemplateSettings}
                menuItems={menuItems}
                newMenuItem={newMenuItem}
                setNewMenuItem={setNewMenuItem}
                addMenuItem={addMenuItem}
                deleteMenuItem={deleteMenuItem}
                moveMenuItem={moveMenuItem}
                removeTagSlugFromNewItem={removeTagSlugFromNewItem}
                tagSelectorOpen={tagSelectorOpen}
                setTagSelectorOpen={setTagSelectorOpen}
                tagSearchQuery={tagSearchQuery}
                setTagSearchQuery={setTagSearchQuery}
                filteredTags={filteredTags}
                canCreateNewTag={canCreateNewTag}
              />
            )}

            {activeSection === "design" && (
              <DesignSection
                siteData={siteData}
                setSiteData={setSiteData}
                templateSettings={templateSettings}
                setTemplateSettings={setTemplateSettings}
              />
            )}

            {activeSection === "seo" && (
              <SeoSection
                siteData={siteData}
                setSiteData={setSiteData}
              />
            )}

            {activeSection === "authors" && (
              <AuthorsSection
                authors={authors}
                newAuthor={newAuthor}
                setNewAuthor={setNewAuthor}
                addAuthor={addAuthor}
                deleteAuthor={deleteAuthor}
                setAsDefaultAuthor={setAsDefaultAuthor}
                generateSlug={generateSlug}
              />
            )}

            {activeSection === "ai" && (
              <AiSection
                aiConfig={aiConfig}
                setAiConfig={setAiConfig}
                newKeyword={newKeyword}
                setNewKeyword={setNewKeyword}
                addKeyword={addKeyword}
                removeKeyword={removeKeyword}
              />
            )}

            {activeSection === "rss" && (
              <RssSection
                rssConfig={rssConfig}
                setRssConfig={setRssConfig}
                newFeedUrl={newFeedUrl}
                setNewFeedUrl={setNewFeedUrl}
                addFeedUrl={addFeedUrl}
                removeFeedUrl={removeFeedUrl}
                pillars={pillars}
              />
            )}

            {activeSection === "topical" && (
              <div className="space-y-6">
                {!isNewSite && id && <TopicalAuthority siteId={id} />}
              </div>
            )}

            {activeSection === "bulk" && (
              <div className="space-y-6">
                {!isNewSite && id && <BulkGeneration siteId={id} />}
              </div>
            )}

            {activeSection === "posts" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <p className="text-muted-foreground">Redirecting to Posts Manager...</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === "api" && !isNewSite && id && (
              <ApiKeysSection siteId={id} />
            )}

            {activeSection === "troubleshooting" && !isNewSite && id && (
              <TroubleshootingSection siteId={id} />
            )}
          </motion.div>
        </main>
      </div>

      {/* Onboarding Modal - shows when site.isOnboarded is false */}
      {site && !site.isOnboarded && !isNewSite && id && (
        <OnboardingModal
          open={!site.isOnboarded}
          onOpenChange={() => {}}
          siteId={id}
          siteName={site.title}
          onComplete={() => setLocation(`/admin/sites/${id}/posts`)}
        />
      )}

      {/* Paywall Modal - shows when user tries to use features without subscription */}
      <PaywallModal 
        open={showPaywall} 
        onOpenChange={setShowPaywall} 
        feature={paywallFeature}
      />
    </div>
  );
}
