import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, FileText, Search, Settings } from "lucide-react";
import { cardVariants } from "./variants";
import type { SetState, SiteDataState } from "./types";

type SeoSectionProps = {
  siteData: SiteDataState;
  setSiteData: SetState<SiteDataState>;
};

export function SeoSection({ siteData, setSiteData }: SeoSectionProps) {
  return (
                <div className="space-y-8">
                  <div className="bg-muted/50 rounded-xl p-4 border border-border">
                    <div className="flex items-start gap-3">
                      <Search className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Good SEO helps your content rank higher in search results</p>
                        <p className="text-xs text-muted-foreground mt-1">Complete these fields to improve visibility on Google and social media. Well-optimized pages get more organic traffic.</p>
                      </div>
                    </div>
                  </div>
  
                  <motion.div
                    custom={0}
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                  >
                  <Card className="rounded-2xl overflow-hidden">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl tracking-tight" data-testid="text-seo-title">SEO Settings</CardTitle>
                      <CardDescription data-testid="text-seo-description">Optimize your site for search engines. These settings affect how your site appears in Google and social media.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Meta Information
                        </h3>
                        <p className="text-xs text-muted-foreground -mt-2">Control how your site appears in search engine results pages (SERPs).</p>
                        <div className="space-y-2">
                          <Label htmlFor="metaTitle" data-testid="label-meta-title">Meta Title Format</Label>
                          <Input
                            id="metaTitle"
                            placeholder="Your Site Title | Brand Name"
                            value={siteData.metaTitle}
                            onChange={(e) => setSiteData({ ...siteData, metaTitle: e.target.value })}
                            data-testid="input-meta-title"
                          />
                          <p className="text-xs text-muted-foreground">Use {"{title}"} as a placeholder for the page title. Example: '{"{title}"} | My Blog' (50-60 characters recommended)</p>
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
                          <p className="text-xs text-muted-foreground">A brief summary of your site shown in search results (max 160 characters). Make it compelling to improve click-through rates.</p>
                        </div>
                      </div>
  
                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Social Sharing
                        </h3>
                        <p className="text-xs text-muted-foreground -mt-2">Configure how your content looks when shared on social media platforms.</p>
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
                            <p className="text-xs text-muted-foreground">The image shown when your site is shared on social media. Recommended: 1200x630 pixels.</p>
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
                      </div>
  
                      <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Technical SEO
                        </h3>
                        <p className="text-xs text-muted-foreground -mt-2">Analytics and tracking settings to measure your site's performance.</p>
                        <div className="space-y-2">
                          <Label htmlFor="analyticsId" data-testid="label-analytics">Google Analytics ID</Label>
                          <Input
                            id="analyticsId"
                            placeholder="G-XXXXXXXXXX or UA-XXXXXX-X"
                            value={siteData.analyticsId}
                            onChange={(e) => setSiteData({ ...siteData, analyticsId: e.target.value })}
                            data-testid="input-analytics"
                          />
                          <p className="text-xs text-muted-foreground">Your Google Analytics tracking ID for visitor analytics. This enables traffic insights and user behavior tracking.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                </div>
              
  );
}
