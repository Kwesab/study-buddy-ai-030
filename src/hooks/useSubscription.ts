import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Plan = "free" | "basic" | "pro";

export interface Subscription {
  plan: Plan;
  status: string;
  current_period_end: string | null;
}

export const PLAN_LIMITS: Record<Plan, { uploads: number; aiChats: number; teacher: boolean; name: string; price: number }> = {
  free: { uploads: 3, aiChats: 10, teacher: false, name: "Free", price: 0 },
  basic: { uploads: 15, aiChats: 100, teacher: true, name: "Basic", price: 30 },
  pro: { uploads: -1, aiChats: -1, teacher: true, name: "Pro", price: 50 },
};

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    
    const fetch = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("plan, status, current_period_end")
        .eq("user_id", user.id)
        .single();
      
      setSubscription(data ? { plan: data.plan as Plan, status: data.status, current_period_end: data.current_period_end } : { plan: "free", status: "active", current_period_end: null });
      setLoading(false);
    };
    fetch();
  }, [user]);

  const currentPlan = subscription?.plan || "free";
  const limits = PLAN_LIMITS[currentPlan];
  const isPro = currentPlan === "pro";
  const isBasic = currentPlan === "basic";
  const isFree = currentPlan === "free";

  return { subscription, loading, currentPlan, limits, isPro, isBasic, isFree };
}
