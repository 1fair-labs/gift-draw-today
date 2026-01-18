import type { VercelRequest, VercelResponse } from '@vercel/node';
import { userAuthStore } from '../lib/user-auth-store.js';

// API для обновления аватара пользователя
export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { telegramId } = request.body;

    if (!telegramId) {
      return response.status(400).json({ error: 'telegramId is required' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return response.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
    }

    // Принудительно обновляем аватар
    console.log('Refreshing avatar for user:', telegramId);
    const avatarUrl = await userAuthStore.fetchAndSaveAvatar(telegramId, botToken, true);

    if (!avatarUrl) {
      return response.status(404).json({ 
        error: 'Avatar not found or failed to refresh',
        avatarUrl: null 
      });
    }

    return response.status(200).json({
      success: true,
      avatarUrl,
    });
  } catch (error: any) {
    console.error('Error refreshing avatar:', error);
    return response.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Unknown error occurred',
    });
  }
}
