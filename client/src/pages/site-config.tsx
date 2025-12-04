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
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Plus, X, Save, Palette, Search, Type, Layout, Globe, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Site, AiAutomationConfig, RssAutomationConfig, TemplateSettings } from "@shared/schema";
import { defaultTemplateSettings } from "@shared/schema";
import { PostsManager } from "@/components/posts-manager";
import { BulkGeneration } from "@/components/bulk-generation";
import { TopicalAuthority } from "@/components/topical-authority";

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
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
    favicon: "",
    analyticsId: "",
  });

  const [templateSettings, setTemplateSettings] = useState<TemplateSettings>(defaultTemplateSettings);

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
        metaTitle: site.metaTitle || "",
        metaDescription: site.metaDescription || "",
        ogImage: site.ogImage || "",
        favicon: site.favicon || "",
        analyticsId: site.analyticsId || "",
      });
      if (site.templateSettings) {
        setTemplateSettings({ ...defaultTemplateSettings, ...site.templateSettings });
      }
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
    const feedUrls = rssConfig.feedUrls || [];
    if (newFeedUrl.trim() && !feedUrls.includes(newFeedUrl.trim())) {
      setRssConfig({ ...rssConfig, feedUrls: [...feedUrls, newFeedUrl.trim()] });
      setNewFeedUrl("");
    }
  };

  const removeFeedUrl = (url: string) => {
    setRssConfig({ ...rssConfig, feedUrls: (rssConfig.feedUrls || []).filter(u => u !== url) });
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
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl"
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                <Settings className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight" data-testid="text-page-title">
                  {isNewSite ? "Add New Site" : site?.title}
                </h1>
                <p className="text-xs text-muted-foreground" data-testid="text-page-description">
                  {isNewSite ? "Create a new multi-tenant website" : "Site Configuration"}
                </p>
              </div>
            </div>
          </div>
          <Button onClick={handleSave} size="sm" data-testid="button-save">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full max-w-6xl grid-cols-8">
            <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
            <TabsTrigger value="design" data-testid="tab-design">Design</TabsTrigger>
            <TabsTrigger value="seo" data-testid="tab-seo">SEO</TabsTrigger>
            <TabsTrigger value="ai" data-testid="tab-ai">AI Content</TabsTrigger>
            <TabsTrigger value="rss" data-testid="tab-rss">RSS Feeds</TabsTrigger>
            <TabsTrigger value="topical" data-testid="tab-topical" disabled={isNewSite}>Topical</TabsTrigger>
            <TabsTrigger value="bulk" data-testid="tab-bulk" disabled={isNewSite}>Bulk</TabsTrigger>
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

                  <div className="space-y-3 md:col-span-2">
                    <Label data-testid="label-site-type">Site Layout Type</Label>
                    <p className="text-xs text-muted-foreground mb-3">Choose a visual template that best matches your content style</p>
                    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                      {[
                        { value: "blog", label: "Blog", desc: "Editorial, serif fonts, spacious" },
                        { value: "news", label: "News", desc: "Compact, condensed, information-dense" },
                        { value: "magazine", label: "Magazine", desc: "Multi-column grid, TIME-style" },
                        { value: "portfolio", label: "Portfolio", desc: "Large images, minimal text" },
                        { value: "restaurant", label: "Restaurant", desc: "Food & dining news, warm colors" },
                        { value: "crypto", label: "Crypto", desc: "Data-heavy, tech aesthetic" },
                      ].map((layout) => (
                        <Card
                          key={layout.value}
                          className={`cursor-pointer transition-all ${
                            siteData.siteType === layout.value
                              ? "ring-2 ring-primary"
                              : "hover-elevate"
                          }`}
                          onClick={() => setSiteData({ ...siteData, siteType: layout.value })}
                          data-testid={`card-layout-${layout.value}`}
                        >
                          <CardContent className="p-4">
                            <div className="aspect-video bg-muted rounded mb-3 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-muted-foreground">{layout.label.substring(0, 1)}</div>
                              </div>
                            </div>
                            <h4 className="font-semibold text-sm mb-1" data-testid={`text-layout-name-${layout.value}`}>{layout.label}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-layout-desc-${layout.value}`}>{layout.desc}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="design" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-design-title">Template Design Settings</CardTitle>
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
                        onValueChange={(value: "modern" | "classic" | "editorial" | "tech" | "elegant") => 
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
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bodyFont" data-testid="label-body-font">Body Font</Label>
                      <Select
                        value={templateSettings.bodyFont}
                        onValueChange={(value: "modern" | "classic" | "editorial" | "tech" | "elegant") => 
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
                  <div className="pt-4">
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
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Footer & Social Links</h3>
                  </div>
                  <div className="space-y-4">
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
          </TabsContent>

          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-seo-title">SEO Settings</CardTitle>
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
          </TabsContent>

          <TabsContent value="topical" className="space-y-6">
            {!isNewSite && id && <TopicalAuthority siteId={id} />}
          </TabsContent>

          <TabsContent value="bulk" className="space-y-6">
            {!isNewSite && id && <BulkGeneration siteId={id} />}
          </TabsContent>

          <TabsContent value="posts" className="space-y-6">
            {!isNewSite && id && <PostsManager siteId={id} />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
