import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdmin, createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";
import { STATIC_SHOP_ITEMS } from "../../../src/lib/shopCatalog.ts";

type InventoryRow = {
  id: string;
  quantity: number;
};

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

    const { item_id, item_source } = await req.json();
    if (!item_id || typeof item_id !== "string") {
      return new Response(JSON.stringify({ error: "item_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sourceType = item_source === "dynamic" ? "dynamic" : "static";

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("gold")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (sourceType === "static") {
      const staticItem = STATIC_SHOP_ITEMS[item_id as keyof typeof STATIC_SHOP_ITEMS];
      if (!staticItem) {
        return new Response(JSON.stringify({ error: "Invalid item variant" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (profile.gold < staticItem.cost) {
        return new Response(JSON.stringify({ error: "Not enough gold" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existingInventory } = await supabaseAdmin
        .from("inventory_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("source_type", "static")
        .eq("item_key", staticItem.id)
        .eq("is_redeemed", false)
        .maybeSingle();

      const nextGold = profile.gold - staticItem.cost;
      const nowIso = new Date().toISOString();

      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ gold: nextGold })
        .eq("id", user.id);

      if (profileUpdateError) {
        throw profileUpdateError;
      }

      let inventoryItem: Record<string, unknown> | null = null;

      try {
        if (existingInventory) {
          const { data: updatedInventory, error: inventoryError } = await supabaseAdmin
            .from("inventory_items")
            .update({ quantity: (existingInventory as InventoryRow).quantity + 1, updated_at: nowIso })
            .eq("id", (existingInventory as InventoryRow).id)
            .select("*")
            .single();

          if (inventoryError) throw inventoryError;
          inventoryItem = updatedInventory as Record<string, unknown>;
        } else {
          const { data: insertedInventory, error: inventoryError } = await supabaseAdmin
            .from("inventory_items")
            .insert({
              user_id: user.id,
              source_type: "static",
              item_key: staticItem.id,
              title: staticItem.title,
              description: staticItem.description,
              category: staticItem.inventoryCategory,
              quantity: 1,
              is_consumable: staticItem.isConsumable,
              is_redeemed: false,
              metadata: { inventory_use_label: staticItem.inventoryUseLabel },
              updated_at: nowIso,
            })
            .select("*")
            .single();

          if (inventoryError) throw inventoryError;
          inventoryItem = insertedInventory as Record<string, unknown>;
        }
      } catch (inventoryError) {
        await supabaseAdmin
          .from("profiles")
          .update({ gold: profile.gold })
          .eq("id", user.id);
        throw inventoryError;
      }

      return new Response(JSON.stringify({
        success: true,
        message: `${staticItem.title} added to your inventory. Use it whenever you want.`,
        gold_remaining: nextGold,
        inventory_item: inventoryItem,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: dynamicItem, error: dynamicItemError } = await supabaseAdmin
      .from("shop_items")
      .select("id, title, description, cost, category, expires_at, is_purchased")
      .eq("id", item_id)
      .eq("user_id", user.id)
      .single();

    if (dynamicItemError || !dynamicItem) {
      return new Response(JSON.stringify({ error: "Item not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (dynamicItem.is_purchased) {
      return new Response(JSON.stringify({ error: "Item already purchased" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(dynamicItem.expires_at).getTime() <= Date.now()) {
      return new Response(JSON.stringify({ error: "This offer has already expired" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.gold < dynamicItem.cost) {
      return new Response(JSON.stringify({ error: "Not enough gold" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nextGold = profile.gold - dynamicItem.cost;
    const nowIso = new Date().toISOString();

    const { error: deductGoldError } = await supabaseAdmin
      .from("profiles")
      .update({ gold: nextGold })
      .eq("id", user.id);

    if (deductGoldError) throw deductGoldError;

    const { error: markPurchasedError } = await supabaseAdmin
      .from("shop_items")
      .update({ is_purchased: true })
      .eq("id", dynamicItem.id);

    if (markPurchasedError) throw markPurchasedError;

    const { data: existingInventory } = await supabaseAdmin
      .from("inventory_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("source_type", "dynamic")
      .eq("title", dynamicItem.title)
      .eq("description", dynamicItem.description)
      .eq("category", dynamicItem.category)
      .eq("is_redeemed", false)
      .maybeSingle();

    let inventoryItem: Record<string, unknown> | null = null;

    try {
      if (existingInventory) {
        const { data: updatedInventory, error: inventoryError } = await supabaseAdmin
          .from("inventory_items")
          .update({ quantity: (existingInventory as InventoryRow).quantity + 1, updated_at: nowIso })
          .eq("id", (existingInventory as InventoryRow).id)
          .select("*")
          .single();

        if (inventoryError) throw inventoryError;
        inventoryItem = updatedInventory as Record<string, unknown>;
      } else {
        const { data: insertedInventory, error: inventoryError } = await supabaseAdmin
          .from("inventory_items")
          .insert({
            user_id: user.id,
            source_type: "dynamic",
            source_item_id: dynamicItem.id,
            item_key: null,
            title: dynamicItem.title,
            description: dynamicItem.description,
            category: dynamicItem.category,
            quantity: 1,
            is_consumable: false,
            is_redeemed: false,
            metadata: { expires_at: dynamicItem.expires_at },
            updated_at: nowIso,
          })
          .select("*")
          .single();

        if (inventoryError) throw inventoryError;
        inventoryItem = insertedInventory as Record<string, unknown>;
      }
    } catch (inventoryError) {
      await supabaseAdmin.from("profiles").update({ gold: profile.gold }).eq("id", user.id);
      await supabaseAdmin.from("shop_items").update({ is_purchased: false }).eq("id", dynamicItem.id);
      throw inventoryError;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `${dynamicItem.title} added to your inventory. Redeem it whenever you want.`,
      gold_remaining: nextGold,
      inventory_item: inventoryItem,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("buy-item error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
