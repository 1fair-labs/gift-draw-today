import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    // ПРОВЕРКА АВТОРИЗАЦИИ: только авторизованные пользователи могут отправлять сообщения
    const cookies = request.headers.cookie || '';
    const sessionCookie = cookies
      .split(';')
      .find(c => c.trim().startsWith('telegram_session='));

    if (!sessionCookie) {
      console.error('Unauthorized attempt to send message');
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const sessionValue = sessionCookie.split('=')[1];
    let sessionData;
    try {
      sessionData = JSON.parse(
        Buffer.from(sessionValue, 'base64').toString()
      );
    } catch (e) {
      console.error('Invalid session cookie');
      return response.status(401).json({ error: 'Unauthorized' });
    }

    if (!sessionData.authenticated || !sessionData.telegramId) {
      console.error('Session not authenticated');
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { chatId, text, buttons } = request.body;

    if (!chatId || !text) {
      return response.status(400).json({ error: 'chatId and text are required' });
    }

    // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: пользователь может отправлять сообщения только самому себе
    if (chatId !== sessionData.telegramId) {
      console.error(`User ${sessionData.telegramId} attempted to send message to ${chatId}`);
      return response.status(403).json({ error: 'Forbidden: can only send messages to yourself' });
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!BOT_TOKEN) {
      return response.status(500).json({ error: 'BOT_TOKEN not configured' });
    }

    // Формируем reply_markup если есть кнопки
    const replyMarkup = buttons && buttons.length > 0
      ? {
          inline_keyboard: buttons.map((row: any[]) =>
            row.map((button: any) => ({
              text: button.text,
              callback_data: button.callback_data || button.url ? undefined : button.text,
              url: button.url,
            }))
          ),
        }
      : undefined;

    // Отправляем сообщение через Telegram Bot API
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        }),
      }
    );

    // Проверяем content-type перед парсингом JSON
    const contentType = telegramResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await telegramResponse.text();
      console.error('Expected JSON but got:', contentType, 'Response (first 200 chars):', text.substring(0, 200));
      return response.status(500).json({
        error: 'Telegram API returned non-JSON response',
        contentType,
      });
    }

    const data = await telegramResponse.json();

    if (!telegramResponse.ok) {
      console.error('Telegram API error:', data);
      // Возвращаем более детальную информацию об ошибке
      return response.status(telegramResponse.status >= 400 && telegramResponse.status < 500 ? telegramResponse.status : 500).json({
        error: 'Telegram API error',
        details: data,
        errorCode: data.error_code,
        description: data.description,
      });
    }

    return response.status(200).json({
      success: true,
      messageId: data.result.message_id,
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

