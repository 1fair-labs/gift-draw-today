# Настройка Webhook с www

## Важно: Webhook должен быть установлен с www

Для правильной работы webhook необходимо использовать домен с `www`:
```
https://www.giftdraw.today/api/telegram-webhook
```

## Установка Webhook

### Шаг 1: Удалите старый webhook
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook?drop_pending_updates=true
```

### Шаг 2: Установите webhook с www
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://www.giftdraw.today/api/telegram-webhook
```

### Шаг 3: Проверьте webhook
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

**Ожидаемый ответ:**
```json
{
  "ok": true,
  "result": {
    "url": "https://www.giftdraw.today/api/telegram-webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "last_error_date": 0,
    "last_error_message": ""
  }
}
```

## Почему www?

Vercel может редиректить запросы с non-www на www или наоборот, что вызывает ошибку 307 Temporary Redirect. 
Использование www гарантирует, что webhook будет работать без редиректов.

## Обновление переменных окружения

Убедитесь, что в Vercel Dashboard → Settings → Environment Variables установлено:
```
WEB_APP_URL=https://www.giftdraw.today
```
