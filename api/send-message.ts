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
    const { chatId, text, buttons } = request.body;

    if (!chatId || !text) {
      return response.status(400).json({ error: 'chatId and text are required' });
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

