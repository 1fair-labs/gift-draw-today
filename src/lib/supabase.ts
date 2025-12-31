import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Создаем клиент только если переменные окружения есть
// В противном случае возвращаем null и обрабатываем это в компонентах
export const supabase: SupabaseClient | null = 
  supabaseUrl && supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Проверка для предупреждения в консоли (только в development)
if (import.meta.env.DEV && !supabase) {
  console.warn('⚠️ Supabase environment variables are missing. Some features may not work.');
}

// Типы для таблиц
export interface User {
  id: string;
  wallet_address?: string; // Опционально, так как теперь используем telegram_id
  telegram_id?: number; // Telegram user ID
  anon_id?: string; // Anonymous ID for referral program
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: number;
  owner: string;
  type: 'gold' | 'silver' | 'bronze';
  status: 'available' | 'in_draw' | 'used';
  image?: string;
  draw_id?: string; // Format: YYYYMMDD (e.g., "20251230")
  created_at: string;
}

export interface Draw {
  id: number;
  draw_id: string;
  jackpot: number;
  prize_pool: number;
  participants: number;
  winners: number;
  status: 'active' | 'completed' | 'pending';
  created_at: string;
  updated_at: string;
}

