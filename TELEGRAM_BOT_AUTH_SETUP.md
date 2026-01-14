# Настройка авторизации через Telegram бота

## Архитектура

Система авторизации работает через временные токены:

1. **Сайт** генерирует токен и открывает бота
2. **Бот** обрабатывает команду `/start auth_{token}` и привязывает пользователя к токену
3. **Сайт** проверяет токен и создает сессию

## Настройка бота (Telegraf.js)

### 1. Установка зависимостей

```bash
npm install telegraf dotenv
```

### 2. Структура проекта бота

```
telegram-bot/
├── src/
│   └── index.ts
├── .env
└── package.json
```

### 3. Код бота (`src/index.ts`)

```typescript
import { Telegraf, Context } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN!);
const WEB_APP_URL = process.env.WEB_APP_URL || 'https://giftdraw.today';

// Обработка команды /start с токеном
bot.start(async (ctx: Context) => {
  const message = ctx.message;
  if (!message || !('text' in message)) return;

  const args = message.text.split(' ');
  
  // Проверяем, есть ли токен авторизации
  if (args.length > 1 && args[1].startsWith('auth_')) {
    const token = args[1].replace('auth_', '');
    const userId = ctx.from?.id;
    const username = ctx.from?.username;
    const firstName = ctx.from?.first_name;

    if (!userId) {
      return ctx.reply('❌ Ошибка: не удалось получить ваш ID');
    }

    try {
      // Отправляем данные на API для привязки пользователя к токену
      const response = await fetch(`${WEB_APP_URL}/api/auth/verify-token`, {
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

      const data = await response.json();

      if (!data.success) {
        return ctx.reply('❌ Ошибка авторизации. Токен недействителен или истек.');
      }

      // Отправляем подтверждение и кнопку для возврата на сайт
      await ctx.reply(
        `✅ Авторизация успешна!\n\n` +
        `Вы авторизованы как: ${firstName || username || `ID: ${userId}`}\n\n` +
        `Нажмите кнопку ниже, чтобы вернуться на сайт.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔗 Вернуться на сайт',
                  url: data.callbackUrl,
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      console.error('Error verifying token:', error);
      await ctx.reply('❌ Ошибка при авторизации. Попробуйте еще раз.');
    }
  } else {
    // Обычная команда /start
    await ctx.reply(
      `👋 Привет! Я бот для CryptoLottery.today.\n\n` +
      `Для авторизации на сайте перейдите по ссылке на сайте и нажмите "Connect via Telegram".`
    );
  }
});

// Запуск бота
bot.launch().then(() => {
  console.log('Bot started');
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
```

### 4. Переменные окружения (`.env`)

```env
BOT_TOKEN=your_telegram_bot_token
WEB_APP_URL=https://giftdraw.today
```

### 5. package.json

```json
{
  "name": "telegram-bot",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "telegraf": "^4.15.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

## API Endpoints

### GET `/api/auth/generate-token`

Генерирует временный токен для авторизации.

**Response:**
```json
{
  "success": true,
  "token": "a1b2c3d4e5f6...",
  "botUrl": "https://t.me/giftdrawtoday_bot?start=auth_a1b2c3d4e5f6..."
}
```

### POST `/api/auth/verify-token`

Используется ботом для привязки пользователя к токену.

**Request:**
```json
{
  "token": "a1b2c3d4e5f6...",
  "userId": 123456789,
  "username": "username",
  "firstName": "First Name"
}
```

**Response:**
```json
{
  "success": true,
  "callbackUrl": "https://giftdraw.today/auth/callback?token=a1b2c3d4e5f6..."
}
```

### GET `/api/auth/callback?token=...`

Проверяет токен, создает сессию и перенаправляет на главную страницу.

**Redirect:** `https://giftdraw.today`

## Безопасность

1. **Токены** генерируются криптостойким способом (32+ символов)
2. **TTL токенов** - 5 минут, автоматическая очистка
3. **Одноразовые токены** - удаляются после использования
4. **Сессии** хранятся в HttpOnly cookies
5. **Нет передачи user_id** в открытом виде в URL

## Деплой бота

### Вариант 1: Webhook через Vercel (Рекомендуется)

В проекте уже создан endpoint `/api/telegram-webhook.ts` для обработки команд бота.

**Настройка webhook:**

1. Убедитесь, что `TELEGRAM_BOT_TOKEN` установлен в переменных окружения Vercel
2. Установите webhook через Telegram Bot API:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://giftdraw.today/api/telegram-webhook"}'
```

Или используйте браузер:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://giftdraw.today/api/telegram-webhook
```

3. Проверьте webhook:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

**Преимущества:**
- Не нужен отдельный сервер
- Работает через Vercel serverless functions
- Автоматическое масштабирование
- Бесплатно для небольших проектов

### Вариант 2: VPS/Server (Telegraf.js)

```bash
# Установите Node.js
# Клонируйте репозиторий бота
# Установите зависимости
npm install

# Запустите через PM2
pm2 start src/index.ts --interpreter tsx
pm2 save
```

### Вариант 3: Railway/Render

Деплойте бота как отдельный сервис.

## Тестирование

1. Откройте сайт `https://giftdraw.today`
2. Нажмите "Connect via Telegram"
3. Откроется бот с командой `/start auth_{token}`
4. Бот обработает команду и покажет кнопку "Вернуться на сайт"
5. После нажатия кнопки вы будете авторизованы на сайте

## Troubleshooting

### Токен не работает

- Проверьте, что токен не истек (TTL 5 минут)
- Убедитесь, что бот правильно вызывает `/api/auth/verify-token`
- Проверьте логи бота и API

### Сессия не сохраняется

- Проверьте настройки cookies (HttpOnly, Secure, SameSite)
- Убедитесь, что сайт работает по HTTPS

### Бот не отвечает

- Проверьте, что `BOT_TOKEN` правильный
- Убедитесь, что бот запущен
- Проверьте логи бота

