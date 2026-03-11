// ============================================================
// Supabase Database Types for lifeRPG
// Auto-maintained alongside migration files.
// ============================================================

// -- Enums --

export type QuestType = 'daily' | 'side' | 'boss';
export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'epic';
export type StatCategory = 'strength' | 'knowledge' | 'wealth' | 'adventure' | 'social';
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// -- Tables --

export interface Profile {
    id: string; // uuid, matches auth.users.id
    username: string | null;
    avatar_url: string | null;
    life_rhythm: string | null;
    likes: string | null;
    dislikes: string | null;
    focus_areas: string | null;

    // Core Attributes
    level: number;
    xp: number;
    gold: number;
    hp: number;
    max_hp: number;

    stat_strength: number;
    stat_knowledge: number;
    stat_wealth: number;
    stat_adventure: number;
    stat_social: number;
    streak_freezes: number;
    last_daily_settlement_day: string | null; // YYYY-MM-DD app-day key already settled
    created_at: string;
    updated_at: string;
}

export interface LevelThreshold {
    level: number;
    xp_required: number;
}

export interface Quest {
    id: string;
    user_id: string | null; // null = system quest
    title: string;
    description: string | null;
    quest_type: QuestType;
    difficulty: QuestDifficulty;
    xp_reward: number;
    gold_reward: number;
    stat_affected: StatCategory | null;
    stat_points: number;
    schedule_days: number[] | null;
    is_active: boolean;
    is_ai_generated: boolean;
    is_custom: boolean;
    chain_id: string | null;
    chain_step: number | null;
    chain_total: number | null;
    created_at: string;
    updated_at: string;
}

export interface UserQuest {
    id: string;
    user_id: string;
    quest_id: string;
    quest_date: string; // YYYY-MM-DD app-day key (03:00 -> 03:00)
    is_completed: boolean;
    completed_at: string | null;
    xp_awarded: number;
    gold_awarded: number;
    skip_reason: string | null;
    created_at: string;
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string | null;
    rarity: AchievementRarity;
    unlock_condition: Record<string, unknown>;
    created_at: string;
}

export interface UserAchievement {
    id: string;
    user_id: string;
    achievement_id: string;
    unlocked_at: string;
}

export interface Streak {
    id: string;
    user_id: string;
    current_streak: number;
    longest_streak: number;
    last_active_date: string | null; // YYYY-MM-DD app-day key (03:00 -> 03:00)
    xp_multiplier: number;
    created_at: string;
    updated_at: string;
}

export interface Reward {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    unlock_level: number;
    is_redeemed: boolean;
    redeemed_at: string | null;
    created_at: string;
}

export interface Habit {
    id: string;
    user_id: string;
    title: string;
    is_good: boolean;
    stat_affected: StatCategory;
    frequency: 'daily' | 'weekly' | 'monthly';
    is_active: boolean;
    created_at: string;
}

export interface HabitLog {
    id: string;
    user_id: string;
    habit_id: string;
    created_at: string;
}

export type ShopCategory = 'food_drink' | 'entertainment' | 'self_care' | 'learning' | 'gear' | 'experience' | 'digital' | 'social';

export interface ShopItem {
    id: string;
    user_id: string;
    title: string;
    description: string;
    cost: number;
    category: ShopCategory;
    expires_at: string;
    is_purchased: boolean;
    created_at: string;
}

// -- Database schema mapping (for Supabase client generic) --

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Partial<Profile>;
                Update: Partial<Profile>;
            };
            level_thresholds: {
                Row: LevelThreshold;
                Insert: Partial<LevelThreshold>;
                Update: Partial<LevelThreshold>;
            };
            quests: {
                Row: Quest;
                Insert: Partial<Quest>;
                Update: Partial<Quest>;
            };
            user_quests: {
                Row: UserQuest;
                Insert: Partial<UserQuest>;
                Update: Partial<UserQuest>;
            };
            achievements: {
                Row: Achievement;
                Insert: Partial<Achievement>;
                Update: Partial<Achievement>;
            };
            user_achievements: {
                Row: UserAchievement;
                Insert: Partial<UserAchievement>;
                Update: Partial<UserAchievement>;
            };
            streaks: {
                Row: Streak;
                Insert: Partial<Streak>;
                Update: Partial<Streak>;
            };
            rewards: {
                Row: Reward;
                Insert: Partial<Reward>;
                Update: Partial<Reward>;
            };
            habits: {
                Row: Habit;
                Insert: Partial<Habit>;
                Update: Partial<Habit>;
            };
            habit_logs: {
                Row: HabitLog;
                Insert: Partial<HabitLog>;
                Update: Partial<HabitLog>;
            };
            shop_items: {
                Row: ShopItem;
                Insert: Partial<ShopItem>;
                Update: Partial<ShopItem>;
            };
        };
        Enums: {
            quest_type: QuestType;
            quest_difficulty: QuestDifficulty;
            stat_category: StatCategory;
            achievement_rarity: AchievementRarity;
            shop_category: ShopCategory;
        };
    };
}
