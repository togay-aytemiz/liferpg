import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callOpenAI } from "../_shared/openai.ts";
import { createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";
import { getQuestGoldReward } from "../../../src/lib/questEconomy.ts";
import { getBossUnlockConfig } from "../../../src/lib/bossUnlock.ts";

const VALID_TYPES = new Set(["daily", "side", "boss"]);
const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard", "epic"]);
const VALID_STATS = new Set(["strength", "knowledge", "wealth", "adventure", "social"]);
const MAX_PROMPT_LENGTH = 500;

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}

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
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { prompt, quest_type } = await req.json();
        if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: "Prompt is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (prompt.trim().length > MAX_PROMPT_LENGTH) {
            return new Response(
                JSON.stringify({ error: `Prompt is too long. Maximum ${MAX_PROMPT_LENGTH} characters.` }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const targetType = VALID_TYPES.has(String(quest_type)) ? String(quest_type) : "side";

        // Read active habits server-side for trustworthy context.
        const { data: activeHabits } = await supabase
            .from("habits")
            .select("title, frequency")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .limit(20);

        const habitsContext = activeHabits && activeHabits.length > 0
            ? activeHabits.map((h: { title: string; frequency: string }) => `${h.title} (${h.frequency})`).join(", ")
            : "None";

        const { data: profile } = await supabase
            .from("profiles")
            .select("level, stat_strength, stat_knowledge, stat_wealth, stat_adventure, stat_social, life_rhythm, likes, dislikes, focus_areas")
            .eq("id", user.id)
            .single();

        const [
            { count: activeDailyCount },
            { count: activeSideCount },
        ] = await Promise.all([
            supabase
                .from("quests")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("is_active", true)
                .eq("quest_type", "daily"),
            supabase
                .from("quests")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("is_active", true)
                .eq("quest_type", "side"),
        ]);

        const systemPrompt = `You are a game master for a real-life habit tracker RPG.
	The user wants to add ONE custom quest (type: ${targetType}).

	CRITICAL AVOIDANCE RULE:
	If the user's request is about NOT doing something (e.g. "don't smoke", "less than 1 hour social media"), treat it as a willpower challenge.
	For avoidance goals, prefer stat_affected = "strength" unless another stat is clearly better.

	The player's current level is ${profile?.level ?? 1}. Tune difficulty, XP, and stat growth to feel fair for that current stage.
	Current stats: strength ${profile?.stat_strength ?? 0}, knowledge ${profile?.stat_knowledge ?? 0}, wealth ${profile?.stat_wealth ?? 0}, adventure ${profile?.stat_adventure ?? 0}, social ${profile?.stat_social ?? 0}.
	Current routine context: ${profile?.life_rhythm || "No saved life rhythm"}.
	Likes: ${profile?.likes || "none"}.
	Dislikes: ${profile?.dislikes || "none"}.
	Focus: ${profile?.focus_areas || "none"}.

	The user already has these active habits: ${habitsContext}
	If the request overlaps an existing habit, keep the quest but make it distinct/complementary.

Return EXACTLY one JSON object with this structure:
{
  "title": "short actionable quest title",
  "description": "1-2 short motivating sentences",
  "difficulty": "easy|medium|hard|epic",
  "stat_affected": "strength|knowledge|wealth|adventure|social",
  "xp_reward": 15,
  "gold_reward": 5,
  "is_avoidance": false
}`;

        const userPrompt = `User custom quest request:\n${prompt.trim()}`;

        const aiResponse = await callOpenAI(
            [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            {
                model: "gpt-4o-mini",
                temperature: 0.7,
                max_tokens: 700,
                response_format: { type: "json_object" },
            }
        );

        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(aiResponse);
        } catch {
            console.error("Failed to parse AI response as JSON:", aiResponse);
            throw new Error("AI returned invalid JSON format.");
        }

        const titleRaw = typeof parsed.title === "string" ? parsed.title.trim() : "";
        const descriptionRaw = typeof parsed.description === "string" ? parsed.description.trim() : "";
        const difficultyRaw = typeof parsed.difficulty === "string" ? parsed.difficulty : "medium";
        const statRaw = typeof parsed.stat_affected === "string" ? parsed.stat_affected : "strength";
        const isAvoidance = parsed.is_avoidance === true;

        const title = titleRaw.length > 0 ? titleRaw.slice(0, 200) : "Custom Quest";
        const description = descriptionRaw.slice(0, 500);
        const difficulty = VALID_DIFFICULTIES.has(difficultyRaw) ? difficultyRaw : "medium";
        const stat_affected = VALID_STATS.has(statRaw)
            ? statRaw
            : isAvoidance
                ? "strength"
                : "knowledge";
        const xp_reward = clamp(Number(parsed.xp_reward) || 15, 5, 100);
        const aiGoldReward = clamp(Number(parsed.gold_reward) || 0, 0, 50);
        const gold_reward = Math.max(
            aiGoldReward,
            getQuestGoldReward(targetType as "daily" | "side" | "boss", difficulty as "easy" | "medium" | "hard" | "epic"),
        );
        const bossUnlockConfig = targetType === "boss"
            ? getBossUnlockConfig({
                difficulty: difficulty as "easy" | "medium" | "hard" | "epic",
                activeDailyCount: activeDailyCount ?? 0,
                sideQuestCount: activeSideCount ?? 0,
            })
            : { unlock_daily_required: 0, unlock_side_required: 0, unlock_rule_mode: "all" as const };

        const { data: newQuest, error: insertError } = await supabase
            .from("quests")
            .insert({
                user_id: user.id,
                quest_type: targetType,
                title,
                description,
                difficulty,
                xp_reward,
                gold_reward,
                stat_affected,
                stat_points: 1,
                is_active: true,
                is_ai_generated: true,
                is_custom: true,
                unlock_daily_required: bossUnlockConfig.unlock_daily_required,
                unlock_side_required: bossUnlockConfig.unlock_side_required,
                unlock_rule_mode: bossUnlockConfig.unlock_rule_mode,
            })
            .select()
            .single();

        if (insertError || !newQuest) {
            throw new Error(`Failed to insert custom quest: ${insertError?.message}`);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "Custom quest added!",
                quest: newQuest,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("create-custom-quest error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: String(error) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
