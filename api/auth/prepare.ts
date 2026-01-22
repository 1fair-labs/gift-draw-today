// api/auth/prepare.ts
// Сохраняет origin для токена авторизации перед переходом к боту

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Простое хранилище в памяти: token -> origin
// В production лучше использовать Redis или базу данных
const authOriginStore = new Map<string, { origin: string; expiresAt: number }>();

// Очистка старых записей каждые 5 минут
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of authOriginStore.entries()) {
    if (data.expiresAt < now) {
      authOriginStore.delete(token);
    }
  }
}, 5 * 60 * 1000); // 5 минут

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, origin } = request.body;

    if (!token || !origin) {
      return response.status(400).json({ error: 'Token and origin are required' });
    }

    // Сохраняем origin для токена на 10 минут
    authOriginStore.set(token, {
      origin,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 минут
    });

    console.log('Origin saved for token:', token.substring(0, 10), 'origin:', origin);

    return response.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error in prepare endpoint:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}

// Экспортируем функцию для получения origin по токену (для использования в telegram-webhook.ts)
export function getOriginForToken(token: string): string | null {
  const data = authOriginStore.get(token);
  if (!data) {
    return null;
  }
  
  // Проверяем, не истекла ли запись
  if (data.expiresAt < Date.now()) {
    authOriginStore.delete(token);
    return null;
  }
  
  return data.origin;
}
