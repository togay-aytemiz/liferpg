// Shared OpenAI helper for Supabase Edge Functions
// All Edge Functions import from this shared module.
// Includes retry with exponential backoff and response validation.

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

// Retryable HTTP status codes
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/**
 * Call OpenAI Chat Completions API with retry + exponential backoff.
 * Reads OPENAI_API_KEY from Deno env (set via Supabase Dashboard > Secrets).
 */
export async function callOpenAI(
    messages: ChatMessage[],
    options: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
        response_format?: { type: string };
    } = {},
    retryConfig: { maxAttempts?: number; baseDelay?: number; requestTimeoutMs?: number } = {}
): Promise<string> {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not set in environment secrets.");
    }

    const maxAttempts = retryConfig.maxAttempts ?? 3;
    const baseDelay = retryConfig.baseDelay ?? 1000;
    const requestTimeoutMs = retryConfig.requestTimeoutMs ?? 25000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let timeoutHandle: number | undefined;
        try {
            const controller = new AbortController();
            timeoutHandle = setTimeout(() => controller.abort(), requestTimeoutMs);

            const response = await fetch(OPENAI_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                signal: controller.signal,
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

                // Retry on retryable status codes
                if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < maxAttempts - 1) {
                    const delay = baseDelay * Math.pow(2, attempt);
                    console.warn(`OpenAI API returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})...`);
                    await sleep(delay);
                    lastError = new Error(`OpenAI API error (${response.status}): ${errorBody}`);
                    continue;
                }

                throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
            }

            const data: OpenAIResponse = await response.json();
            const content = data.choices?.[0]?.message?.content;
            if (!content) {
                throw new Error("OpenAI returned empty response content.");
            }
            return content;

        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                lastError = new Error(`OpenAI request timed out after ${requestTimeoutMs}ms.`);
            } else {
                lastError = error instanceof Error ? error : new Error(String(error));
            }

            // Don't retry on non-retryable errors (e.g., auth errors, bad request)
            if (attempt < maxAttempts - 1 && !isNonRetryableClientError(lastError)) {
                const delay = baseDelay * Math.pow(2, attempt);
                console.warn(`OpenAI call failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts}):`, String(error));
                await sleep(delay);
                continue;
            }
            throw lastError;
        } finally {
            if (timeoutHandle !== undefined) {
                clearTimeout(timeoutHandle);
            }
        }
    }

    throw lastError ?? new Error("OpenAI call failed after all retries.");
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isNonRetryableClientError(error: Error): boolean {
    return /^OpenAI API error \(4\d\d\):/.test(error.message);
}

// ============================================================
// Response Validation Helpers
// ============================================================

/**
 * Safely parse and validate the AI-generated quest JSON.
 * Returns a sanitized object with only known fields, or throws with a helpful message.
 */
export function validateQuestResponse(raw: string): {
    daily_quests: QuestData[];
    side_quests: QuestData[];
    boss_quest: QuestData;
    chain_quests: QuestData[];
} {
    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(`AI returned invalid JSON: ${raw.substring(0, 200)}`);
    }

    const dailyQuests = Array.isArray(parsed.daily_quests) ? parsed.daily_quests : [];
    const sideQuests = Array.isArray(parsed.side_quests) ? parsed.side_quests : [];
    const chainQuests = Array.isArray(parsed.chain_quests) ? parsed.chain_quests : [];
    const bossQuest = parsed.boss_quest && typeof parsed.boss_quest === "object" ? parsed.boss_quest : null;

    if (dailyQuests.length === 0) {
        throw new Error("AI returned no daily quests.");
    }
    if (!bossQuest) {
        throw new Error("AI returned no boss quest.");
    }

    return {
        daily_quests: dailyQuests.map(sanitizeQuest),
        side_quests: sideQuests.map(sanitizeQuest),
        boss_quest: sanitizeQuest(bossQuest as Record<string, unknown>),
        chain_quests: chainQuests.map(sanitizeQuest).slice(0, 3),
    };
}

/**
 * Safely parse and validate the AI-generated rewards JSON.
 */
export function validateRewardResponse(raw: string): { rewards: RewardData[] } {
    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(`AI returned invalid JSON for rewards: ${raw.substring(0, 200)}`);
    }

    const rewards = Array.isArray(parsed.rewards) ? parsed.rewards : [];
    if (rewards.length === 0) {
        throw new Error("AI returned no rewards.");
    }

    return {
        rewards: rewards.map(sanitizeReward),
    };
}

/**
 * Safely parse and validate the AI-generated shop items JSON.
 */
export function validateShopResponse(raw: string): { items: ShopItemData[] } {
    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(`AI returned invalid JSON for shop items: ${raw.substring(0, 200)}`);
    }

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    if (items.length === 0) {
        throw new Error("AI returned no shop items.");
    }

    return {
        items: items.map(sanitizeShopItem),
    };
}

// ============================================================
// Types & Sanitization helpers
// ============================================================

interface QuestData {
    title: string;
    description: string;
    quest_type: string;
    difficulty: string;
    xp_reward: number;
    stat_affected: string | null;
    stat_points: number;
}

interface RewardData {
    title: string;
    description: string;
    unlock_level: number;
}

interface ShopItemData {
    title: string;
    description: string;
    cost: number;
    category: string;
}

const VALID_QUEST_TYPES = new Set(["daily", "side", "boss"]);
const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard", "epic"]);
const VALID_STATS = new Set(["strength", "knowledge", "wealth", "adventure", "social"]);
const VALID_SHOP_CATEGORIES = new Set(["food_drink", "entertainment", "self_care", "learning", "gear", "experience", "digital", "social"]);

/**
 * Whitelist only known quest fields — never spread raw AI output into DB.
 */
function sanitizeQuest(q: Record<string, unknown>): QuestData {
    const questType = VALID_QUEST_TYPES.has(String(q.quest_type)) ? String(q.quest_type) : "daily";
    const difficulty = VALID_DIFFICULTIES.has(String(q.difficulty)) ? String(q.difficulty) : "medium";
    const statAffected = VALID_STATS.has(String(q.stat_affected)) ? String(q.stat_affected) : null;

    return {
        title: typeof q.title === "string" ? q.title.substring(0, 200) : "Unnamed Quest",
        description: typeof q.description === "string" ? q.description.substring(0, 500) : "",
        quest_type: questType,
        difficulty,
        xp_reward: clamp(Number(q.xp_reward) || 15, 5, 200),
        stat_affected: statAffected,
        stat_points: clamp(Number(q.stat_points) || 1, 1, 5),
    };
}

function sanitizeReward(r: Record<string, unknown>): RewardData {
    return {
        title: typeof r.title === "string" ? r.title.substring(0, 200) : "Mystery Reward",
        description: typeof r.description === "string" ? r.description.substring(0, 500) : "",
        unlock_level: clamp(Number(r.unlock_level) || 5, 1, 50),
    };
}

function sanitizeShopItem(i: Record<string, unknown>): ShopItemData {
    const category = VALID_SHOP_CATEGORIES.has(String(i.category)) ? String(i.category) : "entertainment";

    return {
        title: typeof i.title === "string" ? i.title.substring(0, 200) : "Mystery Item",
        description: typeof i.description === "string" ? i.description.substring(0, 500) : "",
        cost: clamp(Number(i.cost) || 100, 50, 2000),
        category: category,
    };
}

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}
