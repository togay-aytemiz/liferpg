// Shared OpenAI helper for Supabase Edge Functions
// All Edge Functions import from this shared module.

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface OpenAIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

/**
 * Call OpenAI Chat Completions API.
 * Reads OPENAI_API_KEY from Deno env (set via Supabase Dashboard > Secrets).
 */
export async function callOpenAI(
    messages: ChatMessage[],
    options: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
        response_format?: { type: string };
    } = {}
): Promise<string> {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set in environment secrets.");
    }

    const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: options.model ?? "gpt-4o-mini",
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.max_tokens ?? 2000,
            ...(options.response_format ? { response_format: options.response_format } : {}),
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
    }

    const data: OpenAIResponse = await response.json();
    return data.choices[0]?.message?.content ?? "";
}
