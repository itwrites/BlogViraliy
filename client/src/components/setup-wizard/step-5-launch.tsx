import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Site } from "@shared/schema";
import { useLocation } from "wouter";
import { ArrowRight, CheckCircle2, LayoutDashboard, Rocket } from "lucide-react";
import { useSiteMode } from "@/hooks/use-site-mode";

interface Step5LaunchProps {
    site: Site;
    onNext: () => void;
}

export function Step5Launch({ site, onNext }: Step5LaunchProps) {
    const [, setLocation] = useLocation();
    const { setMode } = useSiteMode(site.id);

    const handleLaunch = () => {
        // Mark wizard as fully complete (5) matches validation
        // User can now go to dashboard or switch to advanced mode to see full settings

        // We can redirect to the main dashboard or the site dashboard
        setLocation("/admin/dashboard");
    };

    const handleAdvanced = () => {
        setMode('advanced');
    };

    return (
        <div className="space-y-8 max-w-2xl animate-in fade-in slide-in-from-right-4 duration-500 text-center mx-auto pt-10">
            <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
                    <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
            </div>

            <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">You're All Set!</h2>
                <p className="text-lg text-muted-foreground">
                    "{site.title}" is ready for lift-off.
                </p>
            </div>

            <div className="grid gap-4 max-w-md mx-auto">
                <Button onClick={handleLaunch} size="lg" className="rounded-full px-8 w-full gap-2 text-base h-12">
                    <LayoutDashboard className="w-5 h-5" />
                    Go to Dashboard
                </Button>
                <Button onClick={handleAdvanced} variant="outline" size="lg" className="rounded-full px-8 w-full gap-2 text-base h-12">
                    <Rocket className="w-5 h-5" />
                    Continue Configuring (Advanced)
                </Button>
            </div>

            <p className="text-xs text-muted-foreground pt-8">
                Your site is now configured. You can change these settings anytime in Advanced Mode.
            </p>
        </div>
    );
}
