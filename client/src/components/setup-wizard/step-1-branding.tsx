import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Site } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowRight, Loader2 } from "lucide-react";

interface Step1BrandingProps {
    site: Site;
    onNext: () => void;
}

export function Step1Branding({ site, onNext }: Step1BrandingProps) {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        title: site.title || "",
        domain: site.domain || "",
        logoUrl: site.logoUrl || "",
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!formData.title) {
            toast({ title: "Site title is required", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            await apiRequest("PATCH", `/api/sites/${site.id}`, formData);
            queryClient.invalidateQueries({ queryKey: ["/api/sites", site.id] });
            onNext();
        } catch (error) {
            toast({ title: "Failed to save changes", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Branding & Identity</h2>
                <p className="text-muted-foreground">
                    Let's start with the basics. Name your site and give it a home.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Site Identity</CardTitle>
                    <CardDescription>How your site appears to visitors</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Site Title</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="My Awesome Blog"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="domain">Primary Domain</Label>
                        <div className="flex gap-2">
                            <span className="flex items-center text-muted-foreground text-sm">https://</span>
                            <Input
                                id="domain"
                                value={formData.domain}
                                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                placeholder="example.com"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            You can configure DNS records later. Leave empty if using a subdomain.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="logo">Logo URL</Label>
                        <div className="flex gap-4 items-start">
                            <div className="flex-1 space-y-2">
                                <Input
                                    id="logo"
                                    value={formData.logoUrl}
                                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                    placeholder="https://example.com/logo.png"
                                />
                            </div>
                            {formData.logoUrl && (
                                <div className="w-16 h-16 border rounded-lg bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                                    <img src={formData.logoUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                                </div>
                            )}
                        </div>
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
