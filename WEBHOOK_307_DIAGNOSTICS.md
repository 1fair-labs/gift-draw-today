# Диагностика проблемы 307 Temporary Redirect

## Проблема
Telegram получает ошибку `307 Temporary Redirect` при отправке запросов на webhook.

## Возможные причины

### 1. Автоматический редирект Vercel
Vercel может автоматически редиректить запросы. Проверьте:
- Настройки домена в Vercel Dashboard → Settings → Domains
- Нет ли редиректа с www на non-www или наоборот
- Нет ли редиректа с HTTP на HTTPS (но мы используем HTTPS)

### 2. Trailing slash редирект
Vercel может редиректить `/api/telegram-webhook` на `/api/telegram-webhook/` или наоборот.

**Решение:** Убедитесь, что webhook URL установлен БЕЗ trailing slash:
```
https://giftdraw.today/api/telegram-webhook
```
НЕ используйте:
```
https://giftdraw.today/api/telegram-webhook/
```

### 3. Проблема с настройками домена
Проверьте в Vercel Dashboard:
1. Settings → Domains
2. Убедитесь, что `giftdraw.today` настроен как основной домен
3. Проверьте, нет ли конфликтующих настроек редиректа

### 4. Проблема с IP блокировкой (маловероятно)
Telegram обычно не блокирует IP адреса. Но если есть подозрение:
- IP адрес Vercel: `216.198.79.1` (из getWebhookInfo)
- Это IP Vercel, не ваш личный IP
- Блокировка маловероятна, так как это инфраструктура Vercel

### 5. Проблема после спама/удаления бота
Если бот был удален и создан заново:
- Убедитесь, что используете правильный токен нового бота
- Удалите старый webhook полностью
- Установите новый webhook с новым токеном

## Диагностические шаги

### Шаг 1: Проверьте endpoint напрямую

**GET запрос (в браузере):**
```
https://giftdraw.today/api/telegram-webhook
```
Должен вернуться: `{"status":"ok"}`

**POST запрос (через curl):**
```bash
curl -X POST https://giftdraw.today/api/telegram-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Проверьте, что возвращается статус 200, а не 307.

### Шаг 2: Проверьте логи Vercel

1. Откройте Vercel Dashboard
2. Перейдите в Functions → telegram-webhook
3. Посмотрите логи последних запросов
4. Проверьте, доходят ли запросы до функции

Если запросы не доходят до функции, значит Vercel делает редирект ДО обработки.

### Шаг 3: Попробуйте Vercel домен

Временно установите webhook на Vercel домен:
```
https://crypto-lottery-today.vercel.app/api/telegram-webhook
```

Если это работает, значит проблема в настройках кастомного домена.

### Шаг 4: Проверьте настройки домена в Vercel

1. Vercel Dashboard → Settings → Domains
2. Найдите `giftdraw.today`
3. Проверьте:
   - Нет ли настроек редиректа
   - Правильно ли настроен DNS
   - Нет ли конфликтов с другими доменами

### Шаг 5: Удалите и переустановите webhook

**Удалить:**
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook?drop_pending_updates=true
```

**Установить заново (БЕЗ trailing slash):**
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://giftdraw.today/api/telegram-webhook
```

### Шаг 6: Проверьте через getWebhookInfo

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
    "pending_update_count": 0,
    "last_error_date": 0,
    "last_error_message": ""
  }
}
```

## Если ничего не помогает

1. **Используйте Vercel домен временно:**
   ```
   https://crypto-lottery-today.vercel.app/api/telegram-webhook
   ```

2. **Свяжитесь с поддержкой Vercel:**
   - Опишите проблему с 307 редиректом
   - Укажите, что это webhook для Telegram Bot API
   - Попросите проверить настройки домена

3. **Проверьте, нет ли проблем с DNS:**
   - Убедитесь, что DNS записи настроены правильно
   - Проверьте через `dig giftdraw.today` или `nslookup giftdraw.today`

## Примечание про ошибку 409

Ошибка `409 Conflict: can't use getUpdates method while webhook is active` - это нормально. 
Telegram не позволяет использовать `getUpdates` когда webhook активен. Это не проблема.
