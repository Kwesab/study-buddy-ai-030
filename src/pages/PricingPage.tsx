import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, PLAN_LIMITS, type Plan } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const plans: { key: Plan; features: string[] }[] = [
  {
    key: "free",
    features: ["3 topic uploads", "10 AI chat messages/day", "Summaries & flashcards", "Basic quiz access"],
  },
  {
    key: "basic",
    features: ["15 topic uploads", "100 AI chat messages/day", "AI Teacher lessons", "Full quiz & flashcards", "Performance tracking"],
  },
  {
    key: "pro",
    features: ["Unlimited uploads", "Unlimited AI chats", "AI Teacher (full access)", "Priority AI responses", "Advanced analytics", "Early access to new features"],
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const { currentPlan, loading } = useSubscription();
  const [subscribing, setSubscribing] = useState<Plan | null>(null);

  const handleSubscribe = async (plan: Plan) => {
    if (!user || plan === "free" || plan === currentPlan) return;
    setSubscribing(plan);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ plan, email: user.email }),
      });

      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Subscription failed");

      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      }
    } catch (e: any) {
      toast.error(e.message || "Subscription failed");
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold text-foreground">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-2">Unlock the full power of AI-assisted learning</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {plans.map((plan, i) => {
          const info = PLAN_LIMITS[plan.key];
          const isCurrent = currentPlan === plan.key;
          const isPopular = plan.key === "pro";

          return (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`relative border-border/50 h-full flex flex-col ${isPopular ? "border-primary shadow-glow" : ""}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="gradient-primary text-primary-foreground gap-1">
                      <Crown className="w-3 h-3" /> Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="font-display text-xl">{info.name}</CardTitle>
                  <div className="mt-3">
                    <span className="text-4xl font-display font-bold text-foreground">GHS {info.price}</span>
                    {info.price > 0 && <span className="text-muted-foreground">/month</span>}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 flex-1 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${isPopular ? "gradient-primary text-primary-foreground" : ""}`}
                    variant={isPopular ? "default" : "outline"}
                    disabled={isCurrent || subscribing === plan.key}
                    onClick={() => handleSubscribe(plan.key)}
                  >
                    {subscribing === plan.key ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : plan.key === "free" ? (
                      "Free Forever"
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-1" /> Subscribe
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Payments processed securely by Paystack. Cancel anytime.
      </p>
    </div>
  );
}
