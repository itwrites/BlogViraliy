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
import { ArrowLeft, Plus, X, Save, Palette, Search, Type, Layout, Globe, Settings, Menu, ExternalLink, GripVertical, Trash2, Link, Check, ChevronsUpDown, Rss, Sparkles, FileText, BookOpen, Users, Key, Copy, Eye, EyeOff, RefreshCw, AlertTriangle, Building2, Wrench, ImageIcon, Replace, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Site, AiAutomationConfig, RssAutomationConfig, TemplateSettings, SiteMenuItem, SiteAuthor, Pillar } from "@shared/schema";
import { ARTICLE_ROLES, type ArticleRole } from "@shared/pack-definitions";
import { User, UserPlus, Languages } from "lucide-react";
import { defaultTemplateSettings, languageDisplayNames, type ContentLanguage } from "@shared/schema";
import { BulkGeneration } from "@/components/bulk-generation";
import { TopicalAuthority } from "@/components/topical-authority";
import { SetupWizard } from "@/pages/setup-wizard";

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
                Manage API keys for external access to your content
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
              </div>

              <div className="space-y-2">
                <Label>Permissions</Label>
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
                        className="text-destructive hover:text-destructive"
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
        toast({ title: "No posts found with that image" });
      } else {
        toast({ title: `Found ${posts.length} post(s) with that image` });
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
      toast({ title: "Select at least one post", variant: "destructive" });
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
      toast({ title: "Search for posts first", variant: "destructive" });
      return;
    }

    if (matchingPosts.length === 0) {
      toast({ title: "No posts to fix", variant: "destructive" });
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
          description: `Updated ${data.updated} of ${data.total} posts. ${data.failed} failed. Review results below.`,
          variant: "destructive"
        });
        // Do NOT clear the search/posts - let user review what happened
      } else if (data.updated > 0) {
        // Full success
        toast({
          title: "Auto-fix complete",
          description: `Successfully updated all ${data.updated} posts with unique Pexels images`
        });
        // Clear only on full success
        setMatchingPosts([]);
        setSelectedPostIds(new Set());
        setSearchImageUrl("");
      } else {
        toast({
          title: "No posts updated",
          description: "No matching posts found or all updates failed",
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
                    <Label>Matching Posts ({matchingPosts.length})</Label>
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

const cardVariants = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 + i * 0.08,
      duration: 0.4,
      ease: [0.32, 0.72, 0, 1]
    }
  })
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
  const isNewSite = id === "new";

  const [siteData, setSiteData] = useState({
    domain: "",
    domainAliases: [] as string[],
    basePath: "", // Optional path prefix for reverse proxy (e.g., "/blog")
    deploymentMode: "standalone" as "standalone" | "reverse_proxy",
    proxyVisitorHostname: "", // Visitor hostname for reverse_proxy mode
    title: "",
    logoUrl: "",
    logoTargetUrl: "", // Custom URL for logo click (empty = homepage)
    menuMode: "automatic" as "automatic" | "manual",
    siteType: "blog",
    postUrlFormat: "with-prefix" as "with-prefix" | "root",
    displayLanguage: "en" as ContentLanguage,
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

  const [aiConfig, setAiConfig] = useState({
    enabled: false,
    schedule: "1_per_day",
    masterPrompt: "",
    keywords: [] as string[],
    targetLanguage: "en",
  });

  const [rssConfig, setRssConfig] = useState({
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
  const [newMenuItem, setNewMenuItem] = useState({
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
  const [newAuthor, setNewAuthor] = useState({
    name: "",
    slug: "",
    bio: "",
    avatarUrl: "",
    isDefault: false,
  });

  const [activeSection, setActiveSection] = useState<ActiveSection>("general");

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
        displayLanguage: (site.displayLanguage as ContentLanguage) || "en",
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

  // Navigation items for sidebar
  const navItems: { id: ActiveSection; label: string; description: string; icon: typeof Settings; disabled?: boolean }[] = [
    { id: "general", label: "Site Info", description: "Domain, title, and basic settings", icon: Settings },
    { id: "business", label: "Business Profile", description: "Brand voice and target audience", icon: Building2 },
    { id: "navigation", label: "Menu & Navigation", description: "Configure your site's menu", icon: Menu },
    { id: "design", label: "Look & Feel", description: "Theme, colors, and typography", icon: Palette },
    { id: "seo", label: "SEO & Meta", description: "Search engine optimization", icon: Search },
    { id: "authors", label: "Authors & Team", description: "Manage content creators", icon: Users, disabled: isNewSite },
    { id: "ai", label: "AI Writing", description: "Automated content generation", icon: Sparkles },
    { id: "rss", label: "RSS Imports", description: "Import from external feeds", icon: Rss },
    { id: "topical", label: "Topical Authority", description: "Pillar content strategy", icon: BookOpen, disabled: isNewSite },
    { id: "bulk", label: "Bulk Generation", description: "Create multiple posts", icon: FileText, disabled: isNewSite },
    { id: "posts", label: "View Posts", description: "Manage your content", icon: Layout, disabled: isNewSite },
    { id: "api", label: "Public API", description: "API access for developers", icon: Key, disabled: isNewSite },
    { id: "troubleshooting", label: "Tools & Debug", description: "Diagnostics and tools", icon: Wrench, disabled: isNewSite },
  ];

  const handleNavClick = (section: ActiveSection) => {
    if (section === "posts" && id && !isNewSite) {
      setLocation(`/editor/sites/${id}/posts`);
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
          className="fixed left-0 top-0 bottom-0 w-72 bg-black/80 backdrop-blur-2xl border-r border-white/10 z-40 flex flex-col"
        >
          {/* Sidebar Header */}
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/admin/dashboard")}
                className="rounded-xl bg-white/5 border border-white/10"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold truncate text-sm tracking-tight text-white" data-testid="text-page-title">
                  {isNewSite ? "New Site" : site?.title || "Site Config"}
                </h1>
                <p className="text-xs text-white/50 truncate">
                  {isNewSite ? "Create new website" : "Configuration"}
                </p>
              </div>
            </div>

          </div>

          {/* Navigation */}
          <div className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-3 mb-4">
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
                  ? "bg-white/10 text-white shadow-lg shadow-white/5 ring-1 ring-white/20"
                  : item.disabled
                    ? "opacity-30 cursor-not-allowed text-white/40"
                    : "hover-elevate text-white/60 hover:text-white/90"
                  }`}
                data-testid={`nav-${item.id}`}
              >
                <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                  activeSection === item.id 
                    ? "bg-primary/20 text-primary" 
                    : "bg-white/5 text-white/50"
                }`}>
                  <item.icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 text-left">
                  <span className="block font-medium">{item.label}</span>
                  <span className="block text-[11px] text-white/40 leading-tight mt-0.5">{item.description}</span>
                </div>
                {activeSection === item.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </motion.button>
            ))}
          </div>

          {/* Save Button at Bottom */}
          <div className="p-5 border-t border-white/5">
            <Button 
              onClick={handleSave} 
              size="lg"
              className="w-full gap-2 rounded-xl shadow-lg shadow-primary/20" 
              data-testid="button-save"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
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
              <div className="space-y-8">
                <motion.div
                  custom={0}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                >
                  <Card className="rounded-2xl overflow-hidden">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl tracking-tight" data-testid="text-general-title">General Settings</CardTitle>
                      <CardDescription data-testid="text-general-description">Configure the basic information for your website</CardDescription>
                    </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="domain" data-testid="label-domain">Primary Domain</Label>
                        <Input
                          id="domain"
                          data-testid="input-domain"
                          placeholder="example.com"
                          value={siteData.domain}
                          onChange={(e) => setSiteData({ ...siteData, domain: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground" data-testid="text-domain-hint">The main domain this site will respond to</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="title" data-testid="label-title">Site Title</Label>
                        <Input
                          id="title"
                          data-testid="input-title"
                          placeholder="My Awesome Blog"
                          value={siteData.title}
                          onChange={(e) => setSiteData({ ...siteData, title: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="logoUrl" data-testid="label-logo">Logo URL</Label>
                        <Input
                          id="logoUrl"
                          data-testid="input-logo"
                          placeholder="https://example.com/logo.png"
                          value={siteData.logoUrl}
                          onChange={(e) => setSiteData({ ...siteData, logoUrl: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="favicon" data-testid="label-favicon">Favicon URL</Label>
                        <Input
                          id="favicon"
                          data-testid="input-favicon"
                          placeholder="https://example.com/favicon.ico"
                          value={siteData.favicon}
                          onChange={(e) => setSiteData({ ...siteData, favicon: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground" data-testid="text-favicon-hint">Browser tab icon (32x32 or 64x64 recommended)</p>
                      </div>

                      <div className="flex items-center justify-between space-x-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="hideLogoText" data-testid="label-hide-logo-text">Hide Logo Text</Label>
                          <p className="text-xs text-muted-foreground">Only show logo image when present, hide site title</p>
                        </div>
                        <Switch
                          id="hideLogoText"
                          checked={templateSettings.hideLogoText}
                          onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, hideLogoText: checked })}
                          data-testid="switch-hide-logo-text"
                        />
                      </div>

                      <div className="flex items-center justify-between space-x-4">
                        <div className="space-y-0.5">
                          <Label htmlFor="headerLogoInvertColors" data-testid="label-header-logo-invert">Invert Header Logo</Label>
                          <p className="text-xs text-muted-foreground">Invert logo colors for dark header backgrounds</p>
                        </div>
                        <Switch
                          id="headerLogoInvertColors"
                          checked={templateSettings.headerLogoInvertColors}
                          onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, headerLogoInvertColors: checked })}
                          data-testid="switch-header-logo-invert"
                        />
                      </div>

                      <div className="space-y-3 md:col-span-2">
                        <Label data-testid="label-site-type">Theme</Label>
                        <p className="text-xs text-muted-foreground mb-3">Choose a visual theme that best matches your content style</p>
                        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                          {[
                            { value: "blog", label: "Blog", desc: "Editorial, serif fonts, spacious" },
                            { value: "news", label: "News", desc: "Compact, condensed, information-dense" },
                            { value: "forbis", label: "Forbis", desc: "Forbes-style 3-column, business publication" },
                            { value: "magazine", label: "Magazine", desc: "Multi-column grid, TIME-style" },
                            { value: "novapress", label: "NovaPress", desc: "Modern editorial, grid-based, premium magazine" },
                            { value: "portfolio", label: "Portfolio", desc: "Large images, minimal text" },
                            { value: "restaurant", label: "Restaurant", desc: "Food & dining news, warm colors" },
                            { value: "crypto", label: "Crypto", desc: "Data-heavy, tech aesthetic" },
                            { value: "aurora", label: "Aurora", desc: "Dreamy pastel gradients, soft shadows" },
                            { value: "carbon", label: "Carbon", desc: "Bold brutalist, dark mode, sharp edges" },
                            { value: "soho", label: "Soho", desc: "Sophisticated serif, editorial elegance" },
                            { value: "citrine", label: "Citrine", desc: "Warm golden accents, magazine style" },
                            { value: "verve", label: "Verve", desc: "Vibrant creative, high-energy gradients" },
                            { value: "minimal", label: "Minimal", desc: "Ultra-clean, maximum whitespace" },
                            { value: "ocean", label: "Ocean", desc: "Calming blue tones, serene vibes" },
                            { value: "forest", label: "Forest", desc: "Natural green palette, organic feel" },
                          ].map((theme) => (
                            <Card
                              key={theme.value}
                              className={`cursor-pointer transition-all ${siteData.siteType === theme.value
                                ? "ring-2 ring-primary"
                                : "hover-elevate"
                                }`}
                              onClick={() => setSiteData({ ...siteData, siteType: theme.value })}
                              data-testid={`card-theme-${theme.value}`}
                            >
                              <CardContent className="p-4">
                                <div className="aspect-video bg-muted rounded mb-3 flex items-center justify-center">
                                  <div className="text-center">
                                    <div className="text-2xl font-bold text-muted-foreground">{theme.label.substring(0, 1)}</div>
                                  </div>
                                </div>
                                <h4 className="font-semibold text-sm mb-1" data-testid={`text-theme-name-${theme.value}`}>{theme.label}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-theme-desc-${theme.value}`}>{theme.desc}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3 md:col-span-2">
                        <Label data-testid="label-domain-aliases">Domain Aliases</Label>
                        <p className="text-xs text-muted-foreground mb-3">Additional domains that will also serve this site's content</p>
                        <div className="flex gap-2">
                          <Input
                            id="newAlias"
                            data-testid="input-new-alias"
                            placeholder="www.example.com or alias.example.com"
                            value={newDomainAlias}
                            onChange={(e) => setNewDomainAlias(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addDomainAlias();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={addDomainAlias}
                            data-testid="button-add-alias"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2 mt-2">
                          {(siteData.domainAliases || []).map((alias) => (
                            <div
                              key={alias}
                              className="flex items-center justify-between bg-muted px-3 py-2 rounded-md"
                              data-testid={`alias-${alias}`}
                            >
                              <span className="text-sm font-mono truncate flex-1">{alias}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDomainAlias(alias)}
                                data-testid={`button-remove-alias-${alias}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {(!siteData.domainAliases || siteData.domainAliases.length === 0) && (
                            <p className="text-sm text-muted-foreground italic">No domain aliases configured</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 md:col-span-2">
                        <Label htmlFor="basePath" data-testid="label-base-path">Base Path (Optional)</Label>
                        <p className="text-xs text-muted-foreground mb-3">
                          Path prefix for reverse proxy deployments. If you're hosting the blog under a subdirectory
                          (e.g., yoursite.com/blog), enter the path prefix here (e.g., /blog). Leave empty for root deployment.
                        </p>
                        <Input
                          id="basePath"
                          data-testid="input-base-path"
                          placeholder="/blog (optional, leave empty for root)"
                          value={siteData.basePath}
                          onChange={(e) => {
                            let value = e.target.value.trim();
                            // Ensure it starts with / if not empty, and doesn't end with /
                            if (value && !value.startsWith('/')) {
                              value = '/' + value;
                            }
                            if (value.endsWith('/') && value.length > 1) {
                              value = value.slice(0, -1);
                            }
                            setSiteData({ ...siteData, basePath: value });
                          }}
                        />
                        {siteData.basePath && (
                          <p className="text-xs text-muted-foreground">
                            URLs will be prefixed: <span className="font-mono text-primary">{siteData.domain}{siteData.basePath}/post/example-article</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-3 md:col-span-2">
                        <Label data-testid="label-deployment-mode">Deployment Mode</Label>
                        <p className="text-xs text-muted-foreground mb-3">
                          Choose how this site is accessed. Use "Standalone" for direct domain access (e.g., blog.example.com),
                          or "Reverse Proxy" when accessing via a shared deployment domain with visitor hostname identification.
                        </p>
                        <Select
                          value={siteData.deploymentMode}
                          onValueChange={(value: "standalone" | "reverse_proxy") => setSiteData({ ...siteData, deploymentMode: value })}
                        >
                          <SelectTrigger data-testid="select-deployment-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standalone">Standalone (direct domain)</SelectItem>
                            <SelectItem value="reverse_proxy">Reverse Proxy (shared host)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {siteData.deploymentMode === "reverse_proxy" && (
                        <div className="space-y-3 md:col-span-2">
                          <Label htmlFor="proxyVisitorHostname" data-testid="label-proxy-visitor-hostname">Visitor Hostname</Label>
                          <p className="text-xs text-muted-foreground mb-3">
                            The domain visitors use to access this site (e.g., vyfy.co.uk). When requests come through
                            the shared deployment domain with X-BV-Visitor-Host header matching this value, this site will be served.
                          </p>
                          <Input
                            id="proxyVisitorHostname"
                            data-testid="input-proxy-visitor-hostname"
                            placeholder="vyfy.co.uk"
                            value={siteData.proxyVisitorHostname}
                            onChange={(e) => {
                              let value = e.target.value.trim().toLowerCase();
                              // Clean up the hostname (remove protocol, path, port)
                              value = value.replace(/^(https?:)?\/\//, "").split("/")[0].split(":")[0];
                              setSiteData({ ...siteData, proxyVisitorHostname: value });
                            }}
                          />
                          {siteData.proxyVisitorHostname && (
                            <p className="text-xs text-muted-foreground">
                              Nginx config: <span className="font-mono text-primary">proxy_set_header X-BV-Visitor-Host {siteData.proxyVisitorHostname};</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              </div>
            )}

            {activeSection === "business" && (
              <div className="space-y-8">
                <motion.div
                  custom={0}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                >
                <Card className="rounded-2xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl tracking-tight" data-testid="text-business-title">
                      <Building2 className="h-5 w-5" />
                      Business Profile
                    </CardTitle>
                    <CardDescription data-testid="text-business-description">
                      Define your business context to help AI generate more relevant, on-brand content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="businessDescription" data-testid="label-business-description">Business Description</Label>
                        <Textarea
                          id="businessDescription"
                          data-testid="textarea-business-description"
                          placeholder="Describe what your business does, your mission, and what makes you unique..."
                          value={siteData.businessDescription}
                          onChange={(e) => setSiteData({ ...siteData, businessDescription: e.target.value })}
                          rows={4}
                        />
                        <p className="text-xs text-muted-foreground">
                          This context helps AI understand your business and generate content that aligns with your core offerings
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="targetAudience" data-testid="label-target-audience">Target Audience / ICP</Label>
                        <Textarea
                          id="targetAudience"
                          data-testid="textarea-target-audience"
                          placeholder="Describe your ideal customer profile: demographics, pain points, goals, and what they're looking for..."
                          value={siteData.targetAudience}
                          onChange={(e) => setSiteData({ ...siteData, targetAudience: e.target.value })}
                          rows={4}
                        />
                        <p className="text-xs text-muted-foreground">
                          Understanding your audience helps AI craft content that resonates and addresses their specific needs
                        </p>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label data-testid="label-brand-voice">Brand Voice</Label>
                          <Select
                            value={siteData.brandVoice}
                            onValueChange={(value) => setSiteData({ ...siteData, brandVoice: value })}
                          >
                            <SelectTrigger data-testid="select-brand-voice">
                              <SelectValue placeholder="Select a tone..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="casual">Casual</SelectItem>
                              <SelectItem value="authoritative">Authoritative</SelectItem>
                              <SelectItem value="friendly">Friendly</SelectItem>
                              <SelectItem value="technical">Technical</SelectItem>
                              <SelectItem value="conversational">Conversational</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Sets the tone and style for AI-generated content
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="industry" data-testid="label-industry">Industry / Niche</Label>
                          <Input
                            id="industry"
                            data-testid="input-industry"
                            placeholder="e.g., SaaS, E-commerce, Healthcare, Finance..."
                            value={siteData.industry}
                            onChange={(e) => setSiteData({ ...siteData, industry: e.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Helps AI use industry-appropriate terminology and examples
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="valuePropositions" data-testid="label-value-propositions">Value Propositions</Label>
                        <Textarea
                          id="valuePropositions"
                          data-testid="textarea-value-propositions"
                          placeholder="List your key selling points, unique benefits, and competitive advantages..."
                          value={siteData.valuePropositions}
                          onChange={(e) => setSiteData({ ...siteData, valuePropositions: e.target.value })}
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          AI will weave these value props naturally into generated content where appropriate
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="competitors" data-testid="label-competitors">Competitors</Label>
                        <Textarea
                          id="competitors"
                          data-testid="textarea-competitors"
                          placeholder="List your main competitors (one per line or comma-separated)..."
                          value={siteData.competitors}
                          onChange={(e) => setSiteData({ ...siteData, competitors: e.target.value })}
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          Helps AI understand your competitive landscape and differentiate your content
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              </div>
            )}

            {activeSection === "navigation" && (
              <div className="space-y-8">
                <motion.div
                  custom={0}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                >
                <Card className="rounded-2xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl tracking-tight" data-testid="text-navigation-title">
                      <Menu className="h-5 w-5" />
                      Navigation Settings
                    </CardTitle>
                    <CardDescription data-testid="text-navigation-description">
                      Configure your site's navigation menu and logo behavior
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="logoTargetUrl" data-testid="label-logo-target-url">Logo Click URL</Label>
                        <Input
                          id="logoTargetUrl"
                          data-testid="input-logo-target-url"
                          placeholder="https://example.com (leave empty for homepage)"
                          value={siteData.logoTargetUrl}
                          onChange={(e) => setSiteData({ ...siteData, logoTargetUrl: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Where clicking the logo takes users. Leave empty to go to homepage.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label data-testid="label-menu-mode">Navigation Menu Mode</Label>
                        <Select
                          value={siteData.menuMode}
                          onValueChange={(value: "automatic" | "manual") => setSiteData({ ...siteData, menuMode: value })}
                        >
                          <SelectTrigger data-testid="select-menu-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="automatic">Automatic (from tags)</SelectItem>
                            <SelectItem value="manual">Manual (custom menu)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {siteData.menuMode === "automatic"
                            ? "Navigation is auto-generated from your most popular tags"
                            : "Create custom menu items with URLs or tag groups"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label data-testid="label-post-url-format">Post URL Format</Label>
                        <Select
                          value={siteData.postUrlFormat}
                          onValueChange={(value: "with-prefix" | "root") => setSiteData({ ...siteData, postUrlFormat: value })}
                        >
                          <SelectTrigger data-testid="select-post-url-format">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="with-prefix">/post/slug (with prefix)</SelectItem>
                            <SelectItem value="root">/slug (root level)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {siteData.postUrlFormat === "with-prefix"
                            ? "Posts use /post/my-article format"
                            : "Posts use /my-article format (cleaner URLs)"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label data-testid="label-display-language">Display Language</Label>
                        <Select
                          value={siteData.displayLanguage}
                          onValueChange={(value: ContentLanguage) => setSiteData({ ...siteData, displayLanguage: value })}
                        >
                          <SelectTrigger data-testid="select-display-language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(languageDisplayNames).map(([code, name]) => (
                              <SelectItem key={code} value={code}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Language for public site UI elements (Read More, Related Posts, etc.)
                        </p>
                      </div>
                    </div>

                    {siteData.menuMode === "automatic" && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Automatic Menu Settings</h3>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="autoMaxNavItems" data-testid="label-auto-max-nav">
                              Max Menu Items: {templateSettings.maxNavItems}
                            </Label>
                            <Slider
                              id="autoMaxNavItems"
                              min={3}
                              max={10}
                              step={1}
                              value={[templateSettings.maxNavItems]}
                              onValueChange={([value]) => setTemplateSettings({ ...templateSettings, maxNavItems: value })}
                              className="py-2"
                              data-testid="slider-auto-max-nav"
                            />
                            <p className="text-xs text-muted-foreground">
                              Maximum number of tags to show in the navigation menu
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {siteData.menuMode === "manual" && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Menu Items</h3>
                          <span className="text-sm text-muted-foreground">{menuItems.length} items</span>
                        </div>

                        {menuItems.length > 0 && (
                          <div className="space-y-2">
                            {menuItems.map((item, index) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                                data-testid={`menu-item-${item.id}`}
                              >
                                <div className="flex flex-col gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => moveMenuItem(index, "up")}
                                    disabled={index === 0}
                                    data-testid={`button-move-up-${item.id}`}
                                  >
                                    <GripVertical className="h-3 w-3 rotate-90" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => moveMenuItem(index, "down")}
                                    disabled={index === menuItems.length - 1}
                                    data-testid={`button-move-down-${item.id}`}
                                  >
                                    <GripVertical className="h-3 w-3 rotate-90" />
                                  </Button>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate" data-testid={`text-menu-label-${item.id}`}>
                                      {item.label}
                                    </span>
                                    {item.type === "url" && item.openInNewTab && (
                                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {item.type === "url" ? item.href : `Tag group: ${item.groupSlug || "not set"}`}
                                  </p>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteMenuItem(item.id)}
                                  data-testid={`button-delete-${item.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <Card className="border-dashed">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Add Menu Item</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="newMenuLabel">Label</Label>
                                <Input
                                  id="newMenuLabel"
                                  placeholder="Menu item text"
                                  value={newMenuItem.label}
                                  onChange={(e) => setNewMenuItem({ ...newMenuItem, label: e.target.value })}
                                  data-testid="input-new-menu-label"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Type</Label>
                                <Select
                                  value={newMenuItem.type}
                                  onValueChange={(value: "url" | "tag_group") => setNewMenuItem({ ...newMenuItem, type: value })}
                                >
                                  <SelectTrigger data-testid="select-new-menu-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="url">URL Link</SelectItem>
                                    <SelectItem value="tag_group">Tag Group</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {newMenuItem.type === "url" ? (
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor="newMenuHref">URL</Label>
                                  <Input
                                    id="newMenuHref"
                                    placeholder="/about or https://..."
                                    value={newMenuItem.href}
                                    onChange={(e) => setNewMenuItem({ ...newMenuItem, href: e.target.value })}
                                    data-testid="input-new-menu-href"
                                  />
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                  <Switch
                                    id="newMenuNewTab"
                                    checked={newMenuItem.openInNewTab}
                                    onCheckedChange={(checked) => setNewMenuItem({ ...newMenuItem, openInNewTab: checked })}
                                    data-testid="switch-new-menu-new-tab"
                                  />
                                  <Label htmlFor="newMenuNewTab">Open in new tab</Label>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label htmlFor="newMenuGroupSlug">Group URL Slug</Label>
                                    <Input
                                      id="newMenuGroupSlug"
                                      placeholder="tech-news"
                                      value={newMenuItem.groupSlug}
                                      onChange={(e) => setNewMenuItem({ ...newMenuItem, groupSlug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                                      data-testid="input-new-menu-group-slug"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      Creates page at /topics/{newMenuItem.groupSlug || "slug"}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label>Tags in this group</Label>
                                  <Popover open={tagSelectorOpen} onOpenChange={setTagSelectorOpen}>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={tagSelectorOpen}
                                        className="w-full justify-between"
                                        data-testid="button-tag-selector"
                                      >
                                        <span className="text-muted-foreground">
                                          {newMenuItem.tagSlugs.length > 0
                                            ? `${newMenuItem.tagSlugs.length} tag(s) selected`
                                            : "Search and select tags..."}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0" align="start">
                                      <Command shouldFilter={false}>
                                        <CommandInput
                                          placeholder="Search tags or type to create..."
                                          value={tagSearchQuery}
                                          onValueChange={setTagSearchQuery}
                                          data-testid="input-tag-search"
                                        />
                                        <CommandList>
                                          <CommandEmpty>
                                            {tagSearchQuery.trim() ? (
                                              <button
                                                type="button"
                                                className="w-full px-4 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                                                onClick={() => {
                                                  const normalizedTag = tagSearchQuery.toLowerCase().trim().replace(/\s+/g, "-");
                                                  if (normalizedTag && !newMenuItem.tagSlugs.includes(normalizedTag)) {
                                                    setNewMenuItem({ ...newMenuItem, tagSlugs: [...newMenuItem.tagSlugs, normalizedTag] });
                                                    setTagSearchQuery("");
                                                  }
                                                  // Keep popover open for multi-select
                                                  requestAnimationFrame(() => setTagSelectorOpen(true));
                                                }}
                                                data-testid="button-create-new-tag"
                                              >
                                                <Plus className="h-4 w-4" />
                                                Create "{tagSearchQuery.toLowerCase().trim().replace(/\s+/g, "-")}"
                                              </button>
                                            ) : (
                                              <span className="text-muted-foreground">No tags found. Type to create a new one.</span>
                                            )}
                                          </CommandEmpty>
                                          <CommandGroup>
                                            {filteredTags.map((tag) => {
                                              const isSelected = newMenuItem.tagSlugs.includes(tag);
                                              return (
                                                <CommandItem
                                                  key={tag}
                                                  value={tag}
                                                  onSelect={() => {
                                                    if (isSelected) {
                                                      setNewMenuItem({ ...newMenuItem, tagSlugs: newMenuItem.tagSlugs.filter(t => t !== tag) });
                                                    } else {
                                                      setNewMenuItem({ ...newMenuItem, tagSlugs: [...newMenuItem.tagSlugs, tag] });
                                                    }
                                                    // Keep popover open for multi-select
                                                    requestAnimationFrame(() => setTagSelectorOpen(true));
                                                  }}
                                                  data-testid={`option-tag-${tag}`}
                                                >
                                                  <Check className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                                                  {tag}
                                                </CommandItem>
                                              );
                                            })}
                                            {canCreateNewTag && filteredTags.length > 0 && (
                                              <CommandItem
                                                value={`create-${tagSearchQuery}`}
                                                onSelect={() => {
                                                  const normalizedTag = tagSearchQuery.toLowerCase().trim().replace(/\s+/g, "-");
                                                  if (normalizedTag && !newMenuItem.tagSlugs.includes(normalizedTag)) {
                                                    setNewMenuItem({ ...newMenuItem, tagSlugs: [...newMenuItem.tagSlugs, normalizedTag] });
                                                    setTagSearchQuery("");
                                                  }
                                                  // Keep popover open for multi-select
                                                  requestAnimationFrame(() => setTagSelectorOpen(true));
                                                }}
                                                data-testid="option-create-tag"
                                              >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Create "{tagSearchQuery.toLowerCase().trim().replace(/\s+/g, "-")}"
                                              </CommandItem>
                                            )}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                  {newMenuItem.tagSlugs.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {newMenuItem.tagSlugs.map((slug) => (
                                        <Badge
                                          key={slug}
                                          variant="secondary"
                                          className="gap-1"
                                        >
                                          {slug}
                                          <button
                                            type="button"
                                            onClick={() => removeTagSlugFromNewItem(slug)}
                                            className="ml-1 hover:text-destructive"
                                            data-testid={`button-remove-tag-${slug}`}
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            <Button onClick={addMenuItem} disabled={!newMenuItem.label.trim()} data-testid="button-add-menu-item">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Menu Item
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </motion.div>
              </div>
            )}

            {activeSection === "design" && (
              <div className="space-y-8">
                <motion.div
                  custom={0}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                >
                <Card className="rounded-2xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl tracking-tight" data-testid="text-design-title">Template Design Settings</CardTitle>
                    <CardDescription data-testid="text-design-description">Customize the visual appearance of your website</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Colors</h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                          <Label htmlFor="primaryColor" data-testid="label-primary-color">Primary Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="primaryColor"
                              type="color"
                              value={templateSettings.primaryColor}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, primaryColor: e.target.value })}
                              className="w-12 h-9 p-1 cursor-pointer"
                              data-testid="input-primary-color"
                            />
                            <Input
                              value={templateSettings.primaryColor}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, primaryColor: e.target.value })}
                              className="flex-1 font-mono text-sm"
                              data-testid="input-primary-color-hex"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="secondaryColor" data-testid="label-secondary-color">Secondary Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="secondaryColor"
                              type="color"
                              value={templateSettings.secondaryColor}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, secondaryColor: e.target.value })}
                              className="w-12 h-9 p-1 cursor-pointer"
                              data-testid="input-secondary-color"
                            />
                            <Input
                              value={templateSettings.secondaryColor}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, secondaryColor: e.target.value })}
                              className="flex-1 font-mono text-sm"
                              data-testid="input-secondary-color-hex"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="backgroundColor" data-testid="label-background-color">Background Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="backgroundColor"
                              type="color"
                              value={templateSettings.backgroundColor}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, backgroundColor: e.target.value })}
                              className="w-12 h-9 p-1 cursor-pointer"
                              data-testid="input-background-color"
                            />
                            <Input
                              value={templateSettings.backgroundColor}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, backgroundColor: e.target.value })}
                              className="flex-1 font-mono text-sm"
                              data-testid="input-background-color-hex"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="textColor" data-testid="label-text-color">Text Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="textColor"
                              type="color"
                              value={templateSettings.textColor}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, textColor: e.target.value })}
                              className="w-12 h-9 p-1 cursor-pointer"
                              data-testid="input-text-color"
                            />
                            <Input
                              value={templateSettings.textColor}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, textColor: e.target.value })}
                              className="flex-1 font-mono text-sm"
                              data-testid="input-text-color-hex"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="headerBackgroundColor" data-testid="label-header-bg-color">Header Background (optional)</Label>
                          <div className="flex gap-2">
                            <Input
                              id="headerBackgroundColor"
                              type="color"
                              value={templateSettings.headerBackgroundColor || "#ffffff"}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, headerBackgroundColor: e.target.value })}
                              className="w-12 h-9 p-1 cursor-pointer"
                              data-testid="input-header-bg-color"
                            />
                            <Input
                              value={templateSettings.headerBackgroundColor || ""}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, headerBackgroundColor: e.target.value })}
                              placeholder="Leave empty for default"
                              className="flex-1 font-mono text-sm"
                              data-testid="input-header-bg-color-hex"
                            />
                            {templateSettings.headerBackgroundColor && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setTemplateSettings({ ...templateSettings, headerBackgroundColor: "" })}
                                data-testid="button-reset-header-bg-color"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Custom header background color</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="headerTextColor" data-testid="label-header-text-color">Header Text Color (optional)</Label>
                          <div className="flex gap-2">
                            <Input
                              id="headerTextColor"
                              type="color"
                              value={templateSettings.headerTextColor || "#1f2937"}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, headerTextColor: e.target.value })}
                              className="w-12 h-9 p-1 cursor-pointer"
                              data-testid="input-header-text-color"
                            />
                            <Input
                              value={templateSettings.headerTextColor || ""}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, headerTextColor: e.target.value })}
                              placeholder="Leave empty for default"
                              className="flex-1 font-mono text-sm"
                              data-testid="input-header-text-color-hex"
                            />
                            {templateSettings.headerTextColor && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setTemplateSettings({ ...templateSettings, headerTextColor: "" })}
                                data-testid="button-reset-header-text-color"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Custom header text/menu color</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Type className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Typography</h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="headingFont" data-testid="label-heading-font">Heading Font</Label>
                          <Select
                            value={templateSettings.headingFont}
                            onValueChange={(value: "modern" | "classic" | "editorial" | "tech" | "elegant" | "system") =>
                              setTemplateSettings({ ...templateSettings, headingFont: value })
                            }
                          >
                            <SelectTrigger id="headingFont" data-testid="select-heading-font">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="modern">Modern (Inter)</SelectItem>
                              <SelectItem value="classic">Classic (Georgia)</SelectItem>
                              <SelectItem value="editorial">Editorial (Merriweather)</SelectItem>
                              <SelectItem value="tech">Tech (JetBrains Mono)</SelectItem>
                              <SelectItem value="elegant">Elegant (Playfair Display)</SelectItem>
                              <SelectItem value="system">System (Native UI)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bodyFont" data-testid="label-body-font">Body Font</Label>
                          <Select
                            value={templateSettings.bodyFont}
                            onValueChange={(value: "modern" | "classic" | "editorial" | "tech" | "elegant" | "system") =>
                              setTemplateSettings({ ...templateSettings, bodyFont: value })
                            }
                          >
                            <SelectTrigger id="bodyFont" data-testid="select-body-font">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="modern">Modern (Inter)</SelectItem>
                              <SelectItem value="classic">Classic (Georgia)</SelectItem>
                              <SelectItem value="editorial">Editorial (Source Serif)</SelectItem>
                              <SelectItem value="tech">Tech (IBM Plex Sans)</SelectItem>
                              <SelectItem value="elegant">Elegant (Lora)</SelectItem>
                              <SelectItem value="system">System (Native UI)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fontScale" data-testid="label-font-scale">Font Size Scale</Label>
                          <Select
                            value={templateSettings.fontScale}
                            onValueChange={(value: "compact" | "normal" | "spacious") =>
                              setTemplateSettings({ ...templateSettings, fontScale: value })
                            }
                          >
                            <SelectTrigger id="fontScale" data-testid="select-font-scale">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="compact">Compact</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="spacious">Spacious</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Layout className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Layout & Style</h3>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                          <Label htmlFor="logoSize" data-testid="label-logo-size">Logo Size</Label>
                          <Select
                            value={templateSettings.logoSize}
                            onValueChange={(value: "small" | "medium" | "large" | "custom") =>
                              setTemplateSettings({ ...templateSettings, logoSize: value })
                            }
                          >
                            <SelectTrigger id="logoSize" data-testid="select-logo-size">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small">Small (32px)</SelectItem>
                              <SelectItem value="medium">Medium (48px)</SelectItem>
                              <SelectItem value="large">Large (56px)</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          {templateSettings.logoSize === "custom" && (
                            <div className="flex items-center gap-2 mt-2">
                              <Input
                                type="number"
                                min={20}
                                max={200}
                                value={templateSettings.logoSizeCustom || 48}
                                onChange={(e) => setTemplateSettings({
                                  ...templateSettings,
                                  logoSizeCustom: parseInt(e.target.value) || 48
                                })}
                                className="w-20"
                                data-testid="input-logo-size-custom"
                              />
                              <span className="text-sm text-muted-foreground">px</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="headerStyle" data-testid="label-header-style">Header Style</Label>
                          <Select
                            value={templateSettings.headerStyle}
                            onValueChange={(value: "minimal" | "standard" | "full") =>
                              setTemplateSettings({ ...templateSettings, headerStyle: value })
                            }
                          >
                            <SelectTrigger id="headerStyle" data-testid="select-header-style">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minimal">Minimal</SelectItem>
                              <SelectItem value="standard">Standard</SelectItem>
                              <SelectItem value="full">Full</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cardStyle" data-testid="label-card-style">Card Style</Label>
                          <Select
                            value={templateSettings.cardStyle}
                            onValueChange={(value: "rounded" | "sharp" | "borderless") =>
                              setTemplateSettings({ ...templateSettings, cardStyle: value })
                            }
                          >
                            <SelectTrigger id="cardStyle" data-testid="select-card-style">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rounded">Rounded</SelectItem>
                              <SelectItem value="sharp">Sharp</SelectItem>
                              <SelectItem value="borderless">Borderless</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contentWidth" data-testid="label-content-width">Content Width</Label>
                          <Select
                            value={templateSettings.contentWidth}
                            onValueChange={(value: "narrow" | "medium" | "wide") =>
                              setTemplateSettings({ ...templateSettings, contentWidth: value })
                            }
                          >
                            <SelectTrigger id="contentWidth" data-testid="select-content-width">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="narrow">Narrow (768px)</SelectItem>
                              <SelectItem value="medium">Medium (1024px)</SelectItem>
                              <SelectItem value="wide">Wide (1280px)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3 pt-4">
                        <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                          <Label htmlFor="showFeaturedHero" className="cursor-pointer" data-testid="label-show-hero">Show Featured Hero</Label>
                          <Switch
                            id="showFeaturedHero"
                            checked={templateSettings.showFeaturedHero}
                            onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, showFeaturedHero: checked })}
                            data-testid="switch-show-hero"
                          />
                        </div>
                        <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                          <Label htmlFor="showSearch" className="cursor-pointer" data-testid="label-show-search">Show Search</Label>
                          <Switch
                            id="showSearch"
                            checked={templateSettings.showSearch}
                            onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, showSearch: checked })}
                            data-testid="switch-show-search"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="maxNavItems" data-testid="label-max-nav">Max Nav Items: {templateSettings.maxNavItems}</Label>
                          <Slider
                            id="maxNavItems"
                            min={3}
                            max={10}
                            step={1}
                            value={[templateSettings.maxNavItems]}
                            onValueChange={([value]) => setTemplateSettings({ ...templateSettings, maxNavItems: value })}
                            className="py-2"
                            data-testid="slider-max-nav"
                          />
                        </div>
                      </div>
                      <div className="pt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="menuActiveStyle" data-testid="label-menu-style">Menu Selected Style</Label>
                          <Select
                            value={templateSettings.menuActiveStyle || "underline"}
                            onValueChange={(value: "underline" | "background" | "pill" | "bold") => setTemplateSettings({ ...templateSettings, menuActiveStyle: value })}
                          >
                            <SelectTrigger id="menuActiveStyle" data-testid="select-menu-style">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="underline">Underline (thick line below)</SelectItem>
                              <SelectItem value="background">Background Highlight</SelectItem>
                              <SelectItem value="pill">Pill (filled rounded)</SelectItem>
                              <SelectItem value="bold">Bold Text</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Choose how selected menu items appear</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="menuSpacing" data-testid="label-menu-spacing">Menu Spacing</Label>
                          <Select
                            value={templateSettings.menuSpacing || "normal"}
                            onValueChange={(value: "compact" | "normal" | "relaxed" | "spacious") => setTemplateSettings({ ...templateSettings, menuSpacing: value })}
                          >
                            <SelectTrigger id="menuSpacing" data-testid="select-menu-spacing">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="compact">Compact</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="relaxed">Relaxed</SelectItem>
                              <SelectItem value="spacious">Spacious</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Adjust spacing between menu items</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                        <div>
                          <Label htmlFor="showMenuIcons" className="cursor-pointer" data-testid="label-show-menu-icons">Show Menu Icons</Label>
                          <p className="text-xs text-muted-foreground">Display home icon in navigation menu</p>
                        </div>
                        <Switch
                          id="showMenuIcons"
                          checked={templateSettings.showMenuIcons !== false}
                          onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, showMenuIcons: checked })}
                          data-testid="switch-show-menu-icons"
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="postCardStyle" data-testid="label-post-card-style">Post Card Design</Label>
                          <Select
                            value={templateSettings.postCardStyle || "standard"}
                            onValueChange={(value: "standard" | "editorial" | "minimal" | "overlay" | "compact" | "featured" | "glass" | "gradient") => setTemplateSettings({ ...templateSettings, postCardStyle: value })}
                          >
                            <SelectTrigger id="postCardStyle" data-testid="select-post-card-style">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">Standard (classic grid cards)</SelectItem>
                              <SelectItem value="editorial">Editorial (split magazine style)</SelectItem>
                              <SelectItem value="minimal">Minimal (list with thumbnails)</SelectItem>
                              <SelectItem value="compact">Compact (small thumbnail list)</SelectItem>
                              <SelectItem value="featured">Featured (wide hero-style cards)</SelectItem>
                              <SelectItem value="glass">Glass (frosted glassmorphism effect)</SelectItem>
                              <SelectItem value="gradient">Gradient (bold gradient backgrounds)</SelectItem>
                              <SelectItem value="overlay">Overlay (text over image)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Choose the visual style for post cards</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cursorStyle" data-testid="label-cursor-style">Custom Cursor</Label>
                          <Select
                            value={templateSettings.cursorStyle || "default"}
                            onValueChange={(value: "default" | "pointer-dot" | "crosshair" | "spotlight" | "trail") => setTemplateSettings({ ...templateSettings, cursorStyle: value })}
                          >
                            <SelectTrigger id="cursorStyle" data-testid="select-cursor-style">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Default (browser cursor)</SelectItem>
                              <SelectItem value="pointer-dot">Pointer Dot (animated dot)</SelectItem>
                              <SelectItem value="crosshair">Crosshair (precision style)</SelectItem>
                              <SelectItem value="spotlight">Spotlight (glow effect)</SelectItem>
                              <SelectItem value="trail">Trail (following particles)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Add animated cursor effects to your site</p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-4">
                        <Label htmlFor="postsPerPage" data-testid="label-posts-per-page">Posts Per Page: {templateSettings.postsPerPage || 12}</Label>
                        <Slider
                          id="postsPerPage"
                          min={6}
                          max={30}
                          step={3}
                          value={[templateSettings.postsPerPage || 12]}
                          onValueChange={([value]) => setTemplateSettings({ ...templateSettings, postsPerPage: value })}
                          className="py-2"
                          data-testid="slider-posts-per-page"
                        />
                        <p className="text-xs text-muted-foreground">Number of posts to show per page before pagination</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Footer & Social Links</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="footerColorMode" data-testid="label-footer-color-mode">Footer Color Mode</Label>
                          <Select
                            value={templateSettings.footerColorMode || "custom"}
                            onValueChange={(value: "custom" | "primary" | "secondary" | "dark" | "light") => setTemplateSettings({ ...templateSettings, footerColorMode: value })}
                          >
                            <SelectTrigger id="footerColorMode" data-testid="select-footer-color-mode">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="custom">Custom Colors (use colors below)</SelectItem>
                              <SelectItem value="primary">Match Theme Primary</SelectItem>
                              <SelectItem value="secondary">Match Theme Secondary</SelectItem>
                              <SelectItem value="dark">Dark (slate/charcoal)</SelectItem>
                              <SelectItem value="light">Light (white/gray)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Choose how footer colors are determined</p>
                        </div>

                        {templateSettings.footerColorMode === "custom" && (
                          <div className="space-y-4 p-4 border border-border/50 rounded-lg bg-muted/30">
                            <h4 className="text-sm font-medium text-muted-foreground">Custom Footer Colors</h4>
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <Label htmlFor="footerBackgroundColor" data-testid="label-footer-bg-color">Background Color</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="footerBackgroundColor"
                                    type="color"
                                    value={templateSettings.footerBackgroundColor || "#1f2937"}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, footerBackgroundColor: e.target.value })}
                                    className="w-12 h-9 p-1 cursor-pointer"
                                    data-testid="input-footer-bg-color"
                                  />
                                  <Input
                                    value={templateSettings.footerBackgroundColor || "#1f2937"}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, footerBackgroundColor: e.target.value })}
                                    className="flex-1 font-mono text-sm"
                                    data-testid="input-footer-bg-hex"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="footerTextColor" data-testid="label-footer-text-color">Text Color</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="footerTextColor"
                                    type="color"
                                    value={templateSettings.footerTextColor || "#9ca3af"}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, footerTextColor: e.target.value })}
                                    className="w-12 h-9 p-1 cursor-pointer"
                                    data-testid="input-footer-text-color"
                                  />
                                  <Input
                                    value={templateSettings.footerTextColor || "#9ca3af"}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, footerTextColor: e.target.value })}
                                    className="flex-1 font-mono text-sm"
                                    data-testid="input-footer-text-hex"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="footerLinkColor" data-testid="label-footer-link-color">Link Color</Label>
                                <div className="flex gap-2">
                                  <Input
                                    id="footerLinkColor"
                                    type="color"
                                    value={templateSettings.footerLinkColor || "#ffffff"}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, footerLinkColor: e.target.value })}
                                    className="w-12 h-9 p-1 cursor-pointer"
                                    data-testid="input-footer-link-color"
                                  />
                                  <Input
                                    value={templateSettings.footerLinkColor || "#ffffff"}
                                    onChange={(e) => setTemplateSettings({ ...templateSettings, footerLinkColor: e.target.value })}
                                    className="flex-1 font-mono text-sm"
                                    data-testid="input-footer-link-hex"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="footerText" data-testid="label-footer-text">Footer Text</Label>
                          <Input
                            id="footerText"
                            placeholder="© 2025 Your Company. All rights reserved."
                            value={templateSettings.footerText}
                            onChange={(e) => setTemplateSettings({ ...templateSettings, footerText: e.target.value })}
                            data-testid="input-footer-text"
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-2">
                            <Label htmlFor="socialTwitter" data-testid="label-twitter">Twitter / X URL</Label>
                            <Input
                              id="socialTwitter"
                              placeholder="https://twitter.com/yourhandle"
                              value={templateSettings.socialTwitter}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, socialTwitter: e.target.value })}
                              data-testid="input-twitter"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="socialFacebook" data-testid="label-facebook">Facebook URL</Label>
                            <Input
                              id="socialFacebook"
                              placeholder="https://facebook.com/yourpage"
                              value={templateSettings.socialFacebook}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, socialFacebook: e.target.value })}
                              data-testid="input-facebook"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="socialInstagram" data-testid="label-instagram">Instagram URL</Label>
                            <Input
                              id="socialInstagram"
                              placeholder="https://instagram.com/yourhandle"
                              value={templateSettings.socialInstagram}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, socialInstagram: e.target.value })}
                              data-testid="input-instagram"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="socialLinkedin" data-testid="label-linkedin">LinkedIn URL</Label>
                            <Input
                              id="socialLinkedin"
                              placeholder="https://linkedin.com/company/yourcompany"
                              value={templateSettings.socialLinkedin}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, socialLinkedin: e.target.value })}
                              data-testid="input-linkedin"
                            />
                          </div>
                        </div>

                        <div className="pt-4 border-t space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground">Footer Logo Options</h4>
                          <div className="space-y-2">
                            <Label htmlFor="footerLogoUrl" data-testid="label-footer-logo-url">Custom Footer Logo URL</Label>
                            <Input
                              id="footerLogoUrl"
                              placeholder="Leave empty to use site logo"
                              value={templateSettings.footerLogoUrl || ""}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, footerLogoUrl: e.target.value })}
                              data-testid="input-footer-logo-url"
                            />
                            <p className="text-xs text-muted-foreground">Use a different logo in the footer (e.g., white version for dark backgrounds)</p>
                          </div>
                          <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                            <div>
                              <Label htmlFor="footerLogoInvertColors" className="cursor-pointer" data-testid="label-footer-logo-invert">Invert Logo Colors</Label>
                              <p className="text-xs text-muted-foreground">Flip logo colors for better visibility on dark footer backgrounds</p>
                            </div>
                            <Switch
                              id="footerLogoInvertColors"
                              checked={templateSettings.footerLogoInvertColors || false}
                              onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, footerLogoInvertColors: checked })}
                              data-testid="switch-footer-logo-invert"
                            />
                          </div>
                          <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                            <div>
                              <Label htmlFor="footerHideSiteName" className="cursor-pointer" data-testid="label-footer-hide-site-name">Hide Site Name</Label>
                              <p className="text-xs text-muted-foreground">Hide the site name text in footer (useful when logo is sufficient)</p>
                            </div>
                            <Switch
                              id="footerHideSiteName"
                              checked={templateSettings.footerHideSiteName || false}
                              onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, footerHideSiteName: checked })}
                              data-testid="switch-footer-hide-site-name"
                            />
                          </div>
                          <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                            <div>
                              <Label htmlFor="footerShowPoweredBy" className="cursor-pointer" data-testid="label-footer-powered-by">Show "Powered by Blog Virality"</Label>
                              <p className="text-xs text-muted-foreground">Display attribution text in the footer</p>
                            </div>
                            <Switch
                              id="footerShowPoweredBy"
                              checked={templateSettings.footerShowPoweredBy !== false}
                              onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, footerShowPoweredBy: checked })}
                              data-testid="switch-footer-powered-by"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Top Announcement Banner</h3>
                      </div>
                      <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                        <div>
                          <Label htmlFor="topBannerEnabled" className="cursor-pointer" data-testid="label-top-banner-enabled">Enable Top Banner</Label>
                          <p className="text-xs text-muted-foreground">Display an announcement banner at the top of your site</p>
                        </div>
                        <Switch
                          id="topBannerEnabled"
                          checked={templateSettings.topBannerEnabled || false}
                          onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, topBannerEnabled: checked })}
                          data-testid="switch-top-banner-enabled"
                        />
                      </div>
                      {templateSettings.topBannerEnabled && (
                        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                          <div className="space-y-2">
                            <Label htmlFor="topBannerMessage" data-testid="label-top-banner-message">Banner Message</Label>
                            <Input
                              id="topBannerMessage"
                              placeholder="🎉 Check out our latest updates!"
                              value={templateSettings.topBannerMessage || ""}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, topBannerMessage: e.target.value })}
                              data-testid="input-top-banner-message"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="topBannerLink" data-testid="label-top-banner-link">Banner Link (optional)</Label>
                            <Input
                              id="topBannerLink"
                              placeholder="https://example.com/promo"
                              value={templateSettings.topBannerLink || ""}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, topBannerLink: e.target.value })}
                              data-testid="input-top-banner-link"
                            />
                            <p className="text-xs text-muted-foreground">Makes the banner clickable</p>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="topBannerBackgroundColor" data-testid="label-top-banner-bg">Background Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="topBannerBackgroundColor"
                                  type="color"
                                  value={templateSettings.topBannerBackgroundColor || "#3b82f6"}
                                  onChange={(e) => setTemplateSettings({ ...templateSettings, topBannerBackgroundColor: e.target.value })}
                                  className="w-12 h-9 p-1 cursor-pointer"
                                  data-testid="input-top-banner-bg-color"
                                />
                                <Input
                                  value={templateSettings.topBannerBackgroundColor || "#3b82f6"}
                                  onChange={(e) => setTemplateSettings({ ...templateSettings, topBannerBackgroundColor: e.target.value })}
                                  className="flex-1 font-mono text-sm"
                                  data-testid="input-top-banner-bg-hex"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="topBannerTextColor" data-testid="label-top-banner-text">Text Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="topBannerTextColor"
                                  type="color"
                                  value={templateSettings.topBannerTextColor || "#ffffff"}
                                  onChange={(e) => setTemplateSettings({ ...templateSettings, topBannerTextColor: e.target.value })}
                                  className="w-12 h-9 p-1 cursor-pointer"
                                  data-testid="input-top-banner-text-color"
                                />
                                <Input
                                  value={templateSettings.topBannerTextColor || "#ffffff"}
                                  onChange={(e) => setTemplateSettings({ ...templateSettings, topBannerTextColor: e.target.value })}
                                  className="flex-1 font-mono text-sm"
                                  data-testid="input-top-banner-text-hex"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between space-x-2 bg-muted/30 p-3 rounded-lg">
                            <Label htmlFor="topBannerDismissible" className="cursor-pointer" data-testid="label-top-banner-dismissible">Allow visitors to dismiss</Label>
                            <Switch
                              id="topBannerDismissible"
                              checked={templateSettings.topBannerDismissible !== false}
                              onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, topBannerDismissible: checked })}
                              data-testid="switch-top-banner-dismissible"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">GDPR Cookie Consent</h3>
                      </div>
                      <div className="flex items-center justify-between space-x-2 bg-muted/50 p-3 rounded-lg">
                        <div>
                          <Label htmlFor="gdprBannerEnabled" className="cursor-pointer" data-testid="label-gdpr-enabled">Enable GDPR Banner</Label>
                          <p className="text-xs text-muted-foreground">Show cookie consent banner for GDPR compliance (controls Google Analytics)</p>
                        </div>
                        <Switch
                          id="gdprBannerEnabled"
                          checked={templateSettings.gdprBannerEnabled || false}
                          onCheckedChange={(checked) => setTemplateSettings({ ...templateSettings, gdprBannerEnabled: checked })}
                          data-testid="switch-gdpr-enabled"
                        />
                      </div>
                      {templateSettings.gdprBannerEnabled && (
                        <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                          <div className="space-y-2">
                            <Label htmlFor="gdprBannerMessage" data-testid="label-gdpr-message">Consent Message</Label>
                            <Textarea
                              id="gdprBannerMessage"
                              placeholder="We use cookies to improve your experience..."
                              value={templateSettings.gdprBannerMessage || ""}
                              onChange={(e) => setTemplateSettings({ ...templateSettings, gdprBannerMessage: e.target.value })}
                              rows={2}
                              data-testid="input-gdpr-message"
                            />
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="gdprBannerButtonText" data-testid="label-gdpr-accept">Accept Button Text</Label>
                              <Input
                                id="gdprBannerButtonText"
                                placeholder="Accept"
                                value={templateSettings.gdprBannerButtonText || "Accept"}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, gdprBannerButtonText: e.target.value })}
                                data-testid="input-gdpr-accept"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="gdprBannerDeclineText" data-testid="label-gdpr-decline">Decline Button Text</Label>
                              <Input
                                id="gdprBannerDeclineText"
                                placeholder="Decline"
                                value={templateSettings.gdprBannerDeclineText || "Decline"}
                                onChange={(e) => setTemplateSettings({ ...templateSettings, gdprBannerDeclineText: e.target.value })}
                                data-testid="input-gdpr-decline"
                              />
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="gdprBannerBackgroundColor" data-testid="label-gdpr-bg">Background Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="gdprBannerBackgroundColor"
                                  type="color"
                                  value={templateSettings.gdprBannerBackgroundColor || "#1f2937"}
                                  onChange={(e) => setTemplateSettings({ ...templateSettings, gdprBannerBackgroundColor: e.target.value })}
                                  className="w-12 h-9 p-1 cursor-pointer"
                                  data-testid="input-gdpr-bg-color"
                                />
                                <Input
                                  value={templateSettings.gdprBannerBackgroundColor || "#1f2937"}
                                  onChange={(e) => setTemplateSettings({ ...templateSettings, gdprBannerBackgroundColor: e.target.value })}
                                  className="flex-1 font-mono text-sm"
                                  data-testid="input-gdpr-bg-hex"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="gdprBannerTextColor" data-testid="label-gdpr-text">Text Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="gdprBannerTextColor"
                                  type="color"
                                  value={templateSettings.gdprBannerTextColor || "#ffffff"}
                                  onChange={(e) => setTemplateSettings({ ...templateSettings, gdprBannerTextColor: e.target.value })}
                                  className="w-12 h-9 p-1 cursor-pointer"
                                  data-testid="input-gdpr-text-color"
                                />
                                <Input
                                  value={templateSettings.gdprBannerTextColor || "#ffffff"}
                                  onChange={(e) => setTemplateSettings({ ...templateSettings, gdprBannerTextColor: e.target.value })}
                                  className="flex-1 font-mono text-sm"
                                  data-testid="input-gdpr-text-hex"
                                />
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                            When enabled, Google Analytics will only load after visitors accept cookies. Make sure to add your Analytics ID in the SEO tab.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              </div>
            )}

            {activeSection === "seo" && (
              <div className="space-y-8">
                <motion.div
                  custom={0}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                >
                <Card className="rounded-2xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl tracking-tight" data-testid="text-seo-title">SEO Settings</CardTitle>
                    <CardDescription data-testid="text-seo-description">Configure search engine optimization for better visibility</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="metaTitle" data-testid="label-meta-title">Meta Title</Label>
                        <Input
                          id="metaTitle"
                          placeholder="Your Site Title | Brand Name"
                          value={siteData.metaTitle}
                          onChange={(e) => setSiteData({ ...siteData, metaTitle: e.target.value })}
                          data-testid="input-meta-title"
                        />
                        <p className="text-xs text-muted-foreground">The title that appears in search results and browser tabs (50-60 characters recommended)</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="metaDescription" data-testid="label-meta-description">Meta Description</Label>
                        <Textarea
                          id="metaDescription"
                          placeholder="A compelling description of your website that appears in search results..."
                          value={siteData.metaDescription}
                          onChange={(e) => setSiteData({ ...siteData, metaDescription: e.target.value })}
                          rows={3}
                          data-testid="input-meta-description"
                        />
                        <p className="text-xs text-muted-foreground">Description shown in search results (150-160 characters recommended)</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="ogImage" data-testid="label-og-image">Social Share Image (OG Image)</Label>
                          <Input
                            id="ogImage"
                            placeholder="https://example.com/og-image.jpg"
                            value={siteData.ogImage}
                            onChange={(e) => setSiteData({ ...siteData, ogImage: e.target.value })}
                            data-testid="input-og-image"
                          />
                          <p className="text-xs text-muted-foreground">Image shown when shared on social media (1200x630px recommended)</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="favicon" data-testid="label-favicon">Favicon URL</Label>
                          <Input
                            id="favicon"
                            placeholder="https://example.com/favicon.ico"
                            value={siteData.favicon}
                            onChange={(e) => setSiteData({ ...siteData, favicon: e.target.value })}
                            data-testid="input-favicon"
                          />
                          <p className="text-xs text-muted-foreground">Small icon shown in browser tabs (32x32px recommended)</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="analyticsId" data-testid="label-analytics">Google Analytics ID</Label>
                        <Input
                          id="analyticsId"
                          placeholder="G-XXXXXXXXXX or UA-XXXXXX-X"
                          value={siteData.analyticsId}
                          onChange={(e) => setSiteData({ ...siteData, analyticsId: e.target.value })}
                          data-testid="input-analytics"
                        />
                        <p className="text-xs text-muted-foreground">Your Google Analytics tracking ID for visitor analytics</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              </div>
            )}

            {activeSection === "authors" && (
              <div className="space-y-8">
                <motion.div
                  custom={0}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                >
                <Card className="rounded-2xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl tracking-tight" data-testid="text-authors-title">
                      <User className="w-5 h-5" />
                      Content Authors
                    </CardTitle>
                    <CardDescription data-testid="text-authors-description">
                      Create and manage authors for your posts. The default author will be used for AI-generated and RSS-imported content.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Add New Author</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="authorName">Author Name</Label>
                          <Input
                            id="authorName"
                            placeholder="e.g., Forbes Staff"
                            value={newAuthor.name}
                            onChange={(e) => {
                              const name = e.target.value;
                              setNewAuthor({
                                ...newAuthor,
                                name,
                                slug: newAuthor.slug || generateSlug(name)
                              });
                            }}
                            data-testid="input-author-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="authorSlug">URL Slug</Label>
                          <Input
                            id="authorSlug"
                            placeholder="e.g., forbes-staff"
                            value={newAuthor.slug}
                            onChange={(e) => setNewAuthor({ ...newAuthor, slug: e.target.value })}
                            data-testid="input-author-slug"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="authorBio">Bio (optional)</Label>
                          <Textarea
                            id="authorBio"
                            placeholder="Brief author biography..."
                            value={newAuthor.bio}
                            onChange={(e) => setNewAuthor({ ...newAuthor, bio: e.target.value })}
                            rows={2}
                            data-testid="input-author-bio"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="authorAvatar">Avatar URL (optional)</Label>
                          <Input
                            id="authorAvatar"
                            placeholder="https://example.com/avatar.jpg"
                            value={newAuthor.avatarUrl}
                            onChange={(e) => setNewAuthor({ ...newAuthor, avatarUrl: e.target.value })}
                            data-testid="input-author-avatar"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <Switch
                            id="authorDefault"
                            checked={newAuthor.isDefault}
                            onCheckedChange={(checked) => setNewAuthor({ ...newAuthor, isDefault: checked })}
                          />
                          <Label htmlFor="authorDefault">Set as default author</Label>
                        </div>
                      </div>
                      <Button onClick={addAuthor} className="gap-2" data-testid="button-add-author">
                        <UserPlus className="w-4 h-4" />
                        Add Author
                      </Button>
                    </div>

                    {authors.length > 0 && (
                      <div className="space-y-4 pt-4 border-t">
                        <h4 className="font-medium">Existing Authors</h4>
                        <div className="space-y-3">
                          {authors.map((author) => (
                            <motion.div
                              key={author.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                              data-testid={`author-card-${author.id}`}
                            >
                              <div className="flex items-center gap-3">
                                {author.avatarUrl ? (
                                  <img
                                    src={author.avatarUrl}
                                    alt={author.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                    <User className="w-5 h-5 text-primary" />
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{author.name}</span>
                                    {author.isDefault && (
                                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-sm text-muted-foreground">/{author.slug}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!author.isDefault && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAsDefaultAuthor(author.id)}
                                    data-testid={`button-set-default-${author.id}`}
                                  >
                                    Set Default
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteAuthor(author.id)}
                                  data-testid={`button-delete-author-${author.id}`}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                </motion.div>
              </div>
            )}

            {activeSection === "ai" && (
              <div className="space-y-8">
                <motion.div
                  custom={0}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                >
                <Card className="rounded-2xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl tracking-tight" data-testid="text-ai-title">AI-Driven Content Generation</CardTitle>
                        <CardDescription data-testid="text-ai-description">Automatically generate posts using AI</CardDescription>
                      </div>
                      <Switch
                        checked={aiConfig.enabled}
                        onCheckedChange={(checked) => setAiConfig({ ...aiConfig, enabled: checked })}
                        data-testid="switch-ai-enabled"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="aiSchedule" data-testid="label-ai-schedule">Posting Frequency</Label>
                        <Select
                          value={aiConfig.schedule}
                          onValueChange={(value) => setAiConfig({ ...aiConfig, schedule: value })}
                          disabled={!aiConfig.enabled}
                        >
                          <SelectTrigger id="aiSchedule" data-testid="select-ai-schedule">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1_per_day">1 post per day</SelectItem>
                            <SelectItem value="3_per_day">3 posts per day</SelectItem>
                            <SelectItem value="1_per_week">1 post per week</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="aiLanguage" data-testid="label-ai-language">
                          <span className="flex items-center gap-2">
                            <Languages className="h-4 w-4" />
                            Content Language
                          </span>
                        </Label>
                        <Select
                          value={aiConfig.targetLanguage}
                          onValueChange={(value) => setAiConfig({ ...aiConfig, targetLanguage: value })}
                          disabled={!aiConfig.enabled}
                        >
                          <SelectTrigger id="aiLanguage" data-testid="select-ai-language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(languageDisplayNames).map(([code, name]) => (
                              <SelectItem key={code} value={code}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">AI will write all posts in this language</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="aiPostStatus" data-testid="label-ai-post-status">Post Status</Label>
                        <Select
                          value={(aiConfig as any).defaultPostStatus || "published"}
                          onValueChange={(value) => setAiConfig({ ...aiConfig, defaultPostStatus: value } as any)}
                          disabled={!aiConfig.enabled}
                        >
                          <SelectTrigger id="aiPostStatus" data-testid="select-ai-post-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Create posts as published or draft</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="masterPrompt" data-testid="label-master-prompt">Master Prompt</Label>
                      <Textarea
                        id="masterPrompt"
                        data-testid="textarea-master-prompt"
                        placeholder="You are an expert food critic for budget restaurants. Write in a witty, informal tone..."
                        value={aiConfig.masterPrompt}
                        onChange={(e) => setAiConfig({ ...aiConfig, masterPrompt: e.target.value })}
                        disabled={!aiConfig.enabled}
                        rows={6}
                      />
                      <p className="text-xs text-muted-foreground">Define the AI's writing style and expertise</p>
                    </div>

                    <div className="space-y-2">
                      <Label data-testid="label-keywords">Keywords / Topics</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter a keyword"
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                          disabled={!aiConfig.enabled}
                          data-testid="input-keyword"
                        />
                        <Button
                          onClick={addKeyword}
                          disabled={!aiConfig.enabled}
                          data-testid="button-add-keyword"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {aiConfig.keywords.map((keyword) => (
                          <div
                            key={keyword}
                            className="flex items-center gap-1 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm"
                            data-testid={`keyword-${keyword}`}
                          >
                            <span>{keyword}</span>
                            <button
                              onClick={() => removeKeyword(keyword)}
                              className="hover-elevate rounded-full"
                              data-testid={`button-remove-keyword-${keyword}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">AI will cycle through these topics when generating posts</p>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              </div>
            )}

            {activeSection === "rss" && (
              <div className="space-y-8">
                <motion.div
                  custom={0}
                  variants={cardVariants}
                  initial="initial"
                  animate="animate"
                >
                <Card className="rounded-2xl overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>RSS Feed Rewriter</CardTitle>
                        <CardDescription>Automatically fetch and rewrite articles from RSS feeds</CardDescription>
                      </div>
                      <Switch
                        checked={rssConfig.enabled}
                        onCheckedChange={(checked) => setRssConfig({ ...rssConfig, enabled: checked })}
                        data-testid="switch-rss-enabled"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rssSchedule">Check Frequency</Label>
                        <Select
                          value={rssConfig.schedule}
                          onValueChange={(value) => setRssConfig({ ...rssConfig, schedule: value })}
                          disabled={!rssConfig.enabled}
                        >
                          <SelectTrigger id="rssSchedule" data-testid="select-rss-schedule">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="every_1_hour">Every 1 hour</SelectItem>
                            <SelectItem value="every_6_hours">Every 6 hours</SelectItem>
                            <SelectItem value="once_per_day">Once per day</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rssLanguage">
                          <span className="flex items-center gap-2">
                            <Languages className="h-4 w-4" />
                            Content Language
                          </span>
                        </Label>
                        <Select
                          value={rssConfig.targetLanguage}
                          onValueChange={(value) => setRssConfig({ ...rssConfig, targetLanguage: value })}
                          disabled={!rssConfig.enabled}
                        >
                          <SelectTrigger id="rssLanguage" data-testid="select-rss-language">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(languageDisplayNames).map(([code, name]) => (
                              <SelectItem key={code} value={code}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Rewritten articles will be in this language</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rssPostStatus">Post Status</Label>
                        <Select
                          value={(rssConfig as any).defaultPostStatus || "published"}
                          onValueChange={(value) => setRssConfig({ ...rssConfig, defaultPostStatus: value } as any)}
                          disabled={!rssConfig.enabled}
                        >
                          <SelectTrigger id="rssPostStatus" data-testid="select-rss-post-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Create posts as published or draft</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="articlesToFetch">Articles to Fetch</Label>
                      <Input
                        id="articlesToFetch"
                        data-testid="input-articles-to-fetch"
                        type="number"
                        min="1"
                        max="10"
                        value={rssConfig.articlesToFetch}
                        onChange={(e) => setRssConfig({ ...rssConfig, articlesToFetch: parseInt(e.target.value) || 3 })}
                        disabled={!rssConfig.enabled}
                      />
                      <p className="text-xs text-muted-foreground">Number of newest articles to fetch from each feed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rssMasterPrompt">Custom Prompt (Optional)</Label>
                      <Textarea
                        id="rssMasterPrompt"
                        data-testid="input-rss-master-prompt"
                        placeholder="Add additional context or instructions for rewriting articles. E.g., 'Focus on UK hospitality industry. Include relevant statistics. Write in a professional tone.'"
                        value={rssConfig.masterPrompt}
                        onChange={(e) => setRssConfig({ ...rssConfig, masterPrompt: e.target.value })}
                        disabled={!rssConfig.enabled}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">Add extra context or instructions for the AI when rewriting RSS articles</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="rssPillar">
                          <span className="flex items-center gap-2">
                            <Link className="h-4 w-4" />
                            Link to Pillar (Internal Linking)
                          </span>
                        </Label>
                        <Select
                          value={rssConfig.pillarId || "none"}
                          onValueChange={(value) => setRssConfig({ ...rssConfig, pillarId: value === "none" ? "" : value })}
                          disabled={!rssConfig.enabled}
                        >
                          <SelectTrigger id="rssPillar" data-testid="select-rss-pillar">
                            <SelectValue placeholder="No pillar - standalone posts" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No pillar - standalone posts</SelectItem>
                            {(pillars || []).map((pillar) => (
                              <SelectItem key={pillar.id} value={pillar.id}>
                                {pillar.name} ({pillar.packType})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Link posts to a pillar for internal linking graph</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rssArticleRole">
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Article Role
                          </span>
                        </Label>
                        <Select
                          value={rssConfig.articleRole || "auto"}
                          onValueChange={(value) => setRssConfig({ ...rssConfig, articleRole: value === "auto" ? "" : value })}
                          disabled={!rssConfig.enabled}
                        >
                          <SelectTrigger id="rssArticleRole" data-testid="select-rss-article-role">
                            <SelectValue placeholder="Auto-detect from title" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-detect from title</SelectItem>
                            {ARTICLE_ROLES.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Role affects JSON-LD schema and linking rules</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>RSS Feed URLs</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://example.com/feed.xml"
                          value={newFeedUrl}
                          onChange={(e) => setNewFeedUrl(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeedUrl())}
                          disabled={!rssConfig.enabled}
                          data-testid="input-feed-url"
                        />
                        <Button
                          onClick={addFeedUrl}
                          disabled={!rssConfig.enabled}
                          data-testid="button-add-feed"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-2 mt-2">
                        {(rssConfig.feedUrls || []).map((url) => (
                          <div
                            key={url}
                            className="flex items-center justify-between bg-muted px-3 py-2 rounded-md"
                            data-testid={`feed-url-${url}`}
                          >
                            <span className="text-sm font-mono truncate flex-1">{url}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFeedUrl(url)}
                              data-testid={`button-remove-feed-${url}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Articles will be rewritten by AI to ensure uniqueness</p>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              </div>
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
    </div>
  );
}
