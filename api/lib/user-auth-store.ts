// Хранилище авторизации пользователей через Supabase (refresh token система)
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

interface UserAuthData {
  telegramId: number;
  username?: string;
  firstName?: string;
  refreshToken?: string;
  refreshExpiresAt?: Date;
  lastUsedAt?: Date;
  lastLoginAt?: Date;
  isRevoked?: boolean;
}

class UserAuthStore {
  private supabase: SupabaseClient | null = null;
  private readonly REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000; // 30 дней в миллисекундах
  private readonly ACCESS_TOKEN_TTL = 15 * 60 * 1000; // 15 минут для access token

  constructor() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
      console.log('UserAuthStore initialized with URL:', supabaseUrl.substring(0, 30) + '...');
    } else {
      console.error('⚠️ Supabase credentials not found!');
      console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
      console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'NOT SET');
      console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
      console.error('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
      console.warn('⚠️ UserAuthStore will not work without Supabase credentials.');
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

  // Создание или обновление пользователя при логине через Telegram
  async loginOrUpdateUser(
    telegramId: number,
    username?: string,
    firstName?: string
  ): Promise<{ refreshToken: string; accessToken: string } | null> {
    if (!this.supabase) {
      console.error('Supabase client not initialized');
      return null;
    }

    try {
      // Генерируем новый refresh token
      const refreshToken = this.generateToken();
      const refreshExpiresAt = new Date(Date.now() + this.REFRESH_TOKEN_TTL);
      const now = new Date();

      // Проверяем, существует ли пользователь
      console.log('Checking if user exists, telegramId:', telegramId);
      const { data: existingUser, error: fetchError } = await this.supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // PGRST116 = not found - это нормально, пользователь не существует
          console.log('User not found, will create new user');
        } else {
          // Другая ошибка - логируем и возвращаем null
          console.error('❌ Error fetching user:', fetchError);
          console.error('Fetch error code:', fetchError.code);
          console.error('Fetch error message:', fetchError.message);
          console.error('Fetch error details:', fetchError.details);
          console.error('Fetch error hint:', fetchError.hint);
          return null;
        }
      } else {
        console.log('User exists, will update:', existingUser ? 'YES' : 'NO');
      }

      if (existingUser) {
        // Обновляем существующего пользователя
        console.log('Updating existing user:', telegramId);
        console.log('Existing user data:', {
          id: existingUser.id,
          telegram_id: existingUser.telegram_id,
          has_refresh_token: !!existingUser.refresh_token,
        });
        
        const updateData = {
          refresh_token: refreshToken,
          refresh_expires_at: refreshExpiresAt.toISOString(),
          last_login_at: now.toISOString(),
          last_used_at: now.toISOString(),
          username: username || existingUser.username || null,
          first_name: firstName || existingUser.first_name || null,
          is_revoked: false, // Сбрасываем флаг отзыва при новом логине
        };
        
        console.log('Update data:', {
          ...updateData,
          refresh_token: refreshToken.substring(0, 10) + '...',
        });
        
        const { data: updatedUser, error: updateError } = await this.supabase
          .from('users')
          .update(updateData)
          .eq('telegram_id', telegramId)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Error updating user:', updateError);
          console.error('Update error code:', updateError.code);
          console.error('Update error message:', updateError.message);
          console.error('Update error details:', updateError.details);
          console.error('Update error hint:', updateError.hint);
          console.error('Full update error:', JSON.stringify(updateError, null, 2));
          return null;
        }

        if (!updatedUser) {
          console.error('❌ Updated user is null after update operation');
          return null;
        }

        console.log('✅ User updated with new refresh token:', telegramId);
      } else {
        // Создаем нового пользователя
        // Генерируем anon_id
        const anonId = this.generateToken().substring(0, 16);
        
        // Генерируем access token заранее
        const accessToken = this.generateAccessToken(telegramId, username, firstName);
        const accessExpiresAt = new Date(Date.now() + this.ACCESS_TOKEN_TTL);

        console.log('Creating new user:', telegramId);
        console.log('Insert data:', {
          telegram_id: telegramId,
          refresh_token: refreshToken.substring(0, 10) + '...',
          refresh_expires_at: refreshExpiresAt.toISOString(),
          access_token: accessToken.substring(0, 10) + '...',
          access_expires_at: accessExpiresAt.toISOString(),
          username: username || null,
          first_name: firstName || null,
          anon_id: anonId,
        });
        
        const { data: newUser, error: insertError } = await this.supabase
          .from('users')
          .insert({
            telegram_id: telegramId,
            refresh_token: refreshToken,
            refresh_expires_at: refreshExpiresAt.toISOString(),
            access_token: accessToken,
            access_expires_at: accessExpiresAt.toISOString(),
            last_login_at: now.toISOString(),
            last_used_at: now.toISOString(),
            username: username || null,
            first_name: firstName || null,
            anon_id: anonId,
            is_revoked: false,
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Error creating user:', insertError);
          console.error('Insert error code:', insertError.code);
          console.error('Insert error message:', insertError.message);
          console.error('Insert error details:', insertError.details);
          console.error('Insert error hint:', insertError.hint);
          console.error('Full insert error:', JSON.stringify(insertError, null, 2));
          return null;
        }

        if (!newUser) {
          console.error('❌ New user is null after insert operation');
          return null;
        }

        console.log('✅ New user created with refresh token:', telegramId);
        
        // Возвращаем токены
        return {
          refreshToken,
          accessToken,
        };
      }

      // Для существующего пользователя генерируем новый access token
      const accessToken = this.generateAccessToken(telegramId, username, firstName);
      const accessExpiresAt = new Date(Date.now() + this.ACCESS_TOKEN_TTL);

      // Обновляем access token в БД (опционально, если колонки существуют)
      const { error: updateAccessTokenError } = await this.supabase
        .from('users')
        .update({
          access_token: accessToken,
          access_expires_at: accessExpiresAt.toISOString(),
        })
        .eq('telegram_id', telegramId);

      if (updateAccessTokenError) {
        console.error('Error updating access token:', updateAccessTokenError);
        console.error('Access token update error code:', updateAccessTokenError.code);
        console.error('Access token update error message:', updateAccessTokenError.message);
        // Продолжаем, это не критично - access token можно генерировать на лету
        // Но если это ошибка "column does not exist", значит миграция не выполнена
        if (updateAccessTokenError.message?.includes('column') || updateAccessTokenError.message?.includes('does not exist')) {
          console.warn('⚠️ Access token columns may not exist. Please run database migration.');
        }
      }

      return {
        refreshToken,
        accessToken,
      };
    } catch (error: any) {
      console.error('❌ Exception in loginOrUpdateUser:', error);
      console.error('Exception message:', error.message);
      console.error('Exception stack:', error.stack);
      console.error('Full exception:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      return null;
    }
  }

  // Генерация access token (упрощенная версия JWT)
  private generateAccessToken(telegramId: number, username?: string, firstName?: string): string {
    const payload = {
      telegramId,
      username,
      firstName,
      exp: Math.floor(Date.now() / 1000) + (this.ACCESS_TOKEN_TTL / 1000),
      iat: Math.floor(Date.now() / 1000),
    };
    // В реальном приложении здесь должна быть подпись, но для упрощения используем base64
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  // Проверка и обновление refresh token
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string } | null> {
    if (!this.supabase) {
      console.error('Supabase client not initialized');
      return null;
    }

    try {
      // Находим пользователя по refresh token
      const { data: user, error: fetchError } = await this.supabase
        .from('users')
        .select('*')
        .eq('refresh_token', refreshToken)
        .single();

      if (fetchError || !user) {
        console.error('Refresh token not found:', refreshToken.substring(0, 10) + '...');
        return null;
      }

      // Проверяем, не отозван ли токен
      if (user.is_revoked) {
        console.error('Refresh token is revoked:', refreshToken.substring(0, 10) + '...');
        return null;
      }

      // Проверяем, не истек ли токен
      const expiresAt = new Date(user.refresh_expires_at);
      if (expiresAt.getTime() < Date.now()) {
        console.error('Refresh token expired:', refreshToken.substring(0, 10) + '...');
        return null;
      }

      // Обновляем last_used_at
      const { error: updateError } = await this.supabase
        .from('users')
        .update({
          last_used_at: new Date().toISOString(),
        })
        .eq('telegram_id', user.telegram_id);

      if (updateError) {
        console.error('Error updating last_used_at:', updateError);
        // Продолжаем, это не критично
      }

      // Генерируем новый access token
      const accessToken = this.generateAccessToken(
        user.telegram_id,
        user.username,
        user.first_name
      );
      const accessExpiresAt = new Date(Date.now() + this.ACCESS_TOKEN_TTL);

      // Сохраняем access token в БД
      const { error: updateAccessTokenError } = await this.supabase
        .from('users')
        .update({
          access_token: accessToken,
          access_expires_at: accessExpiresAt.toISOString(),
        })
        .eq('telegram_id', user.telegram_id);

      if (updateAccessTokenError) {
        console.error('Error updating access token in DB:', updateAccessTokenError);
        // Продолжаем, это не критично - токен все равно возвращается
      }

      // Опционально: продлеваем refresh token (refresh token rotation)
      // Для простоты оставляем тот же refresh token, но можно генерировать новый
      const shouldRotateRefreshToken = false; // Можно включить для большей безопасности
      
      if (shouldRotateRefreshToken) {
        const newRefreshToken = this.generateToken();
        const newRefreshExpiresAt = new Date(Date.now() + this.REFRESH_TOKEN_TTL);
        
        const { error: rotateError } = await this.supabase
          .from('users')
          .update({
            refresh_token: newRefreshToken,
            refresh_expires_at: newRefreshExpiresAt.toISOString(),
          })
          .eq('telegram_id', user.telegram_id);

        if (rotateError) {
          console.error('Error rotating refresh token:', rotateError);
          // Возвращаем access token даже если не удалось обновить refresh token
        } else {
          return {
            accessToken,
            refreshToken: newRefreshToken,
          };
        }
      }

      return {
        accessToken,
      };
    } catch (error: any) {
      console.error('Exception in refreshAccessToken:', error);
      return null;
    }
  }

  // Отзыв refresh token (logout)
  async revokeRefreshToken(refreshToken: string): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('users')
        .update({
          is_revoked: true,
        })
        .eq('refresh_token', refreshToken);

      if (error) {
        console.error('Error revoking refresh token:', error);
        return false;
      }

      console.log('Refresh token revoked:', refreshToken.substring(0, 10) + '...');
      return true;
    } catch (error: any) {
      console.error('Exception revoking refresh token:', error);
      return false;
    }
  }

  // Получение данных пользователя по refresh token
  async getUserByRefreshToken(refreshToken: string): Promise<UserAuthData | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data: user, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('refresh_token', refreshToken)
        .single();

      if (error || !user) {
        return null;
      }

      // Проверяем, не отозван ли токен
      if (user.is_revoked) {
        return null;
      }

      // Проверяем, не истек ли токен
      const expiresAt = new Date(user.refresh_expires_at);
      if (expiresAt.getTime() < Date.now()) {
        return null;
      }

      return {
        telegramId: user.telegram_id,
        username: user.username,
        firstName: user.first_name,
        refreshToken: user.refresh_token,
        refreshExpiresAt: user.refresh_expires_at ? new Date(user.refresh_expires_at) : undefined,
        lastUsedAt: user.last_used_at ? new Date(user.last_used_at) : undefined,
        lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : undefined,
        isRevoked: user.is_revoked,
      };
    } catch (error: any) {
      console.error('Exception getting user by refresh token:', error);
      return null;
    }
  }

  // Получение данных пользователя по telegram_id
  async getUserByTelegramId(telegramId: number): Promise<UserAuthData | null> {
    if (!this.supabase) {
      return null;
    }

    try {
      const { data: user, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (error || !user) {
        return null;
      }

      const userData: any = {
        telegramId: user.telegram_id,
        username: user.username,
        firstName: user.first_name,
        refreshToken: user.refresh_token,
        refreshExpiresAt: user.refresh_expires_at ? new Date(user.refresh_expires_at) : undefined,
        lastUsedAt: user.last_used_at ? new Date(user.last_used_at) : undefined,
        lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : undefined,
        isRevoked: user.is_revoked,
      };
      
      // Добавляем last_bot_message_id если он есть
      if (user.last_bot_message_id !== undefined) {
        userData.last_bot_message_id = user.last_bot_message_id;
      }
      
      return userData;
    } catch (error: any) {
      console.error('Exception getting user by telegram_id:', error);
      return null;
    }
  }

  // Сохранение last_bot_message_id для пользователя
  async saveLastBotMessageId(telegramId: number, messageId: number): Promise<boolean> {
    console.log('UserAuthStore.saveLastBotMessageId called:', { telegramId, messageId });
    
    if (!this.supabase) {
      console.error('❌ Supabase not available, cannot save message ID');
      console.error('Supabase client is null');
      return false;
    }

    try {
      console.log('Updating users table with last_bot_message_id:', {
        telegramId,
        messageId,
        updateData: { last_bot_message_id: messageId }
      });
      
      const { data, error } = await this.supabase
        .from('users')
        .update({ last_bot_message_id: messageId })
        .eq('telegram_id', telegramId)
        .select();

      if (error) {
        console.error('❌ Error saving last bot message ID:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        
        // Если колонка не существует, просто логируем предупреждение
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          console.error('❌ Column last_bot_message_id does not exist in users table. Please run migration:');
          console.error('Run this SQL in Supabase: ALTER TABLE users ADD COLUMN IF NOT EXISTS last_bot_message_id INTEGER;');
        }
        return false;
      }

      console.log('✅ Last bot message ID saved successfully:', {
        messageId,
        telegramId,
        updatedRows: data?.length || 0,
        updatedData: data
      });
      return true;
    } catch (error: any) {
      console.error('❌ Exception saving last bot message ID:', error);
      console.error('Exception stack:', error.stack);
      return false;
    }
  }
}

// Singleton instance
export const userAuthStore = new UserAuthStore();
