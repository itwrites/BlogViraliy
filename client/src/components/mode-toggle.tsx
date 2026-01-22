import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, Settings2 } from "lucide-react";
import { SiteMode } from "@/hooks/use-site-mode";

interface ModeToggleProps {
    mode: SiteMode;
    onModeChange: (mode: SiteMode) => void;
    className?: string;
}

export function ModeToggle({ mode, onModeChange, className }: ModeToggleProps) {
    return (
        <div className={cn("flex items-center p-1 bg-muted/50 rounded-full border border-border/50", className)}>
            <Button
                variant={mode === 'beginner' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onModeChange('beginner')}
                className={cn(
                    "rounded-full px-4 h-8 transition-all",
                    mode === 'beginner' ? "shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                Beginner
            </Button>
            <Button
                variant={mode === 'advanced' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onModeChange('advanced')}
                className={cn(
                    "rounded-full px-4 h-8 transition-all",
                    mode === 'advanced' ? "shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Settings2 className="w-3.5 h-3.5 mr-2" />
                Advanced
            </Button>
        </div>
    );
}
