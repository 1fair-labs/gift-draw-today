import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tokenStore } from '../lib/token-store.js';

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
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
        type: string;
      };
    };
    data: string;
  };
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  console.log('=== WEBHOOK HANDLER STARTED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', request.method);
  console.log('URL:', request.url);
  
  // Разрешаем CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    console.log('OPTIONS request - returning 200');
    return response.status(200).end();
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return response.status(500).json({ error: 'Bot token not configured' });
  }
  
  // Логируем первые и последние символы токена для отладки (безопасно)
  console.log('BOT_TOKEN configured:', BOT_TOKEN ? `${BOT_TOKEN.substring(0, 10)}...${BOT_TOKEN.substring(BOT_TOKEN.length - 5)}` : 'NOT SET');

  const WEB_APP_URL = (process.env.WEB_APP_URL || 'https://crypto-lottery-today.vercel.app').replace(/\/$/, '');

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
      console.log('WEB_APP_URL:', WEB_APP_URL);

      // Обработка callback_query (нажатие кнопки)
      if (update.callback_query) {
        console.log('=== CALLBACK QUERY RECEIVED ===');
        const callback = update.callback_query;
        const userId = callback.from.id;
        const username = callback.from.username;
        const firstName = callback.from.first_name || 'User';
        const chatId = callback.message?.chat.id;
        const callbackData = callback.data;
        
        console.log('Callback data:', callbackData);
        console.log('User:', { userId, username, firstName, chatId });

        if (!chatId) {
          console.error('No chatId in callback_query');
          return response.status(200).json({ ok: true });
        }

        // Обработка кнопки авторизации
        if (callbackData === 'auth_check') {
          console.log('Processing auth check button click');
          
          try {
            // Ищем активный токен без привязанного пользователя
            const availableToken = tokenStore.findAvailableToken();
            
            if (!availableToken) {
              console.log('No available token found');
              await answerCallbackQuery(BOT_TOKEN, callback.id, '❌ No active authorization request found. Please try again from the website.');
              await sendMessage(
                BOT_TOKEN,
                chatId,
                '❌ Authorization failed.\n\n' +
                'No active authorization request found. Please return to the website and click "Connect via Telegram" again.\n\n' +
                'If the problem persists, please contact support.'
              );
              return response.status(200).json({ ok: true });
            }

            console.log('Found available token:', availableToken.substring(0, 10) + '...');

            // Привязываем пользователя к токену
            const success = tokenStore.attachUser(availableToken, userId, username, firstName);
            
            if (!success) {
              console.error('Failed to attach user to token');
              await answerCallbackQuery(BOT_TOKEN, callback.id, '❌ Authorization failed');
              await sendMessage(
                BOT_TOKEN,
                chatId,
                '❌ Authorization failed.\n\n' +
                'Failed to process authorization. Please try again from the website.\n\n' +
                'If the problem persists, please contact support.'
              );
              return response.status(200).json({ ok: true });
            }

            // Отправляем подтверждение
            await answerCallbackQuery(BOT_TOKEN, callback.id, '✅ Authorization successful!');
            await sendMessage(
              BOT_TOKEN,
              chatId,
              `✅ Authorization successful!\n\n` +
              `You are authorized as: ${firstName || username || `ID: ${userId}`}\n\n` +
              `Please return to the website to continue.`
            );
            console.log('Authorization successful for user:', userId);
            
            return response.status(200).json({ ok: true });
          } catch (error: any) {
            console.error('Error processing auth check:', error);
            console.error('Error stack:', error.stack);
            await answerCallbackQuery(BOT_TOKEN, callback.id, '❌ Error occurred');
            await sendMessage(
              BOT_TOKEN,
              chatId,
              '❌ Error during authorization.\n\n' +
              'An error occurred while processing your authorization. Please try again from the website.\n\n' +
              'If the problem persists, please contact support.'
            );
            return response.status(200).json({ ok: true });
          }
        }

        // Если callback_data не распознан, просто отвечаем
        await answerCallbackQuery(BOT_TOKEN, callback.id);
        return response.status(200).json({ ok: true });
      }

      // Проверяем, что это сообщение
      if (!update.message) {
        console.log('No message in update, update keys:', Object.keys(update));
        return response.status(200).json({ ok: true });
      }

      // Если нет текста, но есть сообщение - это может быть другой тип сообщения
      if (!update.message.text) {
        console.log('No text in message, message keys:', Object.keys(update.message));
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
      if (text && text.startsWith('/start')) {
        console.log('Processing /start command, text:', text);
        const args = text.split(' ');
        console.log('Args:', args);
        
        // Проверяем, есть ли токен авторизации
        if (args.length > 1 && args[1].startsWith('auth_')) {
          const token = args[1].replace('auth_', '');
          console.log('=== AUTH TOKEN PROCESSING ===');
          console.log('Full command:', text);
          console.log('Args:', args);
          console.log('Token (first 10 chars):', token.substring(0, 10));
          console.log('Token length:', token.length);

          if (!userId) {
            console.error('No userId in message');
            await sendMessage(BOT_TOKEN, chatId, '❌ Error: Could not get your user ID');
            return response.status(200).json({ ok: true });
          }

          try {
            console.log('=== CALLING VERIFY TOKEN API ===');
            console.log('WEB_APP_URL:', WEB_APP_URL);
            console.log('Full verify URL:', `${WEB_APP_URL}/api/auth/verify-token`);
            console.log('Request body:', {
              token: token.substring(0, 10) + '...',
              userId,
              username,
              firstName
            });
            
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

            console.log('Verify response status:', verifyResponse.status);
            console.log('Verify response headers:', Object.fromEntries(verifyResponse.headers.entries()));
            
            const verifyData = await verifyResponse.json();
            console.log('Verify response data:', verifyData);

            if (!verifyData.success) {
              console.error('Token verification failed:', verifyData);
              await sendMessage(
                BOT_TOKEN,
                chatId,
                '❌ Authorization failed. Token is invalid or expired. Please try again from the website.'
              );
              return response.status(200).json({ ok: true });
            }

            // Отправляем подтверждение без кнопки
            console.log('Sending success message...');
            await sendMessage(
              BOT_TOKEN,
              chatId,
              `✅ Authorization successful!\n\n` +
              `You are authorized as: ${firstName || username || `ID: ${userId}`}\n\n` +
              `Please return to the website to continue.`
            );
            console.log('Success message sent');
          } catch (error: any) {
            console.error('Error verifying token:', error);
            console.error('Error stack:', error.stack);
            await sendMessage(
              BOT_TOKEN,
              chatId,
              '❌ Error during authorization. Please try again from the website.'
            );
          }
        } else {
          // Обычная команда /start без токена
          console.log('Regular /start without token');
          try {
            // Проверяем активные токены
            const availableToken = tokenStore.findAvailableToken();
            
            if (availableToken) {
              // Есть активный токен - показываем кнопку авторизации
              console.log('Found available token, showing auth button');
              await sendMessage(
                BOT_TOKEN,
                chatId,
                `👋 Hello! I'm the GiftDraw.today bot.\n\n` +
                `Click the button below to authorize:`,
                [[{ text: '🔐 Authorize', callback_data: 'auth_check' }]]
              );
            } else {
              // Нет активного токена - обычное сообщение
              console.log('No available token, showing regular message');
              await sendMessage(
                BOT_TOKEN,
                chatId,
                `👋 Hello! I'm the GiftDraw.today bot.\n\n` +
                `To authorize, please use the "Connect via Telegram" button on the website.`
              );
            }
            console.log('Regular /start message sent successfully');
          } catch (error: any) {
            console.error('Error sending regular /start message:', error);
            // Fallback на обычное сообщение без кнопки
            try {
              await sendMessage(
                BOT_TOKEN,
                chatId,
                `👋 Hello! I'm the GiftDraw.today bot.\n\n` +
                `To authorize, please use the "Connect via Telegram" button on the website.`
              );
            } catch (fallbackError: any) {
              console.error('Error sending fallback message:', fallbackError);
            }
          }
        }
      } else {
        console.log('Message is not /start command:', text);
      }

      console.log('Webhook processing completed successfully');
      return response.status(200).json({ ok: true });
    }

    console.log('Method not allowed:', request.method);
    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('=== ERROR IN WEBHOOK ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    return response.status(500).json({ error: 'Internal server error' });
  } finally {
    console.log('=== WEBHOOK HANDLER FINISHED ===');
  }
}

