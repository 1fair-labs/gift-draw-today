import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tokenStore } from '../lib/token-store.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Разрешаем CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = request.query;

    if (!token || typeof token !== 'string') {
      return response.status(400).json({ error: 'Token is required' });
    }

    // Проверяем токен
    console.log('=== CALLBACK API CALLED ===');
    console.log('Token from query:', token ? token.substring(0, 10) + '...' : 'MISSING');
    
    tokenStore.cleanup(); // Очищаем истекшие токены перед проверкой
    const tokenData = tokenStore.getTokenData(token);
    console.log('Token data:', tokenData ? 'FOUND' : 'NOT FOUND');
    console.log('Token data details:', tokenData);

    if (!tokenData) {
      console.error('Token not found');
      return response.status(400).json({ error: 'Invalid or expired token' });
    }

    // Проверяем, привязан ли пользователь
    if (!tokenData.userId) {
      console.error('Token not authorized yet (no userId)');
      return response.status(400).json({ error: 'Token not authorized yet' });
    }
    
    console.log('Token authorized, creating session for userId:', tokenData.userId);

    // Создаем сессию через cookie
    const sessionData = {
      userId: tokenData.userId,
      username: tokenData.username,
      firstName: tokenData.firstName,
      authenticated: true,
    };

    // Устанавливаем cookie с сессией (JWT-like подход)
    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    response.setHeader(
      'Set-Cookie',
      `telegram_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; Secure`
    );

    // Удаляем токен (одноразовый)
    tokenStore.deleteToken(token);

    // Перенаправляем на главную страницу
    const redirectUrl = process.env.WEB_APP_URL || 'https://giftdraw.today';
    return response.redirect(302, redirectUrl);
  } catch (error: any) {
    console.error('Error in auth callback:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

