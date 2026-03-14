// VERSION: 4f9c272 - Fixed contentType conflict
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
  // ВАЖНО: Обязательно возвращаем 200 даже при ошибках, иначе Telegram будет повторять запрос
  try {
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
      console.error('❌ TELEGRAM_BOT_TOKEN not configured');
      // Возвращаем 200, чтобы Telegram не повторял запрос
      return response.status(200).json({ ok: true, error: 'Bot token not configured' });
    }
  
  // Логируем первые и последние символы токена для отладки (безопасно)
  console.log('BOT_TOKEN configured:', BOT_TOKEN ? `${BOT_TOKEN.substring(0, 10)}...${BOT_TOKEN.substring(BOT_TOKEN.length - 5)}` : 'NOT SET');

  // Определяем fallback URL - всегда используем production домен
  // Реальный origin будет взят из Supabase Storage (если есть)
  let WEB_APP_URL = 'https://www.giftdraw.today';

  // Убираем trailing slash
  WEB_APP_URL = WEB_APP_URL.replace(/\/$/, '');

  console.log('WEB_APP_URL fallback (will be overridden by origin from Storage if available):', WEB_APP_URL);
  console.log('Environment detection (for debug only):', {
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    WEB_APP_URL_ENV: process.env.WEB_APP_URL,
    'x-forwarded-host': request.headers['x-forwarded-host'],
    host: request.headers.host,
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
        return response.status(200).json({ status: 'ok' });
      }

      // Для POST запроса - обработка обновлений от Telegram
      if (request.method === 'POST') {
        // Проверяем, что тело запроса существует и валидно
        if (!request.body) {
          console.error('❌ No body in POST request');
          return response.status(200).json({ ok: true, error: 'No body' });
        }

        let update: TelegramUpdate;
        try {
          update = request.body;
          console.log('Update parsed successfully');
        } catch (parseError: any) {
          console.error('❌ Error parsing request body:', parseError);
          return response.status(200).json({ ok: true, error: 'Invalid body' });
        }
        
        console.log('POST request received:', JSON.stringify(update, null, 2));
        console.log('WEB_APP_URL:', WEB_APP_URL);

      // Обработка callback_query (нажатие кнопки)
      if (update.callback_query) {
        console.log('=== CALLBACK QUERY RECEIVED ===');
        const callback = update.callback_query;
        const userId = callback.from.id;
        const username = callback.from.username;
        const firstName = callback.from.first_name || 'User';
        const lastName = (callback.from as any).last_name;
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
              userId,
              true,
              callback.message?.message_id
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
      const lastName = (message.from as any)?.last_name;
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
        console.log('=== /start COMMAND DETECTED ===');
        console.log('Full command text:', text);
        console.log('User:', { userId, username, firstName, lastName, chatId });
        const args = text.split(' ');
        console.log('Command args:', args);
        
        // Сохраняем message_id сообщения пользователя для удаления после отправки ответа
        const userMessageId = message.message_id;
        
        // Проверяем, есть ли токен авторизации
        if (args.length > 1 && args[1]) {
          const token = args[1]; // Токен идет напрямую
          
          console.log('=== VERSION CHECK: ORIGIN FROM STORAGE v2 ===');
          console.log('=== IF YOU DON\'T SEE THIS, VERCEL IS USING OLD CODE ===');
          
          // Получаем origin из Supabase Storage
          let userOrigin: string | null = null;
          try {
            console.log('=== FETCHING ORIGIN FROM STORAGE ===');
            console.log('Token (first 10 chars):', token.substring(0, 10));
            const { getOriginForToken } = await import('./auth/prepare.js');
            console.log('Import successful, calling getOriginForToken...');
            userOrigin = await getOriginForToken(token);
            console.log('Origin from Storage result:', userOrigin || 'NOT FOUND');
          } catch (importError: any) {
            console.error('❌ Error importing or calling getOriginForToken:', importError);
            console.error('Error message:', importError?.message);
            console.error('Error stack:', importError?.stack);
            // Продолжаем без origin, используем WEB_APP_URL
          }
          
          console.log('=== AUTH TOKEN PROCESSING ===');
          console.log('Full command:', text);
          console.log('Args:', args);
          console.log('Token (first 10 chars):', token.substring(0, 10));
          console.log('Token length:', token.length);
          console.log('User origin from Storage:', userOrigin || 'NOT FOUND');

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

            // Используем origin из Storage, если он есть, иначе используем WEB_APP_URL
            const finalWebAppUrl = userOrigin || WEB_APP_URL;
            console.log('=== CALLBACK URL SELECTION ===');
            console.log('User origin from Storage:', userOrigin || 'NOT FOUND');
            console.log('WEB_APP_URL from environment:', WEB_APP_URL);
            console.log('Final callback URL will use:', finalWebAppUrl);
            console.log('Source:', userOrigin ? 'STORAGE' : 'ENVIRONMENT');
            
            // Формируем ссылку на промежуточную страницу авторизации с refresh token
            const callbackUrl = `${finalWebAppUrl}/auth?refreshToken=${encodeURIComponent(tokens.refreshToken)}`;
            
            // sendMessage отправит новое сообщение, удалит только старые по last_bot_message_ids, сохранит новый ID и сдвинет старый текущий в массив
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
              userId,
              true,
              userMessageId
            );
            console.log('Success message sent with callback URL');
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
          }
        } else {
          // Обычная команда /start без токена
          console.log('=== REGULAR /start COMMAND (NO TOKEN) ===');
          console.log('User info:', { userId, username, firstName, lastName, chatId });
          
          try {
            // В новой системе просто логиним пользователя при /start
            // Проверяем, есть ли уже пользователь с таким telegram_id
            if (!userId) {
              console.error('❌ userId is undefined');
              try {
                await sendMessage(
                  BOT_TOKEN,
                  chatId,
                  `👋 Hello! I'm the GiftDraw.today bot.\n\n` +
                  `To authorize, please use the "Connect via Telegram" button on the website.`,
                  undefined,
                  undefined
                );
              } catch (sendError: any) {
                console.error('❌ Error sending message (no userId):', sendError);
              }
              return response.status(200).json({ ok: true });
            }
            
            console.log('Checking existing user for telegramId:', userId);
            let existingUser = null;
            try {
              existingUser = await userAuthStore.getUserByTelegramId(userId);
              console.log('getUserByTelegramId result:', existingUser ? 'User found' : 'User not found');
            } catch (dbError: any) {
              console.error('❌ Error getting user from database:', dbError);
              console.error('Error stack:', dbError.stack);
              // Продолжаем выполнение - создадим нового пользователя
            }
            
            // Всегда показываем единый сценарий с кнопкой авторизации,
            // без отдельного сообщения \"Welcome back\".
            console.log(existingUser && existingUser.refreshToken && !existingUser.isRevoked
              ? '✅ User already exists with active token, showing auth button'
              : '🆕 New user or no active token, showing auth button');
            try {
              await sendMessage(
                BOT_TOKEN,
                chatId,
                `👋 Hello! I'm the GiftDraw.today bot.\n\n` +
                `Click the button below to authorize:`,
                [[{ text: '🔐 Authorize', callback_data: 'auth_check' }]],
                userId
              );
              console.log('✅ Auth button message sent successfully');
            } catch (sendError: any) {
              console.error('❌ Error sending auth button message:', sendError);
              console.error('Error stack:', sendError.stack);
              throw sendError;
            }
            
            // Удаляем команду пользователя после отправки ответа
            setTimeout(async () => {
              try {
                await deleteMessage(BOT_TOKEN, chatId, userMessageId);
                console.log('✅ User /start message deleted:', userMessageId);
              } catch (error: any) {
                console.warn('⚠️ Failed to delete user message (non-critical):', error.message);
              }
            }, 1000);
          } catch (error: any) {
            console.error('❌ ERROR IN REGULAR /start HANDLER ===');
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            // Fallback на обычное сообщение без кнопки
            try {
              console.log('Attempting fallback message...');
              await sendMessage(
                BOT_TOKEN,
                chatId,
                `👋 Hello! I'm the GiftDraw.today bot.\n\n` +
                `To authorize, please use the "Connect via Telegram" button on the website.`,
                undefined,
                userId
              );
              console.log('✅ Fallback message sent');
            } catch (fallbackError: any) {
              console.error('❌ CRITICAL: Error sending fallback message:', fallbackError);
              console.error('Fallback error stack:', fallbackError.stack);
              // Даже если fallback не сработал, возвращаем 200, чтобы Telegram не повторял запрос
            }
            
            // Удаляем команду пользователя даже при ошибке fallback
            setTimeout(async () => {
              try {
                await deleteMessage(BOT_TOKEN, chatId, userMessageId);
                console.log('✅ User /start message deleted after error:', userMessageId);
              } catch (deleteError: any) {
                console.warn('⚠️ Failed to delete user message after error (non-critical):', deleteError.message);
              }
            }, 1000);
          }
        }
      } else {
        console.log('Message is not /start command:', text);
        // Для других команд просто отвечаем 200
        return response.status(200).json({ ok: true });
      }

        console.log('✅ Webhook processing completed successfully');
        // Явно устанавливаем статус 200 и отправляем ответ
        return response.status(200).json({ ok: true });
      }

      // Если метод не POST и не GET, возвращаем ошибку
      console.log('Method not allowed:', request.method);
      return response.status(200).json({ ok: true, error: 'Method not allowed' });
    } catch (innerError: any) {
      console.error('❌ === ERROR IN WEBHOOK PROCESSING ===');
      console.error('Error message:', innerError?.message);
      console.error('Error stack:', innerError?.stack);
      console.error('Error name:', innerError?.name);
      // Возвращаем 200, чтобы Telegram не повторял запрос
      return response.status(200).json({ ok: true, error: 'Processing error' });
    }
  } catch (outerError: any) {
    console.error('❌ === CRITICAL ERROR IN WEBHOOK HANDLER ===');
    console.error('Error message:', outerError?.message);
    console.error('Error stack:', outerError?.stack);
    console.error('Error name:', outerError?.name);
    // ВАЖНО: Всегда возвращаем 200, чтобы Telegram не повторял запрос
    try {
      return response.status(200).json({ ok: true, error: 'Internal error handled' });
    } catch (responseError: any) {
      // Если даже ответ не удалось отправить, логируем и завершаем
      console.error('❌ Failed to send error response:', responseError);
      return;
    }
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
    const deleteResponseContentType = response.headers.get('content-type');
    if (!deleteResponseContentType || !deleteResponseContentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('Expected JSON but got:', deleteResponseContentType, 'Response (first 200 chars):', responseText.substring(0, 200));
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

// Удаляем только сообщения с ID из переданного массива ids. Не удаляем currentNewMessageId.
// ids берём из уже полученного userData в sendMessage, чтобы не удалить только что отправленное из-за гонки.
async function deletePreviousAuthMessages(
  botToken: string,
  chatId: number,
  ids: number[],
  currentNewMessageId?: number
): Promise<void> {
  if (!ids || ids.length === 0) return;
  for (const messageId of ids) {
    if (currentNewMessageId !== undefined && messageId === currentNewMessageId) continue;
    try {
      await deleteMessage(botToken, chatId, messageId);
    } catch (err: any) {
      console.warn('Failed to delete auth message:', messageId, err?.message);
    }
  }
}

// Вспомогательная функция для отправки сообщений.
// Удаление старых сообщений и сохранение ID делаем только для сообщения "Authorization successful!" (isAuthSuccessMessage),
// чтобы не удалять "Welcome back" и другие сообщения бота.
async function sendMessage(
  botToken: string,
  chatId: number,
  text: string,
  buttons?: any[][],
  telegramId?: number,
  isAuthSuccessMessage?: boolean,
  userCommandMessageId?: number
) {
  console.log('sendMessage called:', {
    botTokenPrefix: botToken ? `${botToken.substring(0, 10)}...` : 'NOT SET',
    chatId,
    textLength: text.length,
    hasButtons: !!buttons,
    telegramId
  });

  // Сначала отправляем сообщение, чтобы пользователь быстрее увидел ссылку; удаление старого — после, без ожидания
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
  const sendResponseContentType = response.headers.get('content-type');
  if (!sendResponseContentType || !sendResponseContentType.includes('application/json')) {
    const responseText = await response.text();
    console.error('Expected JSON but got:', sendResponseContentType, 'Response (first 200 chars):', responseText.substring(0, 200));
    throw new Error(`Telegram API returned non-JSON response: ${sendResponseContentType}`);
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

  if (isAuthSuccessMessage && telegramId && responseData.result?.message_id) {
    const newBotMessageId = responseData.result.message_id;
    console.log('sendMessage: auth event (append-only Storage)', {
      telegramId,
      newBotMessageId,
      userCommandMessageId,
    });
    const { idsToDelete, filePaths } = await userAuthStore.getAuthMessageIdsToDelete(telegramId);
    await deletePreviousAuthMessages(botToken, chatId, idsToDelete, newBotMessageId);
    await userAuthStore.deleteAuthEventFiles(filePaths);
    const success = await userAuthStore.saveAuthEvent(
      telegramId,
      userCommandMessageId ?? null,
      newBotMessageId
    );
    if (!success) {
      console.warn('Failed to save auth event to Storage:', { telegramId, messageId: newBotMessageId });
    }
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
  const callbackResponseContentType = response.headers.get('content-type');
  if (!callbackResponseContentType || !callbackResponseContentType.includes('application/json')) {
    const responseText = await response.text();
    console.error('Expected JSON but got:', callbackResponseContentType, 'Response (first 200 chars):', responseText.substring(0, 200));
    throw new Error(`Telegram API returned non-JSON response: ${callbackResponseContentType}`);
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

