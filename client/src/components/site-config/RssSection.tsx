import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Languages, Link, Plus, Rss, Settings, Wrench, X } from "lucide-react";
import { languageDisplayNames } from "@shared/schema";
import type { Pillar } from "@shared/schema";
import { ARTICLE_ROLES } from "@shared/pack-definitions";
import { cardVariants } from "./variants";
import type { RssConfigState, SetState } from "./types";

type RssSectionProps = {
  rssConfig: RssConfigState;
  setRssConfig: SetState<RssConfigState>;
  newFeedUrl: string;
  setNewFeedUrl: SetState<string>;
  addFeedUrl: () => void;
  removeFeedUrl: (url: string) => void;
  pillars: Pillar[];
};

export function RssSection({ rssConfig, setRssConfig, newFeedUrl, setNewFeedUrl, addFeedUrl, removeFeedUrl, pillars }: RssSectionProps) {
  return (
                <div className="space-y-6">
                  <div className="bg-muted/50 rounded-xl p-4 border border-border">
                    <div className="flex items-start gap-3">
                      <Rss className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">RSS Imports let you curate content from other sources</p>
                        <p className="text-xs text-muted-foreground mt-1">Articles are automatically rewritten by AI to be unique and SEO-friendly for your site.</p>
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
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <CardTitle>RSS Feed Importer</CardTitle>
                          <CardDescription>Import articles from external RSS feeds and automatically rewrite them with AI to create unique, original content for your blog</CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Switch
                            checked={rssConfig.enabled}
                            onCheckedChange={(checked) => setRssConfig({ ...rssConfig, enabled: checked })}
                            data-testid="switch-rss-enabled"
                          />
                          <span className="text-xs text-muted-foreground">Enable RSS Automation</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Import Settings
                        </h4>
                        <p className="text-xs text-muted-foreground -mt-2">Automatically import and rewrite articles from external RSS feeds</p>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="rssSchedule">Poll Interval</Label>
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
                            <p className="text-xs text-muted-foreground">How often to check feeds for new content</p>
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
                            <p className="text-xs text-muted-foreground">When enabled, imported articles are rewritten to be unique in this language</p>
                          </div>
  
                          <div className="space-y-2">
                            <Label htmlFor="rssPostStatus">Default Post Status</Label>
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
                            <p className="text-xs text-muted-foreground">Choose whether imported posts go live immediately or as drafts</p>
                          </div>
                        </div>
                      </div>
  
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Rss className="h-4 w-4" />
                          Feed Sources
                        </h4>
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
                          <p className="text-xs text-muted-foreground">Paste RSS feed URLs here. The system will check for new articles periodically.</p>
                        </div>
  
                        <div className="space-y-2">
                          <Label htmlFor="articlesToFetch">Articles per Feed</Label>
                          <Input
                            id="articlesToFetch"
                            data-testid="input-articles-to-fetch"
                            type="number"
                            min="1"
                            max="10"
                            value={rssConfig.articlesToFetch}
                            onChange={(e) => setRssConfig({ ...rssConfig, articlesToFetch: parseInt(e.target.value) || 3 })}
                            disabled={!rssConfig.enabled}
                            className="w-32"
                          />
                          <p className="text-xs text-muted-foreground">Number of newest articles to import from each feed per check</p>
                        </div>
                      </div>
  
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Link className="h-4 w-4" />
                          Content Organization
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="rssPillar">
                              <span className="flex items-center gap-2">
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
                            <p className="text-xs text-muted-foreground">Link imported posts to a pillar for internal linking</p>
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
                      </div>
  
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          Advanced Options
                        </h4>
                        <div className="space-y-2">
                          <Label htmlFor="rssMasterPrompt">Custom Rewrite Prompt (Optional)</Label>
                          <Textarea
                            id="rssMasterPrompt"
                            data-testid="input-rss-master-prompt"
                            placeholder="Add additional context or instructions for rewriting articles. E.g., 'Focus on UK hospitality industry. Include relevant statistics. Write in a professional tone.'"
                            value={rssConfig.masterPrompt}
                            onChange={(e) => setRssConfig({ ...rssConfig, masterPrompt: e.target.value })}
                            disabled={!rssConfig.enabled}
                            rows={4}
                          />
                          <p className="text-xs text-muted-foreground">Advanced: Add extra context or instructions for the AI when rewriting imported articles</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                </div>
              
  );
}
