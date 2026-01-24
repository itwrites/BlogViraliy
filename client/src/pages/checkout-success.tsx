import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Zap, Globe, FileText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PLAN_LIMITS } from "@shared/schema";

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

  const planKey = subscriptionData?.plan as keyof typeof PLAN_LIMITS | null;
  const planDetails = planKey ? PLAN_LIMITS[planKey] : null;
  const isActive = subscriptionData?.status === 'active';

  if (authLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] relative overflow-hidden">
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
          <div className="rounded-3xl bg-white/95 backdrop-blur-2xl border border-gray-200/60 shadow-xl overflow-hidden">
            <div className="p-8 text-center">
              <motion.div 
                variants={itemVariants}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6"
              >
                <CheckCircle className="w-10 h-10 text-green-600" />
              </motion.div>

              <motion.h1 
                variants={itemVariants}
                className="text-3xl font-bold tracking-tight text-gray-900 mb-3"
              >
                Welcome to Blog Virality!
              </motion.h1>

              <motion.p 
                variants={itemVariants}
                className="text-gray-600 mb-8"
              >
                Your subscription is now active. You're ready to start creating amazing content.
              </motion.p>

              {planDetails && (
                <motion.div 
                  variants={itemVariants}
                  className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl p-6 mb-8 border border-gray-200/60"
                >
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <span className="text-lg font-semibold text-gray-900">
                      {planDetails.name} Plan
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <FileText className="w-4 h-4 text-gray-400" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{planDetails.postsPerMonth}</p>
                      <p className="text-[11px] text-gray-500 uppercase font-medium">Posts/mo</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Globe className="w-4 h-4 text-gray-400" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {planDetails.maxSites === -1 ? '∞' : planDetails.maxSites}
                      </p>
                      <p className="text-[11px] text-gray-500 uppercase font-medium">Sites</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-gray-400 font-medium">$</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {(planDetails.price / 100).toFixed(0)}
                      </p>
                      <p className="text-[11px] text-gray-500 uppercase font-medium">Per Month</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.div variants={itemVariants}>
                <Button
                  onClick={() => setLocation("/owner")}
                  className="w-full h-12 rounded-xl font-medium shadow-lg"
                  data-testid="button-go-to-dashboard"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            </div>
          </div>

          <motion.p 
            variants={itemVariants}
            className="text-center text-[13px] text-gray-500 mt-6"
          >
            A confirmation email has been sent to your inbox.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
