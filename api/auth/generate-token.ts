import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseTokenStore } from '../lib/supabase-token-store.js';

// Функция для получения userId из сессии
async function getUserIdFromSession(request: VercelRequest): Promise<number | null> {
  try {
    const cookies = request.headers.cookie || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('telegram_session='));

    if (!sessionCookie) {
      return null;
    }

    const sessionValue = sessionCookie.split('=')[1];
    const sessionData = JSON.parse(
      Buffer.from(sessionValue, 'base64').toString()
    );

    if (sessionData.authenticated && sessionData.userId) {
      return sessionData.userId;
    }
  } catch (error) {
    console.error('Error parsing session:', error);
  }
  return null;
}

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
    console.log('Starting token generation...');
    
    // Проверяем, есть ли активная сессия пользователя
    const userId = await getUserIdFromSession(request);
    
    if (userId) {
      console.log('User already authenticated, checking for existing active token, userId:', userId);
      
      // Ищем активный токен для этого пользователя
      const existingToken = await supabaseTokenStore.findActiveTokenByUserId(userId);
      
      if (existingToken) {
        console.log('Found existing active token for user, reusing it');
        const botUrl = `https://t.me/giftdrawtodaybot?start=${existingToken}`;
        
        return response.status(200).json({
          success: true,
          token: existingToken,
          botUrl,
          deepLink: `tg://resolve?domain=giftdrawtodaybot&start=${existingToken}`,
          reused: true, // Флаг, что токен переиспользован
        });
      }
    }
    
    // Если активного токена нет, генерируем новый
    console.log('No active token found, generating new token...');
    console.log('Calling supabaseTokenStore.generateToken()...');
    const token = supabaseTokenStore.generateToken();
    console.log('Token generated, length:', token?.length);
    
    if (!token || token.length < 32) {
      console.error('Invalid token generated:', { token, length: token?.length });
      throw new Error('Failed to generate valid token');
    }
    
    // Сохраняем токен в Supabase
    console.log('Saving token to Supabase...');
    const saved = await supabaseTokenStore.saveToken(token);
    if (!saved) {
      console.error('WARNING: Token was not saved to Supabase!');
      throw new Error('Failed to save token to Supabase');
    }
    console.log('Token saved successfully to Supabase, length:', token.length);
    
    // Проверяем, что токен действительно сохранен
    const checkToken = await supabaseTokenStore.getTokenData(token);
    if (!checkToken) {
      console.error('WARNING: Token was not saved correctly!');
      throw new Error('Failed to save token to Supabase');
    }
    console.log('Token verified in Supabase');

    // Возвращаем URL для открытия бота
    // Используем правильный формат: https://t.me/botusername?start=parameter
    // Telegram автоматически отправит команду /start с параметром при открытии
    const botUrl = `https://t.me/giftdrawtodaybot?start=${token}`;
    
    console.log('Token generated and saved successfully');
    console.log('Bot URL:', botUrl);
    
    return response.status(200).json({
      success: true,
      token,
      botUrl,
      // Также возвращаем deep link для Telegram Desktop/Mobile
      deepLink: `tg://resolve?domain=giftdrawtodaybot&start=${token}`,
    });
  } catch (error: any) {
    console.error('Error generating token:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    return response.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message || 'Failed to generate token',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

