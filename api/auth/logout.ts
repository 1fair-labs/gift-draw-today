import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Разрешаем CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Access-Control-Allow-Credentials', 'true');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Удаляем cookie с сессией, устанавливая его с истекшим временем
    response.setHeader(
      'Set-Cookie',
      'telegram_session=; Path=/; HttpOnly; SameSite=None; Max-Age=0; Secure'
    );

    console.log('User logged out, session cookie cleared');

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
