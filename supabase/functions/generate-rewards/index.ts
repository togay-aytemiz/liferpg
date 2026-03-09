// supabase/functions/generate-rewards/index.ts
// Edge Function: Generate personalized real-life rewards using AI.
//
// Called automatically after quest generation or when user updates life rhythm.
// The LLM decides what rewards fit the user's lifestyle.
//
// Flow:
//   1. Read user's life_rhythm, current level, and stats
//   2. Call OpenAI to generate milestone rewards
//   3. Delete old AI rewards and insert new ones
//   4. Return generated rewards

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAI } from "../_shared/openai.ts";
import { createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";

const SYSTEM_PROMPT = `You are a reward designer for LifeRPG, a gamified productivity app.

Your job is to generate personalized REAL-LIFE rewards that the user can treat themselves to when they reach certain levels.

You will receive the user's:
- Daily routine (life_rhythm)
- Current level
- Character stats (strength, knowledge, wealth, adventure, social)

You MUST return valid JSON with this exact structure:
{
  "rewards": [
    {
      "title": "Short reward name",
      "description": "Why this reward fits their lifestyle",
      "unlock_level": number (3, 5, 7, 10, 12, 15)
    }
  ]
}

Rules:
- Generate exactly 6 rewards, one for each milestone level: 3, 5, 7, 10, 12, 15
- Rewards should be REAL things they can do or buy (not virtual)
- Rewards should escalate in value/excitement as levels increase:
  - Level 3: Small treat (coffee, snack, short break activity)
  - Level 5: Medium reward (book, movie night, favorite meal)
  - Level 7: Nice reward (day trip, new gear, spa visit)
  - Level 10: Significant reward (weekend getaway, concert, nice purchase)
  - Level 12: Big reward (special experience, new hobby equipment)
  - Level 15: Major reward (travel, big purchase, dream experience)
- Make rewards PERSONAL to what the user described in their routine
  - If they mentioned gym → fitness gear, massage, sportswear
  - If they mentioned reading → special edition book, e-reader, bookstore trip
  - If they mentioned cooking → cooking class, fancy kitchen tool, restaurant visit
  - If they mentioned travel → trip, adventure experience
- Reward titles should be fun and motivating (not generic)
- Keep descriptions to 1 sentence`;

serve(async (req) => {
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
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Fetch user profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (!profile?.life_rhythm) {
            return new Response(
                JSON.stringify({ error: "No life rhythm found. Complete onboarding first." }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Build context for AI
        const userContext = `Daily routine: ${profile.life_rhythm}
Current level: ${profile.level}
Stats - Strength: ${profile.stat_strength}, Knowledge: ${profile.stat_knowledge}, Wealth: ${profile.stat_wealth}, Adventure: ${profile.stat_adventure}, Social: ${profile.stat_social}`;

        // Call OpenAI
        const aiResponse = await callOpenAI(
            [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userContext },
            ],
            {
                model: "gpt-4o-mini",
                temperature: 0.8,
                max_tokens: 1000,
                response_format: { type: "json_object" },
            }
        );

        const generated = JSON.parse(aiResponse);

        // Delete old rewards for this user (replace with fresh AI-generated ones)
        await supabase
            .from("rewards")
            .delete()
            .eq("user_id", user.id);

        // Insert new rewards
        const rewardsToInsert = generated.rewards.map((r: Record<string, unknown>) => ({
            user_id: user.id,
            title: r.title,
            description: r.description,
            unlock_level: r.unlock_level,
            is_redeemed: false,
        }));

        const { data: insertedRewards, error: insertError } = await supabase
            .from("rewards")
            .insert(rewardsToInsert)
            .select();

        if (insertError) {
            return new Response(
                JSON.stringify({ error: "Failed to save rewards", details: insertError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, rewards: insertedRewards }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("generate-rewards error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: String(error) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