// Вспомогательная функция для отправки сообщений
async function sendMessage(
  botToken: string,
  chatId: number,
  text: string,
  buttons?: any[][]
) {
  console.log('sendMessage called:', {
    botTokenPrefix: botToken ? `${botToken.substring(0, 10)}...` : 'NOT SET',
    chatId,
    textLength: text.length,
    hasButtons: !!buttons
  });

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

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  console.log('Sending to Telegram API:', url.replace(botToken, 'TOKEN_HIDDEN'));

  const response = await fetch(url, {
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
  });

  const responseData = await response.json();
  
  if (!response.ok) {
    console.error('Telegram API error response:', {
      status: response.status,
      statusText: response.statusText,
      error: responseData
    });
    throw new Error(`Telegram API error: ${JSON.stringify(responseData)}`);
  }

  console.log('Message sent successfully:', responseData);
  return responseData;
}

// Вспомогательная функция для ответа на callback query
async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
) {
  console.log('Answering callback query:', {
    callbackQueryId,
    text,
    showAlert
  });

  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
  console.log('Sending to Telegram API:', url.replace(botToken, 'TOKEN_HIDDEN'));

  const body: any = {
    callback_query_id: callbackQueryId,
    show_alert: showAlert,
  };
  
  if (text) {
    body.text = text;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseData = await response.json();
  
  if (!response.ok) {
    console.error('Telegram API error response:', {
      status: response.status,
      statusText: response.statusText,
      error: responseData
    });
    throw new Error(`Telegram API error: ${JSON.stringify(responseData)}`);
  }

  console.log('Callback query answered successfully:', responseData);
  return responseData;
}

