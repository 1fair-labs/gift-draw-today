# Решение проблемы с webhook: "Failed to resolve host"

## Проблема
При установке webhook получаете ошибку:
```json
{"ok":false,"error_code":400,"description":"Bad Request: bad webhook: Failed to resolve host: No address associated with hostname"}
```

Это означает, что домен `giftdraw.today` еще не настроен в DNS или не указывает на Vercel.

## Решение: Используйте Vercel домен временно

### Шаг 1: Найдите ваш Vercel домен

1. Откройте Vercel Dashboard
2. Выберите ваш проект
3. Перейдите в **Settings** → **Domains**
4. Найдите домен вида: `your-project-name.vercel.app`

Или проверьте в **Deployments** → выберите последний деплой → посмотрите URL.

### Шаг 2: Установите webhook с Vercel доменом

Замените `YOUR_VERCEL_DOMAIN` на ваш домен Vercel:

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://YOUR_VERCEL_DOMAIN.vercel.app/api/telegram-webhook
```

Например, если ваш проект называется `crypto-lottery-today`:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://crypto-lottery-today.vercel.app/api/telegram-webhook
```

### Шаг 3: Проверьте webhook

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

Должен вернуться:
```json
{
  "ok": true,
  "result": {
    "url": "https://YOUR_VERCEL_DOMAIN.vercel.app/api/telegram-webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### Шаг 4: Проверьте endpoint

Откройте в браузере:
```
https://YOUR_VERCEL_DOMAIN.vercel.app/api/telegram-webhook
```

Должен вернуться:
```json
{"status":"ok"}
```

## После настройки кастомного домена

Когда домен `giftdraw.today` будет настроен и будет указывать на Vercel:

1. Удалите старый webhook:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook
```

2. Установите новый webhook с кастомным доменом:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://giftdraw.today/api/telegram-webhook
```

## Настройка кастомного домена в Vercel

1. Откройте Vercel Dashboard → Settings → Domains
2. Нажмите **Add Domain**
3. Введите: `giftdraw.today`
4. Следуйте инструкциям по настройке DNS записей у вашего регистратора домена
5. Дождитесь подтверждения домена (может занять до 24 часов)

После подтверждения домена webhook будет работать с `https://giftdraw.today/api/telegram-webhook`.

