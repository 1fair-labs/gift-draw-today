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

    // Получаем и сохраняем аватар пользователя (синхронно, интегрировано в flow)
    let avatarUrl: string | null = null;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
      try {
        console.log('Fetching avatar for user:', telegramId);
        avatarUrl = await userAuthStore.fetchAndSaveAvatar(telegramId, botToken);
        if (avatarUrl) {
          console.log('✅ Avatar fetched and saved successfully');
        } else {
          console.log('⚠️ No avatar found for user (user may not have profile photo)');
        }
      } catch (error: any) {
        console.error('Error fetching avatar:', error);
        // Продолжаем даже если аватар не загрузился - это не критично
      }
    } else {
      console.warn('TELEGRAM_BOT_TOKEN not set, cannot fetch avatar');
    }

    // Определяем URL в зависимости от окружения
    let webAppUrl: string;

    // Более надежная проверка: явно определяем preview деплой
    const host = request.headers['x-forwarded-host'] || 
                 request.headers.host || 
                 '';
    const isPreviewDeployment = host.includes('vercel.app') || 
                                process.env.VERCEL_URL?.includes('vercel.app') ||
                                process.env.VERCEL_ENV === 'preview';

    const isProduction = !isPreviewDeployment && 
                        (process.env.VERCEL_ENV === 'production' || 
                         (process.env.WEB_APP_URL && process.env.WEB_APP_URL.includes('giftdraw.today')));

    if (isProduction) {
      // Для продакшна всегда используем www.giftdraw.today
      webAppUrl = process.env.WEB_APP_URL || 'https://www.giftdraw.today';
    } else {
      // Для dev/preview используем URL из заголовков или переменных
      if (process.env.WEB_APP_URL && !process.env.WEB_APP_URL.includes('giftdraw.today')) {
        // Если WEB_APP_URL задан и это не production URL, используем его
        webAppUrl = process.env.WEB_APP_URL;
      } else if (host && host.includes('vercel.app')) {
        // Используем host из заголовков, если это vercel.app
        const protocol = request.headers['x-forwarded-proto'] || 'https';
        webAppUrl = `${protocol}://${host}`;
      } else if (process.env.VERCEL_URL) {
        // Используем VERCEL_URL
        webAppUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        // Последний fallback
        webAppUrl = 'https://www.giftdraw.today';
      }
    }
    // Убираем trailing slash
    webAppUrl = webAppUrl.replace(/\/$/, '');
    
    console.log('Environment detection (login):', {
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      WEB_APP_URL_ENV: process.env.WEB_APP_URL,
      'x-forwarded-host': request.headers['x-forwarded-host'],
      host: request.headers.host,
      isPreviewDeployment,
      isProduction,
      finalWebAppUrl: webAppUrl
    });
    
    const callbackUrl = `${webAppUrl}/auth?refreshToken=${encodeURIComponent(tokens.refreshToken)}`;

    return response.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      callbackUrl,
      avatarUrl: avatarUrl || undefined, // Включаем avatarUrl в ответ, если он был получен
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
