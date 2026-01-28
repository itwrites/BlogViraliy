import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PLAN_LIMITS } from "@shared/schema";
import { 
  Rocket, 
  TrendingUp, 
  Building2, 
  Check,
  Loader2,
  Sparkles,
  Lock
} from "lucide-react";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
}

type PlanId = "launch" | "growth" | "scale";

interface CheckoutResponse {
  checkoutUrl?: string;
  url?: string;
}

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  launch: <Rocket className="w-5 h-5" />,
  growth: <TrendingUp className="w-5 h-5" />,
  scale: <Building2 className="w-5 h-5" />,
};

const PLAN_COLORS: Record<PlanId, string> = {
  launch: "from-blue-500 to-blue-600",
  growth: "from-purple-500 to-purple-600",
  scale: "from-gray-700 to-gray-900",
};

export function PaywallModal({ open, onOpenChange, feature }: PaywallModalProps) {
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const handleGetStarted = async (planId: PlanId) => {
    setLoadingPlan(planId);
    try {
      const response = await apiRequest("POST", "/bv_api/checkout", {
        planId,
      });

      const data: CheckoutResponse = await response.json();

      const redirectUrl = data.checkoutUrl || data.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        toast({
          title: "Error",
          description: "Could not initiate checkout. Please try again.",
          variant: "destructive",
        });
        setLoadingPlan(null);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to initiate checkout",
        variant: "destructive",
      });
      setLoadingPlan(null);
    }
  };

  const plans = (["launch", "growth", "scale"] as PlanId[]).map((id) => ({
    id,
    ...PLAN_LIMITS[id],
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] p-0 gap-0 overflow-hidden bg-white/95 backdrop-blur-2xl border border-border text-foreground">
        <VisuallyHidden>
          <DialogTitle>Choose Your Plan</DialogTitle>
        </VisuallyHidden>
        
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200/60 mb-2">
              <Lock className="w-7 h-7 text-amber-600" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Unlock {feature}
            </h2>
            <p className="text-muted-foreground/80 max-w-md mx-auto">
              Subscribe to Blog Autopilot to start creating content, generating articles, and growing your audience.
            </p>
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-2xl border p-5 flex flex-col ${
                  plan.id === "growth" 
                    ? "border-purple-200 bg-purple-50/50 ring-2 ring-purple-500/20" 
                    : "border-border bg-white"
                }`}
              >
                {plan.id === "growth" && (
                  <Badge 
                    variant="secondary" 
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-500 text-white border-0 text-xs"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Popular
                  </Badge>
                )}

                {/* Plan Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${PLAN_COLORS[plan.id]} flex items-center justify-center text-white`}>
                    {PLAN_ICONS[plan.id]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground/80">
                      {plan.maxSites === 1 ? "1 website" : `Up to ${plan.maxSites} websites`}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-3xl font-bold text-foreground">${Math.round(plan.price / 100)}</span>
                  <span className="text-muted-foreground/80 text-sm">/month</span>
                </div>

                {/* Features */}
                <div className="space-y-2 flex-1 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{plan.maxSites} {plan.maxSites === 1 ? "website" : "websites"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{plan.postsPerMonth} posts/month</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <span>AI content generation</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <span>RSS automation</span>
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => handleGetStarted(plan.id)}
                  disabled={loadingPlan !== null}
                  className={`w-full ${
                    plan.id === "growth"
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : ""
                  }`}
                  variant={plan.id === "growth" ? "default" : "outline"}
                  data-testid={`button-select-${plan.id}-plan`}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Get Started"
                  )}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/60">
            Cancel anytime. All plans include a 7-day money-back guarantee.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
