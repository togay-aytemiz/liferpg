// supabase/functions/buy-item/index.ts
// Edge Function: Handles purchasing items from the Shop with gold.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // Need service key to bypass RLS for secure gold updates
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { item_id } = await req.json();
    if (!item_id) {
      return new Response(JSON.stringify({ error: "item_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user profile and current gold
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("gold, hp, max_hp, xp, level, streak_freezes")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Define items
    const ITEMS: Record<string, { cost: number; title: string; onApply: (p: any) => Promise<any> }> = {
      "health_potion": {
        title: "Health Potion",
        cost: 100,
        onApply: async (p) => {
          const newHP = Math.min(p.hp + 50, p.max_hp);
          return { hp: newHP };
        }
      },
      "xp_scroll": {
        title: "Scroll of Experience",
        cost: 300,
        onApply: async (p) => {
          return { xp: p.xp + 250 }; // Need to handle leveling up below
        }
      },
      "streak_freeze": {
        title: "Streak Freeze",
        cost: 500,
        onApply: async (p) => {
          return { streak_freezes: p.streak_freezes + 1 };
        }
      }
    };

    const item = ITEMS[item_id];
    if (!item) {
      return new Response(JSON.stringify({ error: "Invalid item variant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user has enough gold
    if (profile.gold < item.cost) {
      return new Response(JSON.stringify({ error: "Not enough gold" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Begin transaction logic
    const newGold = profile.gold - item.cost;
    const updates = await item.onApply(profile);
    updates.gold = newGold;

    // Execute update
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (updateError) throw updateError;

    // Note: If they bought XP, they might level up. The frontend handles level ups based on XP thresholds usually,
    // or we could trigger generate-rewards here if we wanted to make fully authoritative backend leveling.
    // For now, we return the new state and let frontend handle visual level ups exactly like complete-quest does.

    return new Response(
      JSON.stringify({
        success: true,
        message: `Purchased ${item.title} successfully.`,
        updates
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("buy-item error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
