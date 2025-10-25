import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, X, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Site, AiAutomationConfig, RssAutomationConfig, Post } from "@shared/schema";
import { PostsManager } from "@/components/posts-manager";

export default function SiteConfig() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isNewSite = id === "new";

  const [siteData, setSiteData] = useState({
    domain: "",
    title: "",
    logoUrl: "",
    siteType: "blog",
  });

  const [aiConfig, setAiConfig] = useState({
    enabled: false,
    schedule: "1_per_day",
    masterPrompt: "",
    keywords: [] as string[],
  });

  const [rssConfig, setRssConfig] = useState({
    enabled: false,
    schedule: "every_6_hours",
    feedUrls: [] as string[],
    articlesToFetch: 3,
  });

  const [newKeyword, setNewKeyword] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");

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

  useEffect(() => {
    if (site) {
      setSiteData({
        domain: site.domain,
        title: site.title,
        logoUrl: site.logoUrl || "",
        siteType: site.siteType,
      });
    }
  }, [site]);

  useEffect(() => {
    if (existingAiConfig) {
      setAiConfig({
        enabled: existingAiConfig.enabled,
        schedule: existingAiConfig.schedule,
        masterPrompt: existingAiConfig.masterPrompt,
        keywords: existingAiConfig.keywords,
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
      });
    }
  }, [existingRssConfig]);

  const handleSave = async () => {
    try {
      let siteId = id;
      
      if (isNewSite) {
        const newSite = await apiRequest("POST", "/api/sites", siteData);
        siteId = newSite.id;
      } else {
        await apiRequest("PUT", `/api/sites/${id}`, siteData);
      }

      await apiRequest("PUT", `/api/sites/${siteId}/ai-config`, aiConfig);
      await apiRequest("PUT", `/api/sites/${siteId}/rss-config`, rssConfig);

      toast({ title: isNewSite ? "Site created successfully" : "Site updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      
      if (isNewSite) {
        setLocation(`/admin/sites/${siteId}`);
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
    if (newFeedUrl.trim() && !rssConfig.feedUrls.includes(newFeedUrl.trim())) {
      setRssConfig({ ...rssConfig, feedUrls: [...rssConfig.feedUrls, newFeedUrl.trim()] });
      setNewFeedUrl("");
    }
  };

  const removeFeedUrl = (url: string) => {
    setRssConfig({ ...rssConfig, feedUrls: rssConfig.feedUrls.filter(u => u !== url) });
  };

  if (!isNewSite && siteLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading site configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
                {isNewSite ? "Add New Site" : `Edit ${site?.title}`}
              </h1>
              <p className="text-sm text-muted-foreground" data-testid="text-page-description">Configure your multi-tenant website</p>
            </div>
          </div>
          <Button onClick={handleSave} data-testid="button-save">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
            <TabsTrigger value="ai" data-testid="tab-ai">AI Content</TabsTrigger>
            <TabsTrigger value="rss" data-testid="tab-rss">RSS Feeds</TabsTrigger>
            <TabsTrigger value="posts" data-testid="tab-posts" disabled={isNewSite}>Posts</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-general-title">General Settings</CardTitle>
                <CardDescription data-testid="text-general-description">Configure the basic information for your website</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="domain" data-testid="label-domain">Domain Name</Label>
                    <Input
                      id="domain"
                      data-testid="input-domain"
                      placeholder="example.com"
                      value={siteData.domain}
                      onChange={(e) => setSiteData({ ...siteData, domain: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground" data-testid="text-domain-hint">The exact domain this site will respond to</p>
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
                    <Label htmlFor="siteType" data-testid="label-site-type">Site Layout Type</Label>
                    <Select
                      value={siteData.siteType}
                      onValueChange={(value) => setSiteData({ ...siteData, siteType: value })}
                    >
                      <SelectTrigger id="siteType" data-testid="select-site-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blog">Blog</SelectItem>
                        <SelectItem value="news">News</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Determines the visual layout template</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle data-testid="text-ai-title">AI-Driven Content Generation</CardTitle>
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
          </TabsContent>

          <TabsContent value="rss" className="space-y-6">
            <Card>
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
                    {rssConfig.feedUrls.map((url) => (
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
          </TabsContent>

          <TabsContent value="posts" className="space-y-6">
            {!isNewSite && id && <PostsManager siteId={id} />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
