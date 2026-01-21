import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore - ESM import works in Vercel runtime
import { userAuthStore } from './lib/user-auth-store.js';

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

  // Определяем URL в зависимости от окружения
  let WEB_APP_URL: string;

  // Более надежная проверка: явно определяем preview деплой
  const host = request.headers['x-forwarded-host'] || 
               request.headers.host || 
               '';
  const isPreviewDeployment = host.includes('vercel.app') || 
                              process.env.VERCEL_URL?.includes('vercel.app') ||
                              process.env.VERCEL_ENV === 'preview';

  const isProduction = !isPreviewDeployment && 
                      (process.env.VERCEL_ENV === 'production' || 
                       (process.env.WEB_APP_URL && process.env.WEB_APP_URL.includes('giftdraw.today')));

  if (isProduction) {
    // Для продакшна всегда используем www.giftdraw.today
    WEB_APP_URL = process.env.WEB_APP_URL || 'https://www.giftdraw.today';
  } else {
    // Для dev/preview используем URL из заголовков или переменных
    if (process.env.WEB_APP_URL && !process.env.WEB_APP_URL.includes('giftdraw.today')) {
      // Если WEB_APP_URL задан и это не production URL, используем его
      WEB_APP_URL = process.env.WEB_APP_URL;
    } else if (host && host.includes('vercel.app')) {
      // Используем host из заголовков, если это vercel.app
      const protocol = request.headers['x-forwarded-proto'] || 'https';
      WEB_APP_URL = `${protocol}://${host}`;
    } else if (process.env.VERCEL_URL) {
      // Используем VERCEL_URL
      WEB_APP_URL = `https://${process.env.VERCEL_URL}`;
    } else {
      // Последний fallback
      WEB_APP_URL = 'https://www.giftdraw.today';
    }
  }
  // Убираем trailing slash
  WEB_APP_URL = WEB_APP_URL.replace(/\/$/, '');
  
  console.log('Environment detection:', {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    WEB_APP_URL_ENV: process.env.WEB_APP_URL,
    'x-forwarded-host': request.headers['x-forwarded-host'],
    host: request.headers.host,
    isPreviewDeployment,
    isProduction,
    finalWEB_APP_URL: WEB_APP_URL
  });

  try {
    console.log('Webhook called:', {
      method: request.method,
      hasBody: !!request.body,
      bodyKeys: request.body ? Object.keys(request.body) : [],
    });

    // Для GET запроса - это проверка webhook от Telegram
    if (request.method === 'GET') {
      console.log('GET request - webhook check');
      response.status(200);
      return response.json({ status: 'ok' });
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
        const lastName = callback.from.last_name;
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
            // Используем новую систему авторизации - логиним пользователя
            console.log('=== CALLING LOGIN API (from button) ===');
            console.log('WEB_APP_URL:', WEB_APP_URL);
            console.log('Full login URL:', `${WEB_APP_URL}/api/auth/login`);
            
            // Вызываем loginOrUpdateUser напрямую
            console.log('Calling login directly (from button):', {
              telegramId: userId,
              username,
              firstName,
              lastName
            });
            
            const tokens = await userAuthStore.loginOrUpdateUser(userId, username, firstName, lastName);
            
            if (!tokens || !tokens.refreshToken) {
              console.error('Login failed - tokens not generated:', tokens);
              await answerCallbackQuery(BOT_TOKEN, callback.id, '❌ Authorization failed');
              await sendMessage(
                BOT_TOKEN,
                chatId,
                '❌ Authorization failed.\n\n' +
                'Failed to create session. Please try again from the website.\n\n' +
                'If the problem persists, please contact support.',
                undefined,
                userId
              );
              return response.status(200).json({ ok: true });
            }

            console.log('Login successful (from button), tokens generated');
            
            // Получаем аватар пользователя (если нужно) - в фоне, не блокируем авторизацию
            // Запускаем асинхронно, не ждем результата
            userAuthStore.fetchAndSaveAvatar(userId, BOT_TOKEN).catch((avatarError: any) => {
              console.error('Error fetching avatar (non-critical, running in background):', avatarError);
              // Игнорируем ошибку - аватар не критичен для авторизации
            });

            // Формируем ссылку на callback для авторизации на сайте
            const callbackUrl = `${WEB_APP_URL}/auth?refreshToken=${encodeURIComponent(tokens.refreshToken)}`;
            
            // Отправляем подтверждение со ссылкой для перехода на сайт
            await answerCallbackQuery(BOT_TOKEN, callback.id, '✅ Authorization successful!');
            const fullName = ((firstName || '') + (lastName ? ' ' + lastName : '')).trim();
            await sendMessage(
              BOT_TOKEN,
              chatId,
              `✅ Authorization successful!\n\n` +
              `You are authorized as: ${fullName || username || `ID: ${userId}`}\n\n` +
              `Click the link below to return to the website.\n` +
              `(Tap and hold, then select "Open in browser" if needed)`,
              [[{ text: '🌐 Open GiftDraw.today', url: callbackUrl }]],
              userId
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
              'If the problem persists, please contact support.',
              undefined,
              userId
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
      const lastName = message.from?.last_name;
      const chatId = message.chat.id;

      console.log('Processing message:', {
        text,
        userId,
        username,
        firstName,
        lastName,
        chatId,
      });

      // Обработка команды /start
      if (text && text.startsWith('/start')) {
        console.log('Processing /start command, text:', text);
        const args = text.split(' ');
        console.log('Args:', args);
        
        // Сохраняем message_id сообщения пользователя для удаления после отправки ответа
        const userMessageId = message.message_id;
        
        // Проверяем, есть ли токен авторизации (теперь без префикса auth_)
        if (args.length > 1 && args[1]) {
          const token = args[1]; // Токен идет напрямую без префикса
          console.log('=== AUTH TOKEN PROCESSING ===');
          console.log('Full command:', text);
          console.log('Args:', args);
          console.log('Token (first 10 chars):', token.substring(0, 10));
          console.log('Token length:', token.length);

          if (!userId) {
            console.error('No userId in message');
            await sendMessage(BOT_TOKEN, chatId, '❌ Error: Could not get your user ID', undefined, userId);
            return response.status(200).json({ ok: true });
          }

          try {
            // ВАЖНО: Используем прямую функцию авторизации, НЕ fetch запрос!
            // Если вы видите "CALLING LOGIN API" в логах - это старая версия кода!
            console.log('=== CALLING LOGIN DIRECTLY (v4 - COMMIT ab1ed4e - NO FETCH!) ===');
            console.log('=== THIS IS THE NEW CODE - IF YOU SEE "CALLING LOGIN API" ABOVE, VERCEL IS USING OLD CODE ===');
            console.log('Request data:', {
              telegramId: userId,
              username,
              firstName,
              lastName
            });
            
            // Вызываем loginOrUpdateUser напрямую (НЕ используем fetch!)
            const tokens = await userAuthStore.loginOrUpdateUser(userId, username, firstName, lastName);
            
            if (!tokens || !tokens.refreshToken) {
              console.error('Login failed - tokens not generated:', tokens);
              await sendMessage(
                BOT_TOKEN,
                chatId,
                '❌ Authorization failed. Could not create session. Please try again from the website.',
                undefined,
                userId
              );
              return response.status(200).json({ ok: true });
            }

            console.log('Login successful, tokens generated');
            
            // Получаем аватар пользователя (если нужно) - в фоне, не блокируем авторизацию
            // Запускаем асинхронно, не ждем результата
            userAuthStore.fetchAndSaveAvatar(userId, BOT_TOKEN).catch((avatarError: any) => {
              console.error('Error fetching avatar (non-critical, running in background):', avatarError);
              // Игнорируем ошибку - аватар не критичен для авторизации
            });

            // Формируем ссылку на промежуточную страницу авторизации с refresh token
            const callbackUrl = `${WEB_APP_URL}/auth?refreshToken=${encodeURIComponent(tokens.refreshToken)}`;
            
            // Отправляем подтверждение со ссылкой для перехода на сайт
            console.log('Sending success message with callback URL...');
            const fullName = ((firstName || '') + (lastName ? ' ' + lastName : '')).trim();
            const sentMessage = await sendMessage(
              BOT_TOKEN,
              chatId,
              `✅ Authorization successful!\n\n` +
              `You are authorized as: ${fullName || username || `ID: ${userId}`}\n\n` +
              `Click the link below to return to the website.\n` +
              `(Tap and hold, then select "Open in browser" if needed)`,
              [[{ text: '🌐 Open GiftDraw.today', url: callbackUrl }]],
              userId
            );
            console.log('Success message sent with callback URL');
            
            // Удаляем команду пользователя после успешной отправки ответа
            // Небольшая задержка, чтобы пользователь увидел ответ
            setTimeout(async () => {
              try {
                await deleteMessage(BOT_TOKEN, chatId, userMessageId);
                console.log('User /start message deleted after successful response:', userMessageId);
              } catch (error: any) {
                console.warn('Failed to delete user message:', error);
              }
            }, 1000); // 1 секунда задержки
          } catch (error: any) {
            console.error('Error verifying token:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            // Более детальное сообщение об ошибке для отладки
            const errorMessage = error.message || error.name || 'Unknown error';
            console.error('Full error details:', {
              name: error.name,
              message: error.message,
              stack: error.stack,
              cause: error.cause
            });
            
            await sendMessage(
              BOT_TOKEN,
              chatId,
              '❌ Error during authorization. Please try again from the website.',
              undefined,
              userId
            );
            
            // Удаляем команду пользователя даже при ошибке
            setTimeout(async () => {
              try {
                await deleteMessage(BOT_TOKEN, chatId, userMessageId);
                console.log('User /start message deleted after error response:', userMessageId);
              } catch (deleteError: any) {
                console.warn('Failed to delete user message after error:', deleteError);
              }
            }, 1000);
          }
        } else {
          // Обычная команда /start без токена
          console.log('Regular /start without token');
          try {
            // В новой системе просто логиним пользователя при /start
            // Проверяем, есть ли уже пользователь с таким telegram_id
            if (!userId) {
              console.error('userId is undefined');
              await sendMessage(
                BOT_TOKEN,
                chatId,
                `👋 Hello! I'm the GiftDraw.today bot.\n\n` +
                `To authorize, please use the "Connect via Telegram" button on the website.`,
                undefined,
                undefined
              );
              return response.status(200).json({ ok: true });
            }
            
            const existingUser = await userAuthStore.getUserByTelegramId(userId);
            
            if (existingUser && existingUser.refreshToken && !existingUser.isRevoked) {
              // Пользователь уже существует и имеет активный refresh token
              console.log('User already exists, showing login button');
              const callbackUrl = `${WEB_APP_URL}/auth?refreshToken=${encodeURIComponent(existingUser.refreshToken)}`;
              
              await sendMessage(
                BOT_TOKEN,
                chatId,
                `👋 Hello! Welcome back, ${firstName || username || `ID: ${userId}`}!\n\n` +
                `Click the button below to return to the website:`,
                [[{ text: '🌐 Open GiftDraw.today', url: callbackUrl }]],
                userId
              );
            } else {
              // Новый пользователь или нет активного токена - показываем кнопку авторизации
              console.log('New user or no active token, showing auth button');
              await sendMessage(
                BOT_TOKEN,
                chatId,
                `👋 Hello! I'm the GiftDraw.today bot.\n\n` +
                `Click the button below to authorize:`,
                [[{ text: '🔐 Authorize', callback_data: 'auth_check' }]],
                userId
              );
            }
            console.log('Regular /start message sent successfully');
            
            // Удаляем команду пользователя после отправки ответа
            setTimeout(async () => {
              try {
                await deleteMessage(BOT_TOKEN, chatId, userMessageId);
                console.log('User /start message deleted after regular response:', userMessageId);
              } catch (error: any) {
                console.warn('Failed to delete user message:', error);
              }
            }, 1000);
          } catch (error: any) {
            console.error('Error sending regular /start message:', error);
            // Fallback на обычное сообщение без кнопки
            try {
              await sendMessage(
                BOT_TOKEN,
                chatId,
                `👋 Hello! I'm the GiftDraw.today bot.\n\n` +
                `To authorize, please use the "Connect via Telegram" button on the website.`,
                undefined,
                userId
              );
            } catch (fallbackError: any) {
              console.error('Error sending fallback message:', fallbackError);
            }
            
            // Удаляем команду пользователя даже при ошибке fallback
            setTimeout(async () => {
              try {
                await deleteMessage(BOT_TOKEN, chatId, userMessageId);
                console.log('User /start message deleted after fallback:', userMessageId);
              } catch (deleteError: any) {
                console.warn('Failed to delete user message after fallback:', deleteError);
              }
            }, 1000);
          }
        }
      } else {
        console.log('Message is not /start command:', text);
      }

      console.log('Webhook processing completed successfully');
      // Явно устанавливаем статус 200 и отправляем ответ
      response.status(200);
      return response.json({ ok: true });
    }

    console.log('Method not allowed:', request.method);
    response.status(405);
    return response.json({ error: 'Method not allowed' });
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

// Вспомогательная функция для удаления сообщения
async function deleteMessage(
  botToken: string,
  chatId: number,
  messageId: number
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/deleteMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
      }),
    });

    // Проверяем content-type перед парсингом JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Expected JSON but got:', contentType, 'Response (first 200 chars):', text.substring(0, 200));
      // Если сообщение уже удалено - это нормально
      if (response.status === 200 || response.status === 400) {
        return true;
      }
      return false;
    }

    const responseData = await response.json();
    
    if (!response.ok) {
      // Если сообщение уже удалено или не найдено - это нормально
      if (responseData.error_code === 400 && responseData.description?.includes('message to delete not found')) {
        console.log('Message already deleted or not found:', messageId);
        return true;
      }
      console.warn('Failed to delete message:', responseData);
      return false;
    }

    console.log('Message deleted successfully:', messageId);
    return true;
  } catch (error: any) {
    console.error('Error deleting message:', error);
    return false;
  }
}

