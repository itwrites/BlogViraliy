import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Globe, FileText } from "lucide-react";

interface Site {
  id: string;
  title: string;
}

interface ArticleAllocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sites: Site[];
  totalQuota: number;
  existingAllocation?: Record<string, number> | null;
  onAllocationComplete: () => void;
}

export function ArticleAllocationModal({
  open,
  onOpenChange,
  sites,
  totalQuota,
  existingAllocation,
  onAllocationComplete,
}: ArticleAllocationModalProps) {
  const { toast } = useToast();
  const [allocation, setAllocation] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sites.length > 0) {
      if (existingAllocation) {
        setAllocation(existingAllocation);
      } else {
        const perSite = Math.floor(totalQuota / sites.length);
        const remainder = totalQuota % sites.length;
        const initial: Record<string, number> = {};
        sites.forEach((site, idx) => {
          initial[site.id] = perSite + (idx < remainder ? 1 : 0);
        });
        setAllocation(initial);
      }
    }
  }, [sites, totalQuota, existingAllocation]);

  const totalAllocated = useMemo(() => {
    return Object.values(allocation).reduce((sum, val) => sum + val, 0);
  }, [allocation]);

  const remaining = totalQuota - totalAllocated;

  const handleSliderChange = (siteId: string, value: number[]) => {
    const newValue = value[0];
    const currentValue = allocation[siteId] || 0;
    const diff = newValue - currentValue;

    if (diff > remaining && diff > 0) {
      setAllocation(prev => ({
        ...prev,
        [siteId]: currentValue + remaining,
      }));
    } else {
      setAllocation(prev => ({
        ...prev,
        [siteId]: newValue,
      }));
    }
  };

  const handleSubmit = async () => {
    if (totalAllocated === 0) {
      toast({
        title: "Invalid Allocation",
        description: "Please allocate at least some articles to your sites.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/article-allocation", { allocation });
      
      toast({
        title: "Allocation Saved",
        description: "Starting content generation...",
      });
      
      onAllocationComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save allocation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="modal-article-allocation">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Distribute Your Monthly Articles
          </DialogTitle>
          <DialogDescription>
            You have <span className="font-semibold text-foreground">{totalQuota} articles</span> per month in your plan.
            Choose how many articles to generate for each site.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {sites.map((site) => (
            <div key={site.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {site.title}
                </Label>
                <span className="text-sm font-medium tabular-nums" data-testid={`text-allocation-${site.id}`}>
                  {allocation[site.id] || 0} articles
                </span>
              </div>
              <Slider
                value={[allocation[site.id] || 0]}
                onValueChange={(value) => handleSliderChange(site.id, value)}
                max={totalQuota}
                min={0}
                step={1}
                className="w-full"
                data-testid={`slider-allocation-${site.id}`}
              />
            </div>
          ))}

          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">Total allocated:</span>
            <span className={`text-sm font-medium tabular-nums ${remaining < 0 ? "text-destructive" : ""}`}>
              {totalAllocated} / {totalQuota}
              {remaining > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({remaining} remaining)
                </span>
              )}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || totalAllocated === 0}
            data-testid="button-start-generation"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Start Content Generation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
