// Хранилище токенов через Supabase
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

interface TokenData {
  userId?: number;
  username?: string;
  firstName?: string;
  createdAt: number;
  expiresAt: number;
}

class SupabaseTokenStore {
  private supabase: SupabaseClient | null = null;
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 часа (1 день) в миллисекундах

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
      console.log('Supabase token store initialized with URL:', supabaseUrl.substring(0, 30) + '...');
    } else {
      console.error('⚠️ Supabase credentials not found!');
      console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
      console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'NOT SET');
      console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
      console.error('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
      console.warn('⚠️ Token store will not work without Supabase credentials.');
    }
  }

  // Генерация криптостойкого токена
  generateToken(): string {
    try {
      if (crypto && typeof crypto.randomBytes === 'function') {
        return crypto.randomBytes(32).toString('hex');
      }
      throw new Error('crypto.randomBytes not available');
    } catch (e: any) {
      console.error('Error generating token with crypto:', e);
      // Fallback: используем Web Crypto API если доступен
      try {
        if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && (globalThis as any).crypto.getRandomValues) {
          const array = new Uint8Array(32);
          (globalThis as any).crypto.getRandomValues(array);
          return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        }
      } catch (webCryptoError) {
        console.error('Web Crypto API also failed:', webCryptoError);
      }
      
      // Последний fallback: используем Math.random (менее безопасно, но работает)
      console.warn('Using Math.random fallback for token generation');
      let token = '';
      const chars = '0123456789abcdef';
      for (let i = 0; i < 64; i++) {
        token += chars[Math.floor(Math.random() * 16)];
      }
      return token;
    }
  }

  // Сохранение токена в Supabase
  async saveToken(token: string): Promise<boolean> {
    if (!this.supabase) {
      console.error('Supabase client not initialized');
      return false;
    }

    try {
      const now = Date.now();
      const expiresAt = new Date(now + this.TTL).toISOString();

      const { error } = await this.supabase
        .from('auth_tokens')
        .insert({
          token,
          user_id: null,
          username: null,
          first_name: null,
          created_at: new Date(now).toISOString(),
          expires_at: expiresAt,
        });

      if (error) {
        console.error('Error saving token to Supabase:', error);
        return false;
      }

      console.log('Token saved to Supabase:', token.substring(0, 10) + '...');
      return true;
    } catch (error: any) {
      console.error('Exception saving token:', error);
      return false;
    }
  }

  // Привязка пользователя к токену
  async attachUser(token: string, userId: number, username?: string, firstName?: string): Promise<boolean> {
    if (!this.supabase) {
      console.error('Supabase client not initialized');
      return false;
    }

    try {
      // Сначала проверяем, существует ли токен и не истек ли он
      const { data: tokenData, error: fetchError } = await this.supabase
        .from('auth_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (fetchError || !tokenData) {
        console.error('Token not found in Supabase:', token.substring(0, 10) + '...');
        return false;
      }

      // Проверяем, не истек ли токен
      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt.getTime() < Date.now()) {
        console.error('Token expired:', token.substring(0, 10) + '...');
        // Удаляем истекший токен
        await this.supabase.from('auth_tokens').delete().eq('token', token);
        return false;
      }

      // Если токен уже привязан к пользователю, разрешаем повторное использование
      // (например, если пользователь авторизуется с другого устройства)
      if (tokenData.user_id && tokenData.user_id !== userId) {
        console.log('Token already attached to different user, updating to new user:', userId);
      } else if (tokenData.user_id && tokenData.user_id === userId) {
        console.log('Token already attached to same user, allowing reuse:', userId);
        return true; // Токен уже привязан к этому пользователю, разрешаем использование
      }

      // Обновляем токен с данными пользователя (или обновляем существующие данные)
      const { error: updateError } = await this.supabase
        .from('auth_tokens')
        .update({
          user_id: userId,
          username: username || null,
          first_name: firstName || null,
        })
        .eq('token', token);

      if (updateError) {
        console.error('Error updating token with user data:', updateError);
        return false;
      }

      console.log('User attached successfully to token:', token.substring(0, 10) + '...');
      return true;
    } catch (error: any) {
      console.error('Exception attaching user to token:', error);
      return false;
    }
  }

  // Получение данных по токену
  async getTokenData(token: string): Promise<TokenData | null> {
    if (!this.supabase) {
      console.error('Supabase client not initialized');
      return null;
    }

    try {
      const { data: tokenData, error } = await this.supabase
        .from('auth_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !tokenData) {
        return null;
      }

      // Проверяем TTL
      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt.getTime() < Date.now()) {
        // Удаляем истекший токен
        await this.supabase.from('auth_tokens').delete().eq('token', token);
        return null;
      }

      return {
        userId: tokenData.user_id || undefined,
        username: tokenData.username || undefined,
        firstName: tokenData.first_name || undefined,
        createdAt: new Date(tokenData.created_at).getTime(),
        expiresAt: expiresAt.getTime(),
      };
    } catch (error: any) {
      console.error('Exception getting token data:', error);
      return null;
    }
  }

  // Удаление токена (одноразовый)
  async deleteToken(token: string): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('auth_tokens')
        .delete()
        .eq('token', token);

      return !error;
    } catch (error: any) {
      console.error('Exception deleting token:', error);
      return false;
    }
  }

  // Очистка истекших токенов
  async cleanup(): Promise<void> {
    if (!this.supabase) {
      return;
    }

    try {
      const { error } = await this.supabase
        .from('auth_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired tokens:', error);
      }
    } catch (error: any) {
      console.error('Exception cleaning up tokens:', error);
    }
  }

  // Поиск активного токена без привязанного пользователя
  async findAvailableToken(): Promise<string | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      await this.cleanup();

      const { data: tokens, error } = await this.supabase
        .from('auth_tokens')
        .select('token')
        .is('user_id', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !tokens || tokens.length === 0) {
        return null;
      }

      return tokens[0].token;
    } catch (error: any) {
      console.error('Exception finding available token:', error);
      return null;
    }
  }
}

// Singleton instance
export const supabaseTokenStore = new SupabaseTokenStore();
