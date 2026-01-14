import type { VercelRequest, VercelResponse } from '@vercel/node';
import { userAuthStore } from '../lib/user-auth-store.js';

// API для логина через Telegram бота
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
    console.log('=== LOGIN API CALLED ===');
    const { telegramId, username, firstName, lastName } = request.body;
    console.log('Request body:', {
      telegramId,
      username,
      firstName,
      lastName
    });

    if (!telegramId) {
      console.error('Missing telegramId');
      return response.status(400).json({ error: 'telegramId is required' });
    }

    // Создаем или обновляем пользователя и получаем токены
    console.log('Creating/updating user and generating tokens...');
    const tokens = await userAuthStore.loginOrUpdateUser(telegramId, username, firstName, lastName);
    
    if (!tokens) {
      console.error('Failed to create/update user - loginOrUpdateUser returned null');
      return response.status(500).json({ 
        error: 'Failed to create/update user',
        message: 'UserAuthStore.loginOrUpdateUser returned null. Check logs for details.'
      });
    }
    
    console.log('User logged in successfully, tokens generated');

    // Принудительно используем giftdraw.today
    let webAppUrl = process.env.WEB_APP_URL || 'https://giftdraw.today';
    if (webAppUrl.includes('crypto-lottery-today') || webAppUrl.includes('1fairlabs')) {
      webAppUrl = 'https://giftdraw.today';
    }
    const callbackUrl = `${webAppUrl}/auth?refreshToken=${encodeURIComponent(tokens.refreshToken)}`;

    return response.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      callbackUrl,
    });
  } catch (error: any) {
    console.error('Error in login:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    return response.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
