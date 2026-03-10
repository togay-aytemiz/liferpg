// supabase/functions/generate-shop/index.ts
// Edge Function: Generate personalized real-life shop rewards using AI.
//
// Generates diverse real-life items the user can buy with their in-game gold. Items expire
// after a set time (e.g. 7 days).
//
// Flow:
//   1. Verify auth and fetch user profile (life_rhythm).
//   2. Delete any expired unpurchased items for this user to keep shop clean.
//   3. Call OpenAI to generate 4 new items with costs and categories.
//   4. Save the generated items into shop_items with expires_at (now + 7 days).
//   5. Return the items to frontend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAI, validateShopResponse } from "../_shared/openai.ts";
import { createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";

type ExistingShopItem = {
    id: string;
    title: string;
    description: string;
    cost: number;
    category: string;
    expires_at: string;
    is_purchased: boolean;
    created_at: string;
};

type GeneratedShopItem = {
    title: string;
    description: string;
    cost: number;
    category: string;
};

const SHOP_ITEM_COUNT = 4;

function pickUniqueCategoryItems<T extends { category: string }>(items: T[]) {
    const uniqueItems: T[] = [];
    const duplicateItems: T[] = [];
    const seenCategories = new Set<string>();

    for (const item of items) {
        if (seenCategories.has(item.category) || uniqueItems.length >= SHOP_ITEM_COUNT) {
            duplicateItems.push(item);
            continue;
        }

        seenCategories.add(item.category);
        uniqueItems.push(item);
    }

    return { uniqueItems, duplicateItems };
}

const SYSTEM_PROMPT = `You are the mystical Merchant of LifeRPG, an app where real life is gamified.

Your job is to generate a dynamic set of 4 REAL-LIFE items/rewards the user can "purchase" using their in-game Gold.
These should be highly personalized based on their daily routine (life_rhythm).

Return EXACTLY ONE JSON object matching this structure:
{
  "items": [
    {
      "title": "Short, catchy item name",
      "description": "Short description of what they get to do/buy",
      "cost": number (100 to 1500),
      "category": "one_of_the_categories_below"
    }
  ]
}

Categories you MUST choose from (pick exactly one for each item):
- "food_drink" : Fancy coffee, cheat meal, nice dinner out
- "entertainment" : Movies, video game time, Netflix binge
- "self_care" : Massage, extra sleep, spa day, taking a break
- "learning" : Buy a book, course, museum ticket
- "gear" : Sports gear, tech accessory, hobby supplies
- "experience" : Day trip, camping, special event
- "digital" : App purchase, in-game currency for another game
- "social" : Drinks with friends, hanging out

Rules:
- Generate 4 diverse items.
- Use 4 different categories. Never repeat a category in the same batch.
- Range costs from cheap (100-300 gold) to medium (400-800 gold) to one expensive chase item (1000+ gold).
- Keep descriptions motivating. They are rewarding their hard work!`;

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createSupabaseClient(authHeader);

        // Get current user
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Fetch user profile stats to guide context
        const { data: profile } = await supabase
            .from("profiles")
            .select("life_rhythm, likes, dislikes")
            .eq("id", user.id)
            .single();

        if (!profile?.life_rhythm) {
            return new Response(
                JSON.stringify({ error: "No life rhythm found. Complete onboarding first." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Optional: Clean up expired unpurchased items from Db
        const nowIso = new Date().toISOString();
        await supabase
            .from("shop_items")
            .delete()
            .eq("user_id", user.id)
            .eq("is_purchased", false)
            .lt("expires_at", nowIso);

        const { data: activeItems, error: activeItemsError } = await supabase
            .from("shop_items")
            .select("id, title, description, cost, category, expires_at, is_purchased, created_at")
            .eq("user_id", user.id)
            .eq("is_purchased", false)
            .gt("expires_at", nowIso)
            .order("created_at", { ascending: true })
            .order("cost", { ascending: true });

        if (activeItemsError) {
            return new Response(
                JSON.stringify({ error: "Failed to load active shop items", details: activeItemsError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const existingItems = (activeItems as ExistingShopItem[] | null) || [];
        const { uniqueItems: uniqueActiveItems, duplicateItems: duplicateActiveItems } = pickUniqueCategoryItems(existingItems);

        if (duplicateActiveItems.length > 0) {
            await supabase
                .from("shop_items")
                .delete()
                .in("id", duplicateActiveItems.map((item) => item.id));
        }

        if (uniqueActiveItems.length > 0) {
            return new Response(
                JSON.stringify({ success: true, items: uniqueActiveItems }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const likesText = profile?.likes ? `\nThings they LIKE (great reward ideas): ${profile.likes}` : "";
        const dislikesText = profile?.dislikes ? `\nThings they DISLIKE (AVOID suggesting these): ${profile.dislikes}` : "";

        // Call OpenAI
        const aiResponse = await callOpenAI(
            [
                { role: "system", content: SYSTEM_PROMPT },
                {
                    role: "user",
                    content: `Here is my daily routine:\n\n${profile.life_rhythm}${likesText}${dislikesText}\n\nPlease generate 4 enticing items for the shop based on my lifestyle while avoiding things I dislike.`,
                },
            ],
            {
                model: "gpt-4o-mini",
                temperature: 0.8,
                max_tokens: 1500,
                response_format: { type: "json_object" },
            }
        );

        const generated = validateShopResponse(aiResponse);
        const { uniqueItems: uniqueGeneratedItems } = pickUniqueCategoryItems(generated.items as GeneratedShopItem[]);

        if (uniqueGeneratedItems.length === 0) {
            return new Response(
                JSON.stringify({ error: "Shop generation returned no unique items." }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Calculate expires_at: 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const expiresAtIso = expiresAt.toISOString();

        // Prepare data for insertion
        const itemsToInsert = uniqueGeneratedItems.map(item => ({
            user_id: user.id,
            title: item.title,
            description: item.description,
            cost: item.cost,
            category: item.category,
            expires_at: expiresAtIso,
            is_purchased: false,
        }));

        // Insert into database
        const { data: insertedItems, error: insertError } = await supabase
            .from("shop_items")
            .insert(itemsToInsert)
            .select();

        if (insertError) {
            return new Response(
                JSON.stringify({ error: "Failed to save generated shop items", details: insertError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, items: insertedItems }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("generate-shop error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: String(error) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