// Вспомогательная функция для получения и удаления предыдущего сообщения бота
async function deletePreviousBotMessage(
  botToken: string,
  chatId: number,
  telegramId: number
): Promise<void> {
  try {
    // Получаем последний message_id из базы данных
    const userData = await userAuthStore.getUserByTelegramId(telegramId);
    if (userData && (userData as any).last_bot_message_id) {
      const lastMessageId = (userData as any).last_bot_message_id;
      console.log('Deleting previous bot message:', lastMessageId);
      await deleteMessage(botToken, chatId, lastMessageId);
    }
  } catch (error: any) {
    console.error('Error deleting previous bot message:', error);
    // Не прерываем выполнение, если не удалось удалить предыдущее сообщение
  }
}

// Вспомогательная функция для сохранения message_id в базе данных
async function saveLastBotMessageId(
  telegramId: number,
  messageId: number
): Promise<void> {
  console.log('saveLastBotMessageId called:', { telegramId, messageId });
  try {
    const success = await userAuthStore.saveLastBotMessageId(telegramId, messageId);
    if (success) {
      console.log('✅ Successfully saved last_bot_message_id:', messageId, 'for user:', telegramId);
    } else {
      console.error('❌ Failed to save last bot message ID:', { telegramId, messageId });
    }
  } catch (error: any) {
    console.error('❌ Exception in saveLastBotMessageId wrapper:', error);
    console.error('Error stack:', error.stack);
  }
}

