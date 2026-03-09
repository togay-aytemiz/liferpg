import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const openAiKey = Deno.env.get("OPENAI_API_KEY");

        if (!openAiKey) throw new Error("Missing OPENAI_API_KEY");

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("No authorization header");

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Unauthorized");

        const { prompt, quest_type, active_habits } = await req.json();

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: "Prompt is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const validTypes = ['daily', 'side', 'boss'];
        const targetType = validTypes.includes(quest_type) ? quest_type : 'side';

        // AI Prompt to evaluate the custom user goal
        const systemPrompt = `You are a game master for a real-life habit tracker RPG.
The user wants to add a CUSTOM quest (type: ${targetType}) to their list.
Their raw input is: "${prompt}"

Your job is to parse this input and determine the RPG attributes for it.

CRITICAL AVOIDANCE/NEGATIVE GOAL RULES:
Check if the user's input is about NOT doing something (e.g., "Don't smoke", "Less than 2 hours screen time", "No sugar today").
If it is an Avoidance Goal:
- Treat it like a willpower challenge.
- The stat affected should generally be "strength" (representing willpower) or whatever makes sense.
- The title should frame it as a challenge (e.g., "Resist the urge to smoke", "Digital Detox Challenge").
- The description should be motivating and confirm it is an avoidance goal.

CONTEXT AWARENESS:
The user already has the following active habits: ${active_habits ? active_habits.map((h: any) => \`${h.title} (${h.frequency})\`).join(", ") : "None"}.
If their custom prompt is too similar to an existing habit, you should still allow it but perhaps make the title distinct or ensure the stats complement it.

Return EXACTLY ONE JSON object with no markdown formatting. It must match this exact structure:
{
  "title": "Actionable, game-like title for the quest",
  "description": "Short, motivating description (max 2 sentences)",
  "difficulty": "easy", // Must be "easy", "medium", "hard", or "epic"
  "stat_affected": "strength", // Must be "strength", "knowledge", "wealth", "adventure", or "social"
  "xp_reward": 15, // Integer between 5 and 100 based on difficulty
  "gold_reward": 5, // Integer between 0 and 50 based on difficulty
  "is_avoidance": true // true if it's a negative/avoidance goal, else false
}`;

        // Helper function for OpenAI call with retry logic
        async function callOpenAI(sysPrompt: string, retries = 3, baseDelay = 1000): Promise<any> {
            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    const response = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${openAiKey}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            model: "gpt-4o-mini",
                            messages: [
                                { role: "system", content: sysPrompt }
                            ],
                            temperature: 0.7,
                            response_format: { type: "json_object" }
                        }),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        const status = response.status;

                        // Retryable errors: Rate limits (429) and Server Errors (5xx)
                        if ((status === 429 || status >= 500) && attempt < retries) {
                            const delayMs = baseDelay * Math.pow(2, attempt); // 1s, 2s, 4s...
                            console.warn(`OpenAI API error ${status}. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${retries})...`);
                            await new Promise(resolve => setTimeout(resolve, delayMs));
                            continue; // Try next iteration
                        }

                        // Non-retryable error or out of retries
                        throw new Error(`OpenAI API error: ${status} - ${JSON.stringify(errorData)}`);
                    }

                    const data = await response.json();
                    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                        throw new Error("Invalid response structure from OpenAI");
                    }
                    return data;
                } catch (error: any) {
                    if (attempt >= retries) {
                        throw error;
                    }
                    const delayMs = baseDelay * Math.pow(2, attempt);
                    console.warn(`Network/Parse error: ${error.message}. Retrying in ${delayMs}ms (attempt ${attempt + 1}/${retries})...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }

        const openAiResponse = await callOpenAI(systemPrompt);
        const resultText = openAiResponse.choices[0].message.content;

        let questData;
        try {
            questData = JSON.parse(resultText);
        } catch (e) {
            console.error("Failed to parse OpenAI response as JSON:", resultText);
            throw new Error("AI returned invalid JSON format.");
        }

        // Validate basic fields
        if (!questData.title || !questData.difficulty || !questData.stat_affected || typeof questData.xp_reward !== 'number') {
            throw new Error("Missing required fields from AI response.");
        }

        // Insert new custom quest into database
        const { data: newQuest, error: insertError } = await supabase
            .from("quests")
            .insert({
                user_id: user.id,
                quest_type: targetType,
                title: questData.title,
                description: questData.description,
                difficulty: questData.difficulty,
                xp_reward: questData.xp_reward,
                gold_reward: questData.gold_reward || 0,
                stat_affected: questData.stat_affected,
                stat_points: 1,
                is_active: true,
                is_ai_generated: true, // It was evaluated by AI
                is_custom: true, // Created manually by user
            })
            .select()
            .single();

        if (insertError || !newQuest) {
            throw new Error(`Failed to insert modern quest: ${insertError?.message}`);
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
