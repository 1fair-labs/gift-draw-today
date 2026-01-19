import type { VercelRequest, VercelResponse } from '@vercel/node';
import { userAuthStore } from '../lib/user-auth-store.js';

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
    const { refreshToken } = request.query;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return response.status(400).json({ error: 'refreshToken is required' });
    }

    // Проверяем refresh token
    console.log('=== CALLBACK API CALLED ===');
    console.log('Refresh token from query:', refreshToken ? refreshToken.substring(0, 10) + '...' : 'MISSING');
    
    const userData = await userAuthStore.getUserByRefreshToken(refreshToken);
    console.log('User data:', userData ? 'FOUND' : 'NOT FOUND');

    if (!userData) {
      console.error('Invalid or expired refresh token');
      return response.status(400).json({ 
        error: 'Invalid or expired refresh token',
        message: 'Please login again through Telegram bot'
      });
    }
    
    console.log('Refresh token valid, creating session for telegramId:', userData.telegramId);

    // Генерируем новый access token
    const tokens = await userAuthStore.refreshAccessToken(refreshToken);
    if (!tokens) {
      console.error('Failed to generate access token');
      return response.status(500).json({ error: 'Failed to generate access token' });
    }

    // Создаем сессию через cookie с refresh token
    const sessionData = {
      userId: userData.telegramId, // Используем userId для совместимости с check-session
      telegramId: userData.telegramId, // Также сохраняем telegramId
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      avatarUrl: userData.avatarUrl,
      refreshToken: refreshToken, // Сохраняем refresh token в cookie
      authenticated: true,
    };

    // Устанавливаем cookie с сессией (JWT-like подход)
    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    // Используем SameSite=None для работы с редиректами между доменами
    const cookieString = `telegram_session=${sessionToken}; Path=/; HttpOnly; SameSite=None; Max-Age=${30 * 24 * 60 * 60}; Secure`; // 30 дней
    response.setHeader('Set-Cookie', cookieString);
    console.log('Cookie set for telegramId:', userData.telegramId);

    // Перенаправляем на главную страницу
    // Определяем URL в зависимости от окружения
    let redirectUrl: string;

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
      redirectUrl = process.env.WEB_APP_URL || 'https://www.giftdraw.today';
    } else {
      // Для dev/preview используем URL из заголовков или переменных
      if (process.env.WEB_APP_URL && !process.env.WEB_APP_URL.includes('giftdraw.today')) {
        // Если WEB_APP_URL задан и это не production URL, используем его
        redirectUrl = process.env.WEB_APP_URL;
      } else if (host && host.includes('vercel.app')) {
        // Используем host из заголовков, если это vercel.app
        const protocol = request.headers['x-forwarded-proto'] || 'https';
        redirectUrl = `${protocol}://${host}`;
      } else if (process.env.VERCEL_URL) {
        // Используем VERCEL_URL
        redirectUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        // Последний fallback
        redirectUrl = 'https://www.giftdraw.today';
      }
    }
    // Убираем trailing slash
    redirectUrl = redirectUrl.replace(/\/$/, '');
    
    console.log('Environment detection (callback):', {
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      WEB_APP_URL_ENV: process.env.WEB_APP_URL,
      'x-forwarded-host': request.headers['x-forwarded-host'],
      host: request.headers.host,
      isPreviewDeployment,
      isProduction,
      finalRedirectUrl: redirectUrl
    });
    
    // Проверяем User-Agent, чтобы определить, открывается ли из Telegram WebView
    const userAgent = request.headers['user-agent'] || '';
    const isTelegramWebView = userAgent.includes('Telegram') || userAgent.includes('WebView');
    
    // Если открывается из Telegram WebView, показываем страницу с редиректом во внешний браузер
    if (isTelegramWebView) {
      return response.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Redirecting...</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background: #0a0a0a;
              color: #fff;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              text-align: center;
            }
            .spinner {
              border: 3px solid rgba(255, 255, 255, 0.1);
              border-top: 3px solid #fff;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin-bottom: 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .link {
              margin-top: 20px;
              padding: 12px 24px;
              background: #0088cc;
              color: #fff;
              text-decoration: none;
              border-radius: 8px;
              display: inline-block;
            }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h2>Authorization successful!</h2>
          <p>Opening in your browser...</p>
          <a href="${redirectUrl}" class="link" id="redirectLink">Open GiftDraw.today</a>
          <p style="margin-top: 20px; font-size: 14px; color: #888;">If the page doesn't open automatically, click the button above</p>
          <script>
            // Пытаемся открыть во внешнем браузере
            const link = document.getElementById('redirectLink');
            
            // Пробуем открыть через window.open с _blank
            try {
              window.open('${redirectUrl}', '_blank', 'noopener,noreferrer');
            } catch (e) {
              console.log('Could not open in new window');
            }
            
            // Также пытаемся через location.href после небольшой задержки
            setTimeout(() => {
              // Если пользователь не нажал на кнопку, пытаемся редиректить
              // Но это может не сработать в WebView, поэтому показываем кнопку
            }, 1000);
          </script>
        </body>
        </html>
      `);
    }
    
    // Если не из Telegram WebView, возвращаем JSON с редиректом для фронтенда
    // Это позволяет фронтенду обработать редирект правильно
    return response.status(200).json({
      success: true,
      redirectUrl: redirectUrl,
    });
  } catch (error: any) {
    console.error('Error in auth callback:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

