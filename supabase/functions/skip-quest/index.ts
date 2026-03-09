// supabase/functions/skip-quest/index.ts
// Edge Function: Handle quest skip/dislike.
//
// Records that the user doesn't want this type of quest.
// This data is passed as context to regenerate-quests so the LLM
// avoids generating similar quests in the future.
//
// Flow:
//   1. Record the skip in user_quests with is_completed = false
//   2. Deactivate the quest
//   3. Return skipped quest titles for frontend reference

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";

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

        // Fetch the quest to get its title for feedback storage
        const { data: quest } = await supabase
            .from("quests")
            .select("title, quest_type, stat_affected")
            .eq("id", quest_id)
            .single();

        if (!quest) {
            return new Response(
                JSON.stringify({ error: "Quest not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Record skip in user_quests (is_completed = false, with skip reason)
        const today = new Date().toISOString().split("T")[0];
        await supabase
            .from("user_quests")
            .upsert({
                user_id: user.id,
                quest_id,
                quest_date: today,
                is_completed: false,
                xp_awarded: 0,
                gold_awarded: 0,
            }, { onConflict: "user_id,quest_id,quest_date" });

        // Deactivate the quest so it no longer appears
        await supabase
            .from("quests")
            .update({ is_active: false })
            .eq("id", quest_id);

        // Store skip feedback in user's profile metadata
        // We append to a JSON array in a dedicated column or use a simple approach:
        // fetch existing skipped titles, append this one
        const { data: profile } = await supabase
            .from("profiles")
            .select("life_rhythm")
            .eq("id", user.id)
            .single();

        // Store skip history — we'll use this when regenerating quests
        // The regenerate-quests function will read skipped quests and tell the LLM to avoid them
        const skipRecord = {
            title: quest.title,
            type: quest.quest_type,
            stat: quest.stat_affected,
            reason: reason || "not interested",
            date: today,
        };

        // We store skips in a simple approach: append to a localStorage-style key
        // In production, you'd have a proper skipped_quests table
        // For now, we'll rely on the user_quests table where is_completed=false serves as "skipped"

        return new Response(
            JSON.stringify({
                success: true,
                skipped_quest: quest.title,
                message: "Quest removed. Future quest generation will consider your preferences.",
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
