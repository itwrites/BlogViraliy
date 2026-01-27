import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Site } from "@shared/schema";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowRight, Loader2, Sparkles, Rss, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface Step4ContentProps {
    site: Site;
    onNext: () => void;
}

export function Step4Content({ site, onNext }: Step4ContentProps) {
    const { toast } = useToast();
    const [strategy, setStrategy] = useState<'ai' | 'rss' | 'manual'>('ai');
    const [isSaving, setIsSaving] = useState(false);
    const [aiKeywords, setAiKeywords] = useState<string>("");

    const { data: aiConfig } = useQuery<any>({
        queryKey: ["/api/sites", site.id, "ai-config"],
        enabled: !!site.id
    });

    useEffect(() => {
        if (aiConfig) {
            if (aiConfig.enabled) setStrategy('ai');
            if (aiConfig.keywords) setAiKeywords(aiConfig.keywords.join(", "));
        }
    }, [aiConfig]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const keywordsArray = aiKeywords.split(",").map(k => k.trim()).filter(k => k);

            await apiRequest("PUT", `/api/sites/${site.id}/ai-config`, {
                enabled: strategy === 'ai',
                schedule: strategy === 'ai' ? '1_per_day' : '1_per_day',
                keywords: keywordsArray
            });

            queryClient.invalidateQueries({ queryKey: ["/api/sites", site.id] });
            onNext();
        } catch (error) {
            toast({ title: "Failed to save strategy", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 max-w-3xl animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Content Strategy</h2>
                <p className="text-muted-foreground">
                    How do you want to keep your blog fresh?
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                <Card
                    className={cn("cursor-pointer transition-all border-2", strategy === 'ai' ? "border-primary bg-primary/5" : "hover:border-primary/50")}
                    onClick={() => setStrategy('ai')}
                >
                    <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10 text-primary">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Autopilot (AI)</h3>
                            <p className="text-xs text-muted-foreground mt-1">AI writes and publishes for you daily.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={cn("cursor-pointer transition-all border-2", strategy === 'rss' ? "border-primary bg-primary/5" : "hover:border-primary/50")}
                    onClick={() => setStrategy('rss')}
                >
                    <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
                        <div className="p-3 rounded-full bg-orange-500/10 text-orange-500">
                            <Rss className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Curator (RSS)</h3>
                            <p className="text-xs text-muted-foreground mt-1">Rewrite news from other sources.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={cn("cursor-pointer transition-all border-2", strategy === 'manual' ? "border-primary bg-primary/5" : "hover:border-primary/50")}
                    onClick={() => setStrategy('manual')}
                >
                    <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
                        <div className="p-3 rounded-full bg-muted text-muted-foreground/80">
                          <PenTool className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Manual</h3>
                            <p className="text-xs text-muted-foreground mt-1">You write everything yourself.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {strategy === 'ai' && (
                <div className="space-y-4 pt-4 border-t animate-in fade-in slide-in-from-top-2">
                    <h3 className="font-medium">Setup Autopilot</h3>
                    <div className="space-y-2">
                        <Label>Topic Keywords (comma separated)</Label>
                        <Input
                            placeholder="e.g. Artificial Intelligence, Machine Learning, Automation"
                            value={aiKeywords}
                            onChange={(e) => setAiKeywords(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">AI will generate topics based on these keywords.</p>
                    </div>
                </div>
            )}

            {strategy === 'rss' && (
                <div className="p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground text-center">
                    You can configure RSS feeds in the Advanced settings after setup.
                </div>
            )}

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving} size="lg" className="rounded-full px-8">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Next Step"}
                    {!isSaving && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
            </div>
        </div>
    );
}
