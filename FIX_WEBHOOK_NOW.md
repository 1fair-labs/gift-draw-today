# СРОЧНОЕ ИСПРАВЛЕНИЕ WEBHOOK

## Проблема
Webhook не установлен (URL пустой), есть 3 необработанных обновления.

## Решение - выполните СЕЙЧАС:

### 1. Установите webhook (откройте в браузере):

```
https://api.telegram.org/bot8021828260:AAEuC7TMoCthDeslQfvQy0saIjCibvOxfvc/setWebhook?url=https://crypto-lottery-today.vercel.app/api/telegram-webhook
```

**Ожидаемый ответ:**
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### 2. Проверьте webhook:

```
https://api.telegram.org/bot8021828260:AAEuC7TMoCthDeslQfvQy0saIjCibvOxfvc/getWebhookInfo
```

**Должен вернуться:**
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

### 3. Проверьте endpoint:

Откройте в браузере:
```
https://crypto-lottery-today.vercel.app/api/telegram-webhook
```

Должен вернуться: `{"status":"ok"}`

### 4. После установки webhook отправьте боту `/start` и проверьте логи в Vercel

