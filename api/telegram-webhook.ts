import type { VercelRequest, VercelResponse } from '@vercel/node';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Разрешаем CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return response.status(500).json({ error: 'Bot token not configured' });
  }

  const WEB_APP_URL = process.env.WEB_APP_URL || 'https://giftdraw.today';

  try {
    console.log('Webhook called:', {
      method: request.method,
      hasBody: !!request.body,
      bodyKeys: request.body ? Object.keys(request.body) : [],
    });

    // Для GET запроса - это проверка webhook от Telegram
    if (request.method === 'GET') {
      console.log('GET request - webhook check');
      return response.status(200).json({ status: 'ok' });
    }

    // Для POST запроса - обработка обновлений от Telegram
    if (request.method === 'POST') {
      const update: TelegramUpdate = request.body;
      console.log('POST request received:', JSON.stringify(update, null, 2));

      // Проверяем, что это сообщение
      if (!update.message) {
        console.log('No message in update');
        return response.status(200).json({ ok: true });
      }

      // Если нет текста, но есть сообщение - это может быть другой тип сообщения
      if (!update.message.text) {
        console.log('No text in message, message type:', update.message);
        return response.status(200).json({ ok: true });
      }

      const message = update.message;
      const text = message.text;
      const userId = message.from?.id;
      const username = message.from?.username;
      const firstName = message.from?.first_name || 'User';
      const chatId = message.chat.id;

      console.log('Processing message:', {
        text,
        userId,
        username,
        firstName,
        chatId,
      });

      // Обработка команды /start
      if (text.startsWith('/start')) {
        console.log('Processing /start command');
        const args = text.split(' ');
        
        // Проверяем, есть ли токен авторизации
        if (args.length > 1 && args[1].startsWith('auth_')) {
          const token = args[1].replace('auth_', '');

          if (!userId) {
            await sendMessage(BOT_TOKEN, chatId, '❌ Ошибка: не удалось получить ваш ID');
            return response.status(200).json({ ok: true });
          }

          try {
            // Отправляем данные на API для привязки пользователя к токену
            const verifyResponse = await fetch(`${WEB_APP_URL}/api/auth/verify-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                token,
                userId,
                username,
                firstName,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (!verifyData.success) {
              await sendMessage(
                BOT_TOKEN,
                chatId,
                '❌ Ошибка авторизации. Токен недействителен или истек.'
              );
              return response.status(200).json({ ok: true });
            }

            // Отправляем подтверждение и кнопку для возврата на сайт
            await sendMessage(
              BOT_TOKEN,
              chatId,
              `✅ Авторизация успешна!\n\n` +
              `Вы авторизованы как: ${firstName || username || `ID: ${userId}`}\n\n` +
              `Нажмите кнопку ниже, чтобы вернуться на сайт.`,
              [
                [
                  {
                    text: '🔗 Вернуться на сайт',
                    url: verifyData.callbackUrl,
                  },
                ],
              ]
            );
          } catch (error: any) {
            console.error('Error verifying token:', error);
            await sendMessage(
              BOT_TOKEN,
              chatId,
              '❌ Ошибка при авторизации. Попробуйте еще раз.'
            );
          }
        } else {
          // Обычная команда /start
          console.log('Sending regular /start response');
          try {
            await sendMessage(
              BOT_TOKEN,
              chatId,
              `👋 Привет! Я бот для CryptoDraw.today.\n\n` +
              `Для авторизации на сайте перейдите по ссылке на сайте и нажмите "Connect via Telegram".`
            );
            console.log('Regular /start message sent successfully');
          } catch (error: any) {
            console.error('Error sending regular /start message:', error);
            // Пытаемся отправить хотя бы простое сообщение
            try {
              await sendMessage(BOT_TOKEN, chatId, 'Привет! Для авторизации используйте кнопку на сайте.');
            } catch (e) {
              console.error('Failed to send fallback message:', e);
            }
          }
        }
      } else {
        console.log('Message is not /start command:', text);
      }

      console.log('Webhook processing completed successfully');
      return response.status(200).json({ ok: true });
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in webhook:', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}

// Вспомогательная функция для отправки сообщений
async function sendMessage(
  botToken: string,
  chatId: number,
  text: string,
  buttons?: any[][]
) {
  const replyMarkup = buttons && buttons.length > 0
    ? {
        inline_keyboard: buttons.map((row: any[]) =>
          row.map((button: any) => ({
            text: button.text,
            url: button.url,
          }))
        ),
      }
    : undefined;

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
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

  if (!response.ok) {
    const error = await response.json();
    console.error('Error sending message:', error);
    throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

