import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const body = await req.text();
    
    // Verify webhook signature
    const signature = req.headers.get("x-paystack-signature");
    if (signature) {
      const hash = createHmac("sha512", PAYSTACK_SECRET_KEY).update(body).digest("hex");
      if (hash !== signature) {
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const event = JSON.parse(body);
    console.log("Paystack webhook event:", event.event);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event.event === "charge.success") {
      const { metadata, customer } = event.data;
      const userId = metadata?.user_id;
      const plan = metadata?.plan;

      if (userId && plan) {
        // Update or insert subscription
        const { error } = await supabase
          .from("subscriptions")
          .upsert({
            user_id: userId,
            plan,
            status: "active",
            paystack_customer_code: customer?.customer_code,
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (error) console.error("Subscription update error:", error);
        else console.log(`Subscription updated: ${userId} -> ${plan}`);
      }
    }

    if (event.event === "subscription.disable" || event.event === "subscription.not_renew") {
      const customerCode = event.data?.customer?.customer_code;
      if (customerCode) {
        const { error } = await supabase
          .from("subscriptions")
          .update({ status: "cancelled", plan: "free", updated_at: new Date().toISOString() })
          .eq("paystack_customer_code", customerCode);
        
        if (error) console.error("Cancellation error:", error);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
