# Быстрая настройка Webhook

## Проблема: Бот не отвечает на /start

Если бот не отвечает, значит webhook не установлен или не работает.

## Решение: Установите webhook

### Шаг 1: Установите webhook (откройте в браузере)

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://giftdraw.today/api/telegram-webhook
```

**Ожидаемый ответ:**
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### Шаг 2: Проверьте webhook

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

**Ожидаемый ответ:**
```json
{
  "ok": true,
  "result": {
    "url": "https://giftdraw.today/api/telegram-webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### Шаг 3: Проверьте endpoint

```
https://giftdraw.today/api/telegram-webhook
```

**Ожидаемый ответ:**
```json
{"status":"ok"}
```

### Шаг 4: Убедитесь, что токен в Vercel

1. Откройте Vercel Dashboard
2. Settings → Environment Variables
3. Проверьте, что есть `TELEGRAM_BOT_TOKEN` = `<YOUR_BOT_TOKEN>` (получите у @BotFather)
4. Если нет - добавьте и перезапустите деплой

### Шаг 5: Протестируйте

1. Откройте бота в Telegram: `@cryptolotterytoday_bot`
2. Отправьте команду `/start`
3. Бот должен ответить: "👋 Привет! Я бот для CryptoLottery.today..."

## Если не работает

1. Проверьте логи в Vercel: Functions → telegram-webhook → View Logs
2. Убедитесь, что деплой завершен
3. Попробуйте удалить и установить webhook заново:

**Удалить webhook:**
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook
```

**Установить заново:**
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://giftdraw.today/api/telegram-webhook
```

