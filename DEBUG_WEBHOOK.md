# Отладка проблемы: Бот не отвечает на /start

## Проблема
Бот не отвечает на команду `/start` - сообщения отправляются, но ответа нет.

## Шаги для диагностики

### 1. Проверьте логи в Vercel

1. Откройте Vercel Dashboard
2. Выберите ваш проект
3. Перейдите в **Functions** → найдите `telegram-webhook`
4. Нажмите **View Logs**
5. Отправьте боту `/start` и посмотрите, появляются ли логи

**Что искать:**
- `POST request received:` - означает, что webhook получает обновления
- `Processing /start command` - означает, что команда обрабатывается
- Ошибки (красные строки)

### 2. Проверьте переменные окружения

В Vercel Dashboard → Settings → Environment Variables должны быть:

- `TELEGRAM_BOT_TOKEN` = `<YOUR_BOT_TOKEN>` (получите у @BotFather)
- `WEB_APP_URL` = `https://crypto-lottery-today.vercel.app` (или ваш кастомный домен)

### 3. Проверьте webhook

Выполните в браузере:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

Должен вернуться:
```json
{
  "ok": true,
  "result": {
    "url": "https://crypto-lottery-today.vercel.app/api/telegram-webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### 4. Проверьте endpoint вручную

Откройте в браузере:
```
https://crypto-lottery-today.vercel.app/api/telegram-webhook
```

Должен вернуться:
```json
{"status":"ok"}
```

### 5. Тест отправки сообщения через API

Попробуйте отправить тестовое сообщение через Telegram Bot API:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage?chat_id=YOUR_CHAT_ID&text=Test
```

Замените `YOUR_CHAT_ID` на ваш Telegram ID (можно узнать через @userinfobot).

Если это работает, значит токен правильный и бот может отправлять сообщения.

## Возможные проблемы

### Проблема 1: Webhook не получает обновления

**Симптомы:** В логах Vercel нет записей при отправке `/start`

**Решение:**
1. Удалите webhook: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook`
2. Установите заново: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://crypto-lottery-today.vercel.app/api/telegram-webhook`

### Проблема 2: Ошибка в коде webhook

**Симптомы:** В логах есть ошибки (красные строки)

**Решение:** Проверьте логи и исправьте ошибку

### Проблема 3: Неправильный токен

**Симптомы:** Ошибка "Unauthorized" в логах

**Решение:** Проверьте, что токен в Vercel правильный и перезапустите деплой

### Проблема 4: Webhook получает обновления, но не отправляет ответ

**Симптомы:** В логах есть `POST request received`, но нет `Regular /start message sent successfully`

**Решение:** Проверьте функцию `sendMessage` и убедитесь, что токен правильный

## Что делать дальше

1. Проверьте логи в Vercel и пришлите скриншот или текст ошибок
2. Проверьте переменные окружения
3. Попробуйте переустановить webhook
4. Если ничего не помогает, проверьте, что деплой завершен и все функции работают

