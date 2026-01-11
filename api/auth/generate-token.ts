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
    // Генерируем токен
    const token = tokenStore.generateToken();
    
    // Сохраняем токен во временное хранилище
    tokenStore.saveToken(token);

    return response.status(200).json({
      success: true,
      token,
      botUrl: `https://t.me/cryptolotterytoday_bot?start=auth_${token}`,
    });
  } catch (error: any) {
    console.error('Error generating token:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

