import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Rocket, TrendingUp, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { PLAN_LIMITS } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

type PlanId = "launch" | "growth" | "scale";

interface CheckoutResponse {
  checkoutUrl: string;
}

const COMMON_FEATURES = [
  "Automatic content generation",
  "SEO optimization",
  "Auto-publish to your website",
  "RSS feed automation",
  "Smart topic planning",
  "Scheduling & updates",
];

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  launch: <Rocket className="w-6 h-6" />,
  growth: <TrendingUp className="w-6 h-6" />,
  scale: <Building2 className="w-6 h-6" />,
};

interface SubscriptionResponse {
  status: string;
  plan: string | null;
}

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Check subscription status for owners
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<SubscriptionResponse>({
    queryKey: ["/bv_api/subscription"],
    queryFn: async () => {
      const res = await fetch("/bv_api/subscription", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
    enabled: !!user && user.role === "owner",
  });

  // Redirect to signup if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/signup");
    }
  }, [user, authLoading, setLocation]);

  // Redirect to dashboard if already has active subscription
  useEffect(() => {
    if (!subscriptionLoading && subscriptionData?.status === "active") {
      setLocation("/dashboard");
    }
  }, [subscriptionLoading, subscriptionData, setLocation]);

  const handleGetStarted = async (planId: PlanId) => {
    setLoadingPlan(planId);
    try {
      const response = await apiRequest("POST", "/bv_api/checkout", {
        planId,
      });

      const data: CheckoutResponse = await response.json();

      if (data.checkoutUrl) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl;
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
    hover: {
      y: -5,
      transition: { duration: 0.3 },
    },
  };

  // Show loading while checking auth or subscription status
  if (authLoading || (user?.role === "owner" && subscriptionLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-blue-400/5 via-purple-400/5 to-transparent rounded-full blur-3xl"
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            rotate: { duration: 60, repeat: Infinity, ease: "linear" },
            scale: { duration: 8, repeat: Infinity, ease: "easeInOut" },
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
            scale: { duration: 10, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          variants={prefersReducedMotion ? {} : containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-16"
        >
          {/* Header */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 mb-6"
          >
            Simple, Automated Blogging — Done For You
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl text-gray-600 max-w-2xl mx-auto mb-12"
          >
            Turn your ideas and RSS feeds into fully published SEO blog posts
          </motion.p>

          {/* Common Features Section */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl bg-white/95 backdrop-blur-2xl border border-gray-200/60 p-8 max-w-4xl mx-auto mb-16"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              All plans include
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {COMMON_FEATURES.map((feature, index) => (
                <motion.div
                  key={feature}
                  variants={itemVariants}
                  className="flex items-start gap-3"
                >
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={prefersReducedMotion ? {} : containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
        >
          {(["launch", "growth", "scale"] as const).map((planId) => {
            const plan = PLAN_LIMITS[planId];
            const isPopular = planId === "growth";
            const price = plan.price / 100;

            return (
              <motion.div
                key={planId}
                variants={cardVariants}
                whileHover="hover"
                className={`relative rounded-2xl bg-white/95 backdrop-blur-2xl border border-gray-200/60 overflow-hidden transition-all ${
                  isPopular ? "ring-2 ring-blue-500 md:scale-105" : ""
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  >
                    <Badge className="bg-blue-500 text-white px-3 py-1">
                      Most Popular
                    </Badge>
                  </motion.div>
                )}

                <div className="p-8 h-full flex flex-col">
                  {/* Plan Name & Icon */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-gray-900">{PLAN_ICONS[planId]}</div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {plan.name}
                      </h3>
                    </div>
                  </div>

                  {/* Price */}
                  <motion.div
                    variants={itemVariants}
                    className="mb-6"
                  >
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-gray-900">
                        ${price.toFixed(0)}
                      </span>
                      <span className="text-gray-600">/month</span>
                    </div>
                  </motion.div>

                  {/* Articles Per Month Highlight */}
                  <motion.div
                    variants={itemVariants}
                    className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200/60"
                  >
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Articles per month
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                      {plan.postsPerMonth}
                    </p>
                  </motion.div>

                  {/* Features List */}
                  <motion.div
                    variants={itemVariants}
                    className="mb-8 flex-grow"
                  >
                    <p className="text-sm font-semibold text-gray-600 mb-4">
                      Includes:
                    </p>
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 text-gray-700 text-sm"
                        >
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>

                  {/* CTA Button */}
                  <motion.div variants={itemVariants}>
                    <Button
                      onClick={() => handleGetStarted(planId)}
                      disabled={loadingPlan !== null}
                      className={`w-full h-12 text-base font-medium rounded-xl transition-all ${
                        isPopular
                          ? "bg-blue-500 text-white hover:bg-blue-600"
                          : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                      }`}
                      data-testid={`button-plan-${planId}`}
                    >
                      {loadingPlan === planId ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Get Started"
                      )}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* FAQ or Additional Info Section (optional) */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="text-center text-gray-600 text-sm"
        >
          <p>
            All plans include a 14-day free trial. No credit card required.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
