# Telegram Bot Webhook (FastAPI)

Сервис для обработки команд Telegram бота через webhook.

## Установка

### 1. Установите зависимости

```bash
pip install -r requirements.txt
```

### 2. Настройте переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp .env.example .env
```

Или создайте `.env` файл:

```env
TELEGRAM_BOT_TOKEN=8393561507:AAEwle_Ao5qjr8-sq0icOnqEzxAOxct_r6U
WEB_APP_URL=https://giftdraw.today
PORT=8000
```

### 3. Запустите сервер

```bash
python main.py
```

Или через uvicorn:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Сервер будет доступен по адресу: `http://localhost:8000`

## Настройка Webhook

### 1. Получите публичный URL вашего сервиса

Если запускаете локально, используйте ngrok:

```bash
ngrok http 8000
```

Или задеплойте на Railway/Render/Heroku и получите URL.

### 2. Установите webhook

Замените `YOUR_PUBLIC_URL` на ваш публичный URL:

```
https://api.telegram.org/bot8393561507:AAEwle_Ao5qjr8-sq0icOnqEzxAOxct_r6U/setWebhook?url=YOUR_PUBLIC_URL/webhook
```

Например:
```
https://api.telegram.org/bot8393561507:AAEwle_Ao5qjr8-sq0icOnqEzxAOxct_r6U/setWebhook?url=https://your-bot.railway.app/webhook
```

### 3. Проверьте webhook

```
https://api.telegram.org/bot8393561507:AAEwle_Ao5qjr8-sq0icOnqEzxAOxct_r6U/getWebhookInfo
```

## Деплой

### Railway

1. Создайте аккаунт на [Railway](https://railway.app)
2. Создайте новый проект
3. Подключите GitHub репозиторий или загрузите код
4. Установите переменные окружения:
   - `TELEGRAM_BOT_TOKEN`
   - `WEB_APP_URL`
5. Railway автоматически определит Python и установит зависимости
6. Получите URL проекта и установите webhook

### Render

1. Создайте аккаунт на [Render](https://render.com)
2. Создайте новый Web Service
3. Подключите репозиторий
4. Настройки:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Установите переменные окружения
6. Получите URL и установите webhook

### Heroku

1. Установите Heroku CLI
2. Создайте приложение:

```bash
heroku create your-bot-name
```

3. Установите переменные окружения:

```bash
heroku config:set TELEGRAM_BOT_TOKEN=your_token
heroku config:set WEB_APP_URL=https://giftdraw.today
```

4. Задеплойте:

```bash
git push heroku main
```

5. Получите URL и установите webhook

## API Endpoints

- `GET /` - Проверка работоспособности
- `GET /webhook` - Проверка webhook от Telegram
- `POST /webhook` - Обработка обновлений от Telegram

## Логирование

Все логи выводятся в консоль. Для production рекомендуется настроить централизованное логирование.

## Тестирование

Отправьте боту команду `/start` - он должен ответить приветственным сообщением.

