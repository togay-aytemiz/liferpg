import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdmin, createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";
import { settleDailyStateForUser } from "../_shared/dailySettlement.ts";
import { applyAppDayCheckIn } from "../../../src/lib/streaks.ts";
import { getAppDayKey, getAppDayWindow, getPreviousAppDayKey } from "../../../src/lib/appDay.ts";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: "Missing authorization header" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        const supabase = createSupabaseClient(authHeader);
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
        }

        const supabaseAdmin = createSupabaseAdmin();
        const today = getAppDayKey();
        const previousAppDay = getPreviousAppDayKey(today);
        const previousAppDayWindow = getAppDayWindow(previousAppDay);

        const { data: profileBeforeSettlement, error: profileBeforeSettlementError } = await supabaseAdmin
            .from("profiles")
            .select("created_at, last_daily_settlement_day")
            .eq("id", user.id)
            .maybeSingle();

        if (profileBeforeSettlementError) {
            throw new Error(`Failed to fetch pre-settlement profile: ${profileBeforeSettlementError.message}`);
        }

        const { data: previousDayQuestActivity, error: previousDayQuestActivityError } = await supabaseAdmin
            .from("quests")
            .select("id")
            .eq("user_id", user.id)
            .gte("created_at", previousAppDayWindow.startIso)
            .lt("created_at", previousAppDayWindow.endIso)
            .limit(1);

        if (previousDayQuestActivityError) {
            throw new Error(`Failed to inspect previous app-day quest activity: ${previousDayQuestActivityError.message}`);
        }

        const createdDuringPreviousAppDay = Boolean(
            profileBeforeSettlement?.created_at &&
            profileBeforeSettlement.created_at >= previousAppDayWindow.startIso &&
            profileBeforeSettlement.created_at < previousAppDayWindow.endIso,
        );

        const hadLegacyPreviousAppActivity = createdDuringPreviousAppDay || (previousDayQuestActivity?.length ?? 0) > 0;
        const result = await settleDailyStateForUser(supabaseAdmin as any, user.id);

        const { data: streakRow, error: streakError } = await supabaseAdmin
            .from("streaks")
            .select("current_streak, longest_streak, last_active_date")
            .eq("user_id", user.id)
            .maybeSingle();

        if (streakError) {
            throw new Error(`Failed to fetch streak row: ${streakError.message}`);
        }

        const checkIn = applyAppDayCheckIn(streakRow ?? null, today, {
            previousSettledAppDay: profileBeforeSettlement?.last_daily_settlement_day ?? null,
            legacyPreviousAppActivity: hadLegacyPreviousAppActivity,
        });
        const alreadyCheckedIn = streakRow?.last_active_date === today;

        if (!alreadyCheckedIn) {
            const { error: upsertError } = await supabaseAdmin
                .from("streaks")
                .upsert({
                    user_id: user.id,
                    current_streak: checkIn.currentStreak,
                    longest_streak: checkIn.longestStreak,
                    last_active_date: checkIn.lastActiveDate,
                    xp_multiplier: checkIn.xpMultiplier,
                }, { onConflict: "user_id" });

            if (upsertError) {
                throw new Error(`Failed to record daily streak check-in: ${upsertError.message}`);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                ...result,
                checked_in: !alreadyCheckedIn,
                streak: checkIn.currentStreak,
                xp_multiplier: checkIn.xpMultiplier,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("settle-daily error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: String(error) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
});
