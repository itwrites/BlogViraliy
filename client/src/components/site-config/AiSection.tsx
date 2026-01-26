import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Languages, Plus, Settings, Sparkles, Wrench, X } from "lucide-react";
import { languageDisplayNames } from "@shared/schema";
import { cardVariants } from "./variants";
import type { AiConfigState, SetState } from "./types";

type AiSectionProps = {
  aiConfig: AiConfigState;
  setAiConfig: SetState<AiConfigState>;
  newKeyword: string;
  setNewKeyword: SetState<string>;
  addKeyword: () => void;
  removeKeyword: (keyword: string) => void;
};

export function AiSection({ aiConfig, setAiConfig, newKeyword, setNewKeyword, addKeyword, removeKeyword }: AiSectionProps) {
  return (
                <div className="space-y-6">
                  <div className="bg-muted/50 rounded-xl p-4 border border-border">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">AI Writing automatically creates blog posts for your site</p>
                        <p className="text-xs text-muted-foreground mt-1">Configure your topics below and the AI will generate SEO-optimized content on your schedule.</p>
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
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <CardTitle className="text-xl tracking-tight" data-testid="text-ai-title">AI-Driven Content Generation</CardTitle>
                          <CardDescription data-testid="text-ai-description">Let AI write and publish blog posts automatically based on your configured topics and schedule</CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Switch
                            checked={aiConfig.enabled}
                            onCheckedChange={(checked) => setAiConfig({ ...aiConfig, enabled: checked })}
                            data-testid="switch-ai-enabled"
                          />
                          <span className="text-xs text-muted-foreground">Enable AI Automation</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Automation Settings
                        </h4>
                        <p className="text-xs text-muted-foreground -mt-2">When enabled, the system will automatically generate new articles based on your keywords</p>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="aiSchedule" data-testid="label-ai-schedule">Article Schedule</Label>
                            <Select
                              value={aiConfig.schedule}
                              onValueChange={(value) => setAiConfig({ ...aiConfig, schedule: value })}
                              disabled={!aiConfig.enabled}
                            >
                              <SelectTrigger id="aiSchedule" data-testid="select-ai-schedule">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1_per_day">1 article per day</SelectItem>
                                <SelectItem value="3_per_day">3 articles per day</SelectItem>
                                <SelectItem value="1_per_week">1 article per week</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">How often new AI articles are created. Choose based on your content strategy.</p>
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
                            <Label htmlFor="aiPostStatus" data-testid="label-ai-post-status">Default Post Status</Label>
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
                            <p className="text-xs text-muted-foreground">Choose whether AI-generated posts go live immediately or as drafts for review</p>
                          </div>
                        </div>
                      </div>
  
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Content Topics
                        </h4>
                        <div className="space-y-2">
                          <Label data-testid="label-keywords">Keywords / Topics</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter a keyword or topic"
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
                          <p className="text-xs text-muted-foreground">Add topics or phrases. The AI will cycle through these to generate relevant content.</p>
                        </div>
                      </div>
  
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Wrench className="h-4 w-4" />
                          Advanced Options
                        </h4>
                        <div className="space-y-2">
                          <Label htmlFor="masterPrompt" data-testid="label-master-prompt">Custom Prompt (Optional)</Label>
                          <Textarea
                            id="masterPrompt"
                            data-testid="textarea-master-prompt"
                            placeholder="You are an expert food critic for budget restaurants. Write in a witty, informal tone..."
                            value={aiConfig.masterPrompt}
                            onChange={(e) => setAiConfig({ ...aiConfig, masterPrompt: e.target.value })}
                            disabled={!aiConfig.enabled}
                            rows={6}
                          />
                          <p className="text-xs text-muted-foreground">Advanced: Provide specific instructions for the AI writer to define writing style, tone, and expertise</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </motion.div>
                </div>
              
  );
}
