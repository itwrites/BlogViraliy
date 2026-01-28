import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, FileText, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PLAN_LIMITS } from "@shared/schema";
import type { Site } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface SubscriptionResponse {
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: number;
    plan: {
      id: string;
      nickname: string | null;
    };
  } | null;
  plan: string | null;
  status: string;
  postsUsed: number;
  postsLimit: number;
  sitesUsed: number;
  sitesLimit: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [hasTriggeredGeneration, setHasTriggeredGeneration] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<SubscriptionResponse>({
    queryKey: ["/bv_api/subscription"],
    queryFn: async () => {
      const res = await fetch("/bv_api/subscription", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 2000,
    refetchIntervalInBackground: false,
  });

  const { data: sites, isLoading: sitesLoading } = useQuery<Site[]>({
    queryKey: ["/bv_api/owner/sites"],
    queryFn: async () => {
      const res = await fetch("/bv_api/owner/sites", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sites");
      return res.json();
    },
    enabled: isAuthenticated && subscriptionData?.status === 'active',
  });

  const triggerGenerationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/bv_api/trigger-first-payment-generation");
      return res.json();
    },
    onSuccess: (data) => {
      console.log("[CheckoutSuccess] First payment generation triggered:", data);
    },
    onError: (error) => {
      console.error("[CheckoutSuccess] Failed to trigger generation:", error);
    }
  });

  const planKey = subscriptionData?.plan as keyof typeof PLAN_LIMITS | null;
  const planDetails = planKey ? PLAN_LIMITS[planKey] : null;
  const isActive = subscriptionData?.status === 'active';

  useEffect(() => {
    if (isActive && !hasTriggeredGeneration) {
      setHasTriggeredGeneration(true);
      triggerGenerationMutation.mutate();
    }
  }, [isActive, hasTriggeredGeneration]);

  useEffect(() => {
    if (isActive && !redirecting) {
      // If we have sites, redirect to articles page
      if (sites && sites.length > 0) {
        setRedirecting(true);
        
        const timer = setTimeout(() => {
          // Find a site that has been onboarded, or use the first one
          const onboardedSite = sites.find(s => s.isOnboarded && s.businessDescription);
          const targetSite = onboardedSite || sites[0];
          setLocation(`/owner/sites/${targetSite.id}/articles`);
        }, 2000);

        return () => clearTimeout(timer);
      } else if (!sitesLoading) {
        // No sites exist - redirect to dashboard to create one
        setRedirecting(true);
        const timer = setTimeout(() => {
          setLocation("/owner");
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isActive, sites, sitesLoading, redirecting, setLocation]);

  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground/80">Loading your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-green-400/10 via-blue-400/5 to-transparent rounded-full blur-3xl"
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            rotate: { duration: 60, repeat: Infinity, ease: "linear" },
            scale: { duration: 8, repeat: Infinity, ease: "easeInOut" }
          }}
        />
        <motion.div 
          className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-purple-400/5 via-pink-400/5 to-transparent rounded-full blur-3xl"
          animate={{ 
            rotate: [360, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ 
            rotate: { duration: 50, repeat: Infinity, ease: "linear" },
            scale: { duration: 10, repeat: Infinity, ease: "easeInOut" }
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-lg"
        >
          <div className="rounded-3xl bg-white/95 backdrop-blur-2xl border border-border shadow-xl overflow-hidden">
            <div className="p-8 text-center">
              <motion.div 
                variants={itemVariants}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6"
              >
                <CheckCircle className="w-10 h-10 text-green-600" />
              </motion.div>

              <motion.h1 
                variants={itemVariants}
                className="text-3xl font-bold tracking-tight text-foreground mb-3"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
              >
                Payment Successful!
              </motion.h1>

              <motion.p 
                variants={itemVariants}
                className="text-muted-foreground/80 mb-8"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif' }}
              >
                {planDetails ? (
                  <>Your <span className="font-semibold text-foreground">{planDetails.name}</span> plan is now active.</>
                ) : (
                  <>Your subscription is now active.</>
                )}
              </motion.p>

              <motion.div 
                variants={itemVariants}
                className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20"
              >
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span 
                    className="text-lg font-medium text-foreground"
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
                  >
                    Crafting Your Articles
                  </span>
                </div>

                <p 
                  className="text-muted-foreground/70 text-sm mb-4"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif' }}
                >
                  We're generating your first month of articles based on your business profile. This will only take a moment.
                </p>

                <div className="flex items-center justify-center gap-2 text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">
                    Redirecting to your articles...
                  </span>
                </div>

                {planDetails && (
                  <div className="mt-4 pt-4 border-t border-primary/10">
                    <div className="flex items-center justify-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-muted-foreground/70" />
                        <span className="text-foreground font-medium">{planDetails.postsPerMonth}</span>
                        <span className="text-muted-foreground/70">articles/mo</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          <motion.p 
            variants={itemVariants}
            className="text-center text-[13px] text-muted-foreground/60 mt-6"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif' }}
          >
            A confirmation email has been sent to your inbox.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
