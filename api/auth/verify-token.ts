import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tokenStore } from '../lib/token-store.js';

// API для бота: проверка и привязка пользователя к токену
export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Разрешаем CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, userId, username, firstName } = request.body;

    if (!token || !userId) {
      return response.status(400).json({ error: 'Token and userId are required' });
    }

    // Проверяем, существует ли токен
    const tokenData = tokenStore.getTokenData(token);
    if (!tokenData) {
      return response.status(400).json({ error: 'Invalid or expired token' });
    }

    // Привязываем пользователя к токену
    const success = tokenStore.attachUser(token, userId, username, firstName);

    if (!success) {
      return response.status(400).json({ error: 'Failed to attach user to token' });
    }

    return response.status(200).json({
      success: true,
      callbackUrl: `${process.env.WEB_APP_URL || 'https://giftdraw.today'}/auth/callback?token=${token}`,
    });
  } catch (error: any) {
    console.error('Error verifying token:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

