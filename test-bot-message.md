# Тест отправки сообщения боту

## Проверка отправки сообщения через API

Откройте в браузере (замените YOUR_CHAT_ID на ваш Telegram ID):

```
https://giftdraw.today/api/send-message
```

Или используйте curl:

```bash
curl -X POST "https://giftdraw.today/api/send-message" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": YOUR_CHAT_ID,
    "text": "Тестовое сообщение от бота"
  }'
```

## Проверка webhook

1. Проверьте, установлен ли webhook:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

2. Если webhook не установлен, установите его:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://giftdraw.today/api/telegram-webhook
```

3. Проверьте endpoint:
```
https://giftdraw.today/api/telegram-webhook
```

Должен вернуться `{"status":"ok"}`

