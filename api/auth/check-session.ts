import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Разрешаем CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Credentials', 'true');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Получаем cookie с сессией
    const cookies = request.headers.cookie || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('telegram_session='));

    if (!sessionCookie) {
      return response.status(200).json({
        authenticated: false,
      });
    }

    const sessionValue = sessionCookie.split('=')[1];
    
    try {
      // Декодируем base64 сессию
      const sessionData = JSON.parse(
        Buffer.from(sessionValue, 'base64').toString()
      );

      // Поддерживаем оба варианта: userId и telegramId
      const userId = sessionData.userId || sessionData.telegramId;
      
      if (sessionData.authenticated && userId) {
        return response.status(200).json({
          authenticated: true,
          userId: userId,
          username: sessionData.username,
          firstName: sessionData.firstName,
        });
      }
    } catch (e) {
      console.error('Error parsing session:', e);
    }

    return response.status(200).json({
      authenticated: false,
    });
  } catch (error: any) {
    console.error('Error checking session:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

