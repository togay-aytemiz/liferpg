// supabase/functions/skip-quest/index.ts
// Edge Function: Handle quest skip/dislike with REASON tracking.
//
// Records WHY the user doesn't want this quest.
// Enforces a daily skip limit (max 3 per day).
// This data is passed as enriched context to regenerate-quests
// so the LLM avoids generating similar quests in the future.
//
// Flow:
//   1. Check daily skip count (max 3)
//   2. Record the skip in user_quests with skip reason
//   3. Deactivate the quest
//   4. Return remaining skips for the day

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";

const MAX_DAILY_SKIPS = 3;

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

        const { quest_id, reason } = await req.json();
        if (!quest_id) {
            return new Response(
                JSON.stringify({ error: "quest_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!reason || typeof reason !== "string") {
            return new Response(
                JSON.stringify({ error: "reason is required (why are you skipping?)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const today = new Date().toISOString().split("T")[0];

        // 1. Check daily skip count
        const { count: todaySkips } = await supabase
            .from("user_quests")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("quest_date", today)
            .eq("is_completed", false)
            .not("xp_awarded", "gt", 0); // skipped quests have xp_awarded = 0

        if ((todaySkips ?? 0) >= MAX_DAILY_SKIPS) {
            return new Response(
                JSON.stringify({
                    error: "Daily skip limit reached",
                    limit_reached: true,
                    max_skips: MAX_DAILY_SKIPS,
                    message: `You can only skip ${MAX_DAILY_SKIPS} quests per day. Try completing this one or come back tomorrow!`,
                }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 2. Fetch the quest to get its details
        const { data: quest } = await supabase
            .from("quests")
            .select("title, quest_type, stat_affected, difficulty")
            .eq("id", quest_id)
            .single();

        if (!quest) {
            return new Response(
                JSON.stringify({ error: "Quest not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 3. Record skip in user_quests with the skip reason
        await supabase
            .from("user_quests")
            .upsert({
                user_id: user.id,
                quest_id,
                quest_date: today,
                is_completed: false,
                xp_awarded: 0,
                gold_awarded: 0,
                skip_reason: reason,
            }, { onConflict: "user_id,quest_id,quest_date" });

        // 4. Deactivate the quest so it no longer appears
        await supabase
            .from("quests")
            .update({ is_active: false })
            .eq("id", quest_id);

        const remainingSkips = MAX_DAILY_SKIPS - ((todaySkips ?? 0) + 1);

        return new Response(
            JSON.stringify({
                success: true,
                skipped_quest: quest.title,
                skip_reason: reason,
                remaining_skips: remainingSkips,
                max_skips: MAX_DAILY_SKIPS,
                message: `Quest removed. ${remainingSkips} skip${remainingSkips !== 1 ? 's' : ''} remaining today.`,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("skip-quest error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: String(error) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
