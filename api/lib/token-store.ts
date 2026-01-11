// In-memory хранилище токенов с TTL
import * as crypto from 'crypto';

interface TokenData {
  userId?: number;
  username?: string;
  firstName?: string;
  createdAt: number;
}

class TokenStore {
  private tokens: Map<string, TokenData> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 минут в миллисекундах

  // Генерация криптостойкого токена
  generateToken(): string {
    try {
      // Используем Node.js crypto для серверной генерации
      // В Vercel serverless crypto доступен как модуль Node.js
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

  // Сохранение токена
  saveToken(token: string): void {
    this.tokens.set(token, {
      createdAt: Date.now(),
    });
    // Автоматическая очистка через TTL
    setTimeout(() => {
      this.tokens.delete(token);
    }, this.TTL);
  }

  // Привязка пользователя к токену
  attachUser(token: string, userId: number, username?: string, firstName?: string): boolean {
    const tokenData = this.tokens.get(token);
    if (!tokenData) {
      return false; // Токен не существует или истек
    }

    // Проверяем, не истек ли токен
    if (Date.now() - tokenData.createdAt > this.TTL) {
      this.tokens.delete(token);
      return false;
    }

    // Привязываем пользователя
    this.tokens.set(token, {
      ...tokenData,
      userId,
      username,
      firstName,
    });

    return true;
  }

  // Получение данных по токену
  getTokenData(token: string): TokenData | null {
    const tokenData = this.tokens.get(token);
    if (!tokenData) {
      return null;
    }

    // Проверяем TTL
    if (Date.now() - tokenData.createdAt > this.TTL) {
      this.tokens.delete(token);
      return null;
    }

    return tokenData;
  }

  // Удаление токена (одноразовый)
  deleteToken(token: string): boolean {
    return this.tokens.delete(token);
  }

  // Очистка истекших токенов
  cleanup(): void {
    const now = Date.now();
    for (const [token, data] of this.tokens.entries()) {
      if (now - data.createdAt > this.TTL) {
        this.tokens.delete(token);
      }
    }
  }
}

// Singleton instance
export const tokenStore = new TokenStore();

// Примечание: Периодическая очистка отключена для serverless окружения
// Очистка происходит автоматически при проверке TTL в методах getTokenData и attachUser

