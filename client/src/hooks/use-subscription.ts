import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

interface SubscriptionData {
  status: string;
  plan: string | null;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  postsThisMonth?: number;
  postsLimit?: number;
  sitesCount?: number;
  sitesLimit?: number;
}

export function useSubscription() {
  const { user, isLoading: authLoading } = useAuth();
  const isOwner = user?.role === "owner";

  const { data, isLoading, error, refetch } = useQuery<SubscriptionData>({
    queryKey: ["/bv_api/subscription"],
    queryFn: async () => {
      const res = await fetch("/bv_api/subscription", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
    enabled: !!user && isOwner,
    staleTime: 30000, // Cache for 30 seconds
  });

  const hasActiveSubscription = data?.status === "active";
  
  // For non-owners (admin/editor), always return as having access
  if (!isOwner) {
    return {
      isLoading: authLoading,
      hasActiveSubscription: true,
      canCreateContent: true,
      subscription: null,
      isOwner: false,
      refetch,
    };
  }

  return {
    isLoading: authLoading || isLoading,
    hasActiveSubscription,
    canCreateContent: hasActiveSubscription,
    subscription: data,
    isOwner: true,
    refetch,
  };
}
