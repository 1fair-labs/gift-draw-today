// api/auth/session.ts
// Объединенный handler для операций с сессией: check, refresh, logout

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { userAuthStore } from '../lib/user-auth-store.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Разрешаем CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Credentials', 'true');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Определяем действие из query параметра или body
  const action = request.query.action as string || request.body?.action;

  try {
    // CHECK SESSION - GET запрос без action или с action=check
    if (request.method === 'GET' && (!action || action === 'check')) {
      return await handleCheckSession(request, response);
    }

    // REFRESH TOKEN - POST с action=refresh
    if (request.method === 'POST' && action === 'refresh') {
      return await handleRefreshToken(request, response);
    }

    // LOGOUT - POST с action=logout или без action (по умолчанию для POST)
    if (request.method === 'POST' && (!action || action === 'logout')) {
      return await handleLogout(request, response);
    }

    return response.status(405).json({ error: 'Method or action not allowed' });
  } catch (error: any) {
    console.error('Error in session handler:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

// Проверка сессии
async function handleCheckSession(
  request: VercelRequest,
  response: VercelResponse,
) {
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
          lastName: sessionData.lastName,
          avatarUrl: sessionData.avatarUrl,
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

// Обновление access token
async function handleRefreshToken(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    console.log('=== REFRESH API CALLED ===');
    const { refreshToken } = request.body;
    console.log('Refresh token:', refreshToken ? refreshToken.substring(0, 10) + '...' : 'MISSING');

    if (!refreshToken || typeof refreshToken !== 'string') {
      console.error('Missing refreshToken');
      return response.status(400).json({ error: 'refreshToken is required' });
    }

    // Обновляем access token
    console.log('Refreshing access token...');
    const tokens = await userAuthStore.refreshAccessToken(refreshToken);
    
    if (!tokens) {
      console.error('Failed to refresh token - invalid, expired, or revoked');
      return response.status(401).json({ 
        error: 'Invalid or expired refresh token',
        message: 'Please login again'
      });
    }
    
    console.log('Access token refreshed successfully');

    return response.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || refreshToken, // Возвращаем новый refresh token если был rotation
    });
  } catch (error: any) {
    console.error('Error in refresh:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

// Выход из системы
async function handleLogout(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    // Получаем refresh token из cookie или body
    let refreshToken: string | null = null;

    // Пробуем получить из cookie
    const cookies = request.headers.cookie || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('telegram_session='));

    if (sessionCookie) {
      try {
        const sessionValue = sessionCookie.split('=')[1];
        const sessionData = JSON.parse(
          Buffer.from(sessionValue, 'base64').toString()
        );
        refreshToken = sessionData.refreshToken;
      } catch (e) {
        console.warn('Could not parse session cookie:', e);
      }
    }

    // Если не нашли в cookie, пробуем из body
    if (!refreshToken && request.body) {
      refreshToken = request.body.refreshToken;
    }

    // Отзываем refresh token если он есть
    if (refreshToken) {
      const revoked = await userAuthStore.revokeRefreshToken(refreshToken);
      if (revoked) {
        console.log('Refresh token revoked:', refreshToken.substring(0, 10) + '...');
      } else {
        console.warn('Failed to revoke refresh token');
      }
    }

    // Удаляем cookie с сессией, устанавливая его с истекшим временем
    response.setHeader(
      'Set-Cookie',
      'telegram_session=; Path=/; HttpOnly; SameSite=None; Max-Age=0; Secure'
    );

    console.log('User logged out, session cookie cleared and refresh token revoked');

    return response.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Error in logout:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
