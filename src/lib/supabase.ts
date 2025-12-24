import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

