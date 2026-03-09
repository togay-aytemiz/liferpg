// Shared Supabase admin client for Edge Functions
// Uses the SERVICE_ROLE_KEY to bypass RLS for server-side operations.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createSupabaseAdmin() {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    return createClient(supabaseUrl, serviceRoleKey);
}

export function createSupabaseClient(authHeader: string) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    return createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
    });
}

/** Standard CORS headers for Edge Functions */
export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
