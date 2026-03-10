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
import { callOpenAI, validateRewardResponse } from "../_shared/openai.ts";
import { createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";

const PROFILE_SYNC_GRACE_MS = 2_000;

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
        const { force_regenerate = false } = await req.json().catch(() => ({}));
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const supabase = createSupabaseClient(authHeader);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
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

        if (!force_regenerate) {
            const profileUpdatedAtMs = profile?.updated_at
                ? new Date(profile.updated_at).getTime()
                : 0;

            const { data: existingRewards, error: existingRewardsError } = await supabase
                .from("rewards")
                .select("*")
                .eq("user_id", user.id)
                .order("unlock_level", { ascending: true });

            if (existingRewardsError) {
                console.warn("Failed to read existing rewards before generation:", existingRewardsError.message);
            } else if ((existingRewards?.length ?? 0) >= 6) {
                const latestRewardCreatedAt = Math.max(
                    ...existingRewards!.map((reward) => new Date(reward.created_at).getTime())
                );
                const rewardsMatchCurrentProfile = latestRewardCreatedAt >= (profileUpdatedAtMs - PROFILE_SYNC_GRACE_MS);

                if (!rewardsMatchCurrentProfile) {
                    // fall through to regenerate based on the newer profile snapshot
                } else {
                    return new Response(
                        JSON.stringify({ success: true, rewards: existingRewards, reused_existing: true }),
                        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }
            }
        }

        const likesText = profile?.likes ? `\nLikes: ${profile.likes}` : "";
        const dislikesText = profile?.dislikes ? `\nDislikes (avoid these): ${profile.dislikes}` : "";
        const focusText = profile?.focus_areas ? `\nFocus areas: ${profile.focus_areas}` : "";

        // Build context for AI
        const userContext = `Daily routine: ${profile.life_rhythm}
Current level: ${profile.level}
Stats - Strength: ${profile.stat_strength}, Knowledge: ${profile.stat_knowledge}, Wealth: ${profile.stat_wealth}, Adventure: ${profile.stat_adventure}, Social: ${profile.stat_social}${likesText}${dislikesText}${focusText}`;

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

        const generated = validateRewardResponse(aiResponse);

        // Enforce exact milestone levels to keep progression predictable.
        const milestoneLevels = [3, 5, 7, 10, 12, 15];
        const normalizedRewards = milestoneLevels.map((level, idx) => {
            const fallback = generated.rewards[generated.rewards.length - 1];
            const source = generated.rewards[idx] ?? fallback;
            return {
                title: source?.title ?? `Level ${level} Reward`,
                description: source?.description ?? "A meaningful reward for your progress.",
                unlock_level: level,
            };
        });

        // Read existing rewards first so we can safely remove only old rows
        // after new rows are inserted.
        const { data: oldRewards, error: oldRewardsError } = await supabase
            .from("rewards")
            .select("id")
            .eq("user_id", user.id);

        if (oldRewardsError) {
            return new Response(
                JSON.stringify({ error: "Failed to read existing rewards", details: oldRewardsError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const oldRewardIds = (oldRewards ?? []).map((reward: { id: string }) => reward.id);

        // Insert new rewards — only whitelisted fields from validation
        const rewardsToInsert = normalizedRewards.map(r => ({
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

        if (oldRewardIds.length > 0) {
            const { error: deleteOldError } = await supabase
                .from("rewards")
                .delete()
                .in("id", oldRewardIds);

            if (deleteOldError) {
                console.warn("Failed to delete old rewards after regeneration:", deleteOldError.message);
            }
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
