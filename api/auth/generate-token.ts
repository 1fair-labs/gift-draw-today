import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tokenStore } from '../lib/token-store';

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
    
    // Генерируем токен
    console.log('Calling tokenStore.generateToken()...');
    const token = tokenStore.generateToken();
    console.log('Token generated, length:', token?.length);
    
    if (!token || token.length < 32) {
      console.error('Invalid token generated:', { token, length: token?.length });
      throw new Error('Failed to generate valid token');
    }
    
    // Сохраняем токен во временное хранилище
    console.log('Saving token to store...');
    tokenStore.saveToken(token);
    console.log('Token saved successfully');

    return response.status(200).json({
      success: true,
      token,
      botUrl: `https://t.me/cryptolotterytoday_bot?start=auth_${token}`,
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

