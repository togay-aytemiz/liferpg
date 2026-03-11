import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdmin, createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";
import { STATIC_SHOP_ITEMS } from "../../../src/lib/shopCatalog.ts";

function xpRequiredForLevel(level: number) {
  return Math.floor(100 * Math.pow(level, 1.8));
}

serve(async (req) => {
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

    const supabase = createSupabaseClient(authHeader);
    const supabaseAdmin = createSupabaseAdmin();
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { inventory_item_id } = await req.json();
    if (!inventory_item_id || typeof inventory_item_id !== "string") {
      return new Response(JSON.stringify({ error: "inventory_item_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inventoryItem, error: inventoryError } = await supabaseAdmin
      .from("inventory_items")
      .select("*")
      .eq("id", inventory_item_id)
      .eq("user_id", user.id)
      .single();

    if (inventoryError || !inventoryItem) {
      return new Response(JSON.stringify({ error: "Inventory item not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nowIso = new Date().toISOString();

    if (inventoryItem.source_type === "dynamic") {
      if (inventoryItem.is_redeemed) {
        return new Response(JSON.stringify({ error: "Item already redeemed" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (inventoryItem.quantity > 1) {
        const { data: updatedInventory, error: updateError } = await supabaseAdmin
          .from("inventory_items")
          .update({ quantity: inventoryItem.quantity - 1, updated_at: nowIso })
          .eq("id", inventoryItem.id)
          .select("*")
          .single();

        if (updateError) throw updateError;

        return new Response(JSON.stringify({
          success: true,
          message: `${inventoryItem.title} redeemed.`,
          inventory_item: updatedInventory,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updatedInventory, error: updateError } = await supabaseAdmin
        .from("inventory_items")
        .update({ is_redeemed: true, redeemed_at: nowIso, updated_at: nowIso })
        .eq("id", inventoryItem.id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      return new Response(JSON.stringify({
        success: true,
        message: `${inventoryItem.title} redeemed.`,
        inventory_item: updatedInventory,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const staticItem = inventoryItem.item_key ? STATIC_SHOP_ITEMS[inventoryItem.item_key as keyof typeof STATIC_SHOP_ITEMS] : null;
    if (!staticItem) {
      return new Response(JSON.stringify({ error: "Unknown static inventory item" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("hp, max_hp, xp, level, streak_freezes")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let profileUpdates: Record<string, unknown> = {};
    let message = `${staticItem.title} used.`;

    if (staticItem.id === "health_potion") {
      if (profile.hp >= profile.max_hp) {
        return new Response(JSON.stringify({ error: "HP is already full" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      profileUpdates = {
        hp: Math.min(profile.hp + 50, profile.max_hp),
      };
      message = "Health Potion used. HP restored.";
    } else if (staticItem.id === "xp_scroll") {
      const newXp = profile.xp + 250;
      let newLevel = profile.level ?? 1;
      while (newXp >= xpRequiredForLevel(newLevel + 1)) {
        newLevel += 1;
      }

      profileUpdates = {
        xp: newXp,
        level: newLevel,
      };
      message = newLevel > (profile.level ?? 1)
        ? `Scroll of Experience used. You reached Level ${newLevel}.`
        : "Scroll of Experience used. XP gained.";
    } else if (staticItem.id === "streak_freeze") {
      if ((profile.streak_freezes ?? 0) >= 3) {
        return new Response(JSON.stringify({ error: "You already have the maximum number of active streak freezes" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      profileUpdates = {
        streak_freezes: (profile.streak_freezes ?? 0) + 1,
      };
      message = "Streak Freeze activated and added to your protection stash.";
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdates)
      .eq("id", user.id);

    if (profileUpdateError) throw profileUpdateError;

    let resultingInventoryItem: Record<string, unknown> | null = null;

    try {
      if (inventoryItem.quantity > 1) {
        const { data: updatedInventory, error: updateError } = await supabaseAdmin
          .from("inventory_items")
          .update({ quantity: inventoryItem.quantity - 1, updated_at: nowIso })
          .eq("id", inventoryItem.id)
          .select("*")
          .single();

        if (updateError) throw updateError;
        resultingInventoryItem = updatedInventory as Record<string, unknown>;
      } else {
        const { error: deleteError } = await supabaseAdmin
          .from("inventory_items")
          .delete()
          .eq("id", inventoryItem.id);

        if (deleteError) throw deleteError;
      }
    } catch (inventoryMutationError) {
      await supabaseAdmin
        .from("profiles")
        .update({
          hp: profile.hp,
          xp: profile.xp,
          level: profile.level,
          streak_freezes: profile.streak_freezes,
        })
        .eq("id", user.id);
      throw inventoryMutationError;
    }

    return new Response(JSON.stringify({
      success: true,
      message,
      profile_updates: profileUpdates,
      inventory_item: resultingInventoryItem,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("use-inventory-item error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
