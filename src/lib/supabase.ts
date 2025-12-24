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
  wallet_address: string;
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
  created_at: string;
}

