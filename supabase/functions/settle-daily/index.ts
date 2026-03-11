import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdmin, createSupabaseClient, corsHeaders } from "../_shared/supabase.ts";
import { settleDailyStateForUser } from "../_shared/dailySettlement.ts";

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
        const result = await settleDailyStateForUser(supabaseAdmin as any, user.id);

        return new Response(
            JSON.stringify({ success: true, ...result }),
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

