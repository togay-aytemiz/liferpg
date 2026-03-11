// supabase/functions/daily-cron/index.ts
// Edge Function: Daily background job for HP penalties, streak resets, and daily pool rotation.
//
// Triggered via HTTP (e.g. pg_net scheduled cron job).
// Requires SUPABASE_SERVICE_ROLE_KEY to bypass RLS and update all users.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdmin, corsHeaders } from "../_shared/supabase.ts";
import { settleDailyStateForUser } from "../_shared/dailySettlement.ts";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseAdmin = createSupabaseAdmin();

        const { data: profiles, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("id");

        if (profileError || !profiles) {
            throw new Error(`Failed to fetch profiles: ${profileError?.message}`);
        }

        let processed = 0;

        for (const profile of profiles) {
            try {
                const result = await settleDailyStateForUser(supabaseAdmin as any, profile.id);
                if (result.settled) {
                    processed += 1;
                }
            } catch (error) {
                console.warn(`daily-cron failed for user ${profile.id}:`, error);
            }
        }

        return new Response(
            JSON.stringify({ success: true, processed }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    } catch (error) {
        console.error("daily-cron error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", details: String(error) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
});

