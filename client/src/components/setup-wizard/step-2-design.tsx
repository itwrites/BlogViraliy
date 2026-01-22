import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Site, defaultTemplateSettings, TemplateSettings } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowRight, Loader2, Layout, Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step2DesignProps {
    site: Site;
    onNext: () => void;
}

const TEMPLATES = [
    { id: "standard", name: "Standard", description: "Clean and balanced", icon: Layout },
    { id: "minimal", name: "Minimal", description: "Focus on typography", icon: Layout },
    { id: "editorial", name: "Editorial", description: "Magazine style", icon: Layout },
    { id: "portfolio", name: "Portfolio", description: "Visual heavy", icon: Layout },
];

const COLOR_PALETTES = [
    { name: "Blue", primary: "#3b82f6", secondary: "#8b5cf6" },
    { name: "Emerald", primary: "#10b981", secondary: "#059669" },
    { name: "Violet", primary: "#8b5cf6", secondary: "#ec4899" },
    { name: "Orange", primary: "#f97316", secondary: "#ef4444" },
    { name: "Neutral", primary: "#1f2937", secondary: "#4b5563" },
];

export function Step2Design({ site, onNext }: Step2DesignProps) {
    const { toast } = useToast();
    const [settings, setSettings] = useState<TemplateSettings>(site.templateSettings as TemplateSettings || defaultTemplateSettings);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiRequest("PATCH", `/api/sites/${site.id}`, {
                templateSettings: settings,
            });
            queryClient.invalidateQueries({ queryKey: ["/api/sites", site.id] });
            onNext();
        } catch (error) {
            toast({ title: "Failed to save design settings", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Design & Template</h2>
                <p className="text-muted-foreground">
                    Choose a look that fits your brand. You can customize every detail later.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                    <div className="space-y-4">
                        <Label className="text-base">Choose a Template</Label>
                        <div className="grid grid-cols-2 gap-4">
                            {TEMPLATES.map((template) => (
                                <div
                                    key={template.id}
                                    className={cn(
                                        "cursor-pointer rounded-xl border-2 p-4 transition-all hover:bg-muted/50",
                                        settings.postCardStyle === template.id // strict mapping not exact, but mocking for wizard
                                            ? "border-primary bg-primary/5"
                                            : "border-muted"
                                    )}
                                    onClick={() => setSettings({ ...settings, postCardStyle: template.id as any })}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            settings.postCardStyle === template.id ? "bg-primary text-primary-foreground" : "bg-muted"
                                        )}>
                                            <template.icon className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium">{template.name}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{template.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-base">Color Palette</Label>
                        <div className="flex flex-wrap gap-3">
                            {COLOR_PALETTES.map((palette) => (
                                <div
                                    key={palette.name}
                                    className={cn(
                                        "cursor-pointer rounded-full p-1 border-2 transition-all",
                                        settings.primaryColor === palette.primary
                                            ? "border-primary scale-110"
                                            : "border-transparent"
                                    )}
                                    onClick={() => setSettings({
                                        ...settings,
                                        primaryColor: palette.primary,
                                        secondaryColor: palette.secondary
                                    })}
                                >
                                    <div className="flex h-8 w-8 overflow-hidden rounded-full ring-1 ring-border">
                                        <div className="w-1/2 h-full" style={{ backgroundColor: palette.primary }} />
                                        <div className="w-1/2 h-full" style={{ backgroundColor: palette.secondary }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-base">Typography</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {['modern', 'classic', 'tech'].map((font) => (
                                <Button
                                    key={font}
                                    variant={settings.headingFont === font ? "default" : "outline"}
                                    onClick={() => setSettings({ ...settings, headingFont: font as any, bodyFont: font as any })}
                                    className="capitalize"
                                >
                                    {font}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-base">Live Preview</Label>
                    <Card className="h-[400px] overflow-hidden bg-muted/20 border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground">
                        <div className="transform scale-75 origin-center w-full h-full p-4 pointer-events-none select-none opacity-50">
                            {/* Mock Preview Content */}
                            <div className="w-full h-8 bg-white rounded mb-4 flex items-center px-4 justify-between shadow-sm">
                                <div className="w-20 h-3 bg-gray-200 rounded" />
                                <div className="flex gap-2">
                                    <div className="w-10 h-2 bg-gray-100 rounded" />
                                    <div className="w-10 h-2 bg-gray-100 rounded" />
                                </div>
                            </div>
                            <div className="w-full h-32 bg-gray-100 rounded-lg mb-4" style={{ backgroundColor: settings.primaryColor + '20' }} />
                            <div className="grid grid-cols-2 gap-4">
                                <div className="h-24 bg-white rounded shadow-sm p-2">
                                    <div className="w-full h-12 bg-gray-100 rounded mb-2" />
                                    <div className="w-2/3 h-2 bg-gray-200 rounded" />
                                </div>
                                <div className="h-24 bg-white rounded shadow-sm p-2">
                                    <div className="w-full h-12 bg-gray-100 rounded mb-2" />
                                    <div className="w-2/3 h-2 bg-gray-200 rounded" />
                                </div>
                            </div>
                        </div>
                        <p className="mt-4 text-sm">Preview updates as you edit</p>
                    </Card>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={isSaving} size="lg" className="rounded-full px-8">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Next Step"}
                    {!isSaving && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
            </div>
        </div>
    );
}
