# Деплой Telegram бота на Vercel (FastAPI + aiogram)

## Структура проекта

```
├── api/
│   ├── index.py          # FastAPI endpoint для webhook
│   └── ...               # Другие API endpoints
├── tgbot/
│   ├── __init__.py
│   ├── main.py           # Основной класс бота
│   └── handlers.py       # Обработчики команд
├── vercel.json           # Конфигурация Vercel
└── requirements.txt      # Python зависимости
```

## Настройка

### 1. Установите переменные окружения в Vercel

В Vercel Dashboard → Settings → Environment Variables добавьте:

- `TELEGRAM_BOT_TOKEN` = `8393561507:AAEwle_Ao5qjr8-sq0icOnqEzxAOxct_r6U`
- `WEB_APP_URL` = `https://giftdraw.today`
- `WEBHOOK_URL` = `https://giftdraw.today/api/bot`
- `DEBUG` = `False` (или не добавляйте, по умолчанию False)

### 2. Установите Python runtime

Vercel автоматически определит Python из `requirements.txt`, но можно явно указать в `vercel.json`:

```json
{
  "functions": {
    "api/index.py": {
      "runtime": "python3.9"
    }
  }
}
```

### 3. Деплой

После push в Git, Vercel автоматически:
1. Установит зависимости из `requirements.txt`
2. Запустит FastAPI приложение
3. Endpoint `/api/bot` будет доступен для webhook

### 4. Установите webhook

После деплоя установите webhook:

```
https://api.telegram.org/bot8393561507:AAEwle_Ao5qjr8-sq0icOnqEzxAOxct_r6U/setWebhook?url=https://giftdraw.today/api/bot
```

### 5. Проверьте webhook

```
https://api.telegram.org/bot8393561507:AAEwle_Ao5qjr8-sq0icOnqEzxAOxct_r6U/getWebhookInfo
```

## Как это работает

1. Telegram отправляет обновление на `https://giftdraw.today/api/bot`
2. Vercel перенаправляет запрос на `/api/index.py` (FastAPI)
3. FastAPI вызывает `tgbot.update_bot(update_dict)`
4. aiogram обрабатывает обновление через handlers
5. Бот отвечает пользователю

## Преимущества

- ✅ Работает на Vercel serverless
- ✅ Использует aiogram (современная библиотека для Telegram)
- ✅ Автоматическая установка webhook при деплое
- ✅ Легко расширять новыми командами

## Добавление новых команд

Добавьте обработчики в `tgbot/handlers.py`:

```python
@router.message(Command("help"))
async def cmd_help(message: Message):
    await message.answer("Помощь по боту...")
```

## Логирование

Логи доступны в Vercel Dashboard → Functions → api/index → View Logs

