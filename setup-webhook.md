# Настройка Telegram Webhook

## Токен бота
```
8393561507:AAEwle_Ao5qjr8-sq0icOnqEzxAOxct_r6U
```

## Шаг 1: Добавьте токен в Vercel

1. Откройте проект в Vercel Dashboard
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте переменную:
   - **Name**: `TELEGRAM_BOT_TOKEN`
   - **Value**: `8021828260:AAEuC7TMoCthDeslQfvQy0saIjCibvOxfvc`
   - **Environment**: Production, Preview, Development (выберите все)
4. Нажмите **Save**
5. Перезапустите деплой (Redeploy)

## Шаг 2: Установите Webhook

### Вариант A: Через браузер

Откройте эту ссылку в браузере:
```
https://api.telegram.org/bot8021828260:AAEuC7TMoCthDeslQfvQy0saIjCibvOxfvc/setWebhook?url=https://giftdraw.today/api/telegram-webhook
```

Должен вернуться JSON:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### Вариант B: Через curl (в терминале)

```bash
curl -X POST "https://api.telegram.org/bot8021828260:AAEuC7TMoCthDeslQfvQy0saIjCibvOxfvc/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://giftdraw.today/api/telegram-webhook"}'
```

## Шаг 3: Проверьте Webhook

Откройте эту ссылку:
```
https://api.telegram.org/bot8021828260:AAEuC7TMoCthDeslQfvQy0saIjCibvOxfvc/getWebhookInfo
```

Должен вернуться JSON с информацией о webhook:
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

## Шаг 4: Протестируйте

1. Откройте сайт `https://giftdraw.today`
2. Нажмите "Connect via Telegram"
3. Бот должен автоматически обработать команду `/start auth_{token}`
4. Бот отправит сообщение с кнопкой "🔗 Вернуться на сайт"
5. После нажатия кнопки вы будете авторизованы на сайте

## Устранение проблем

### Webhook не работает

1. Проверьте, что токен добавлен в Vercel
2. Проверьте, что деплой завершен
3. Проверьте логи в Vercel Dashboard → Functions → telegram-webhook

### Бот не отвечает

1. Проверьте webhook через `/getWebhookInfo`
2. Отправьте боту `/start` вручную - должен ответить
3. Проверьте логи в Vercel

### Удалить webhook (если нужно)

```
https://api.telegram.org/bot8021828260:AAEuC7TMoCthDeslQfvQy0saIjCibvOxfvc/deleteWebhook
```