// Вспомогательная функция для отправки сообщений
async function sendMessage(
  botToken: string,
  chatId: number,
  text: string,
  buttons?: any[][],
  telegramId?: number // Добавляем telegramId для удаления предыдущих сообщений
) {
  console.log('sendMessage called:', {
    botTokenPrefix: botToken ? `${botToken.substring(0, 10)}...` : 'NOT SET',
    chatId,
    textLength: text.length,
    hasButtons: !!buttons,
    telegramId
  });

  // Удаляем предыдущее сообщение бота, если есть telegramId
  if (telegramId) {
    await deletePreviousBotMessage(botToken, chatId, telegramId);
  }

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

  // Проверяем content-type перед парсингом JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Expected JSON but got:', contentType, 'Response (first 200 chars):', text.substring(0, 200));
    throw new Error(`Telegram API returned non-JSON response: ${contentType}`);
  }

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
  console.log('Message response data:', {
    hasResult: !!responseData.result,
    messageId: responseData.result?.message_id,
    telegramId: telegramId,
    willSave: !!(telegramId && responseData.result?.message_id)
  });
  
  // Сохраняем message_id нового сообщения в базе данных
  if (telegramId && responseData.result?.message_id) {
    console.log('Attempting to save last_bot_message_id:', {
      telegramId,
      messageId: responseData.result.message_id
    });
    await saveLastBotMessageId(telegramId, responseData.result.message_id);
  } else {
    console.warn('Cannot save last_bot_message_id:', {
      hasTelegramId: !!telegramId,
      hasMessageId: !!responseData.result?.message_id,
      responseData: responseData
    });
  }
  
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

  // Проверяем content-type перед парсингом JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    console.error('Expected JSON but got:', contentType, 'Response (first 200 chars):', text.substring(0, 200));
    throw new Error(`Telegram API returned non-JSON response: ${contentType}`);
  }

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

