import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Site } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowRight, Loader2, Users } from "lucide-react";

interface Step3BusinessProps {
    site: Site;
    onNext: () => void;
}

const BRAND_VOICES = [
    "Professional & Authoritative",
    "Friendly & Approachable",
    "Playful & Fun",
    "Technical & Dry",
    "Inspirational & Motivational",
    "Direct & Minimal"
];

const INDUSTRIES = [
    "Technology", "Health & Wellness", "Finance", "Real Estate", "Travel", "Education", "Lifestyle", "Other"
];

export function Step3Business({ site, onNext }: Step3BusinessProps) {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        businessDescription: site.businessDescription || "",
        targetAudience: site.targetAudience || "",
        brandVoice: site.brandVoice || "",
        industry: site.industry || "",
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiRequest("PATCH", `/api/sites/${site.id}`, formData);
            queryClient.invalidateQueries({ queryKey: ["/api/sites", site.id] });
            onNext();
        } catch (error) {
            toast({ title: "Failed to save business context", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Business Context</h2>
                <p className="text-muted-foreground">
                    Tell AI about your business so it can write like you.
                </p>
            </div>

            <Card>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                        <Label htmlFor="industry">Industry</Label>
                        <Select
                            value={formData.industry}
                            onValueChange={(val) => setFormData({ ...formData, industry: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select an industry" />
                            </SelectTrigger>
                            <SelectContent>
                                {INDUSTRIES.map(ind => (
                                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Business Description</Label>
                        <Textarea
                            id="description"
                            placeholder="e.g. We are a SaaS company helping small businesses manage their inventory..."
                            rows={3}
                            value={formData.businessDescription}
                            onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="audience">Target Audience</Label>
                        <div className="relative">
                            <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="audience"
                                className="pl-9"
                                placeholder="e.g. Small business owners, freelance designers..."
                                value={formData.targetAudience}
                                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="voice">Brand Voice</Label>
                        <Select
                            value={formData.brandVoice}
                            onValueChange={(val) => setFormData({ ...formData, brandVoice: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="How should we sound?" />
                            </SelectTrigger>
                            <SelectContent>
                                {BRAND_VOICES.map(voice => (
                                    <SelectItem key={voice} value={voice}>{voice}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving} size="lg" className="rounded-full px-8">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Next Step"}
                    {!isSaving && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
            </div>
        </div>
    );
}
