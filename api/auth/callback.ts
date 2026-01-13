import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseTokenStore } from '../lib/supabase-token-store.js';

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
    
    await supabaseTokenStore.cleanup(); // Очищаем истекшие токены перед проверкой
    const tokenData = await supabaseTokenStore.getTokenData(token);
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
    // Используем SameSite=None для работы с редиректами между доменами
    const cookieString = `telegram_session=${sessionToken}; Path=/; HttpOnly; SameSite=None; Max-Age=${7 * 24 * 60 * 60}; Secure`;
    response.setHeader('Set-Cookie', cookieString);
    console.log('Cookie set for userId:', tokenData.userId);

    // НЕ удаляем токен - разрешаем повторное использование с разных устройств
    // Токен будет действителен в течение 24 часов и может использоваться многократно
    console.log('Token kept for reuse (valid for 24 hours)');

    // Перенаправляем на главную страницу
    const redirectUrl = process.env.WEB_APP_URL || 'https://giftdraw.today';
    
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
    
    // Если не из Telegram WebView, просто редиректим
    return response.redirect(302, redirectUrl);
  } catch (error: any) {
    console.error('Error in auth callback:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

