from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import os
import httpx
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Telegram Bot Webhook")

# Получаем переменные окружения
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN environment variable is required")
WEB_APP_URL = os.getenv("WEB_APP_URL", "https://giftdraw.today")

if not BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN environment variable is required")


class TelegramUpdate(BaseModel):
    update_id: int
    message: Optional[dict] = None


class TelegramMessage(BaseModel):
    message_id: int
    from_user: Optional[dict] = None
    chat: dict
    date: int
    text: Optional[str] = None


@app.get("/")
async def root():
    """Проверка работоспособности сервиса"""
    return {"status": "ok", "service": "telegram-bot-webhook"}


@app.get("/webhook")
async def webhook_get():
    """Проверка webhook от Telegram"""
    return {"status": "ok"}


@app.post("/webhook")
async def webhook_post(request: Request):
    """Обработка обновлений от Telegram"""
    try:
        data = await request.json()
        logger.info(f"Received update: {data}")

        # Проверяем, что это сообщение
        if "message" not in data or not data["message"]:
            logger.info("No message in update")
            return {"ok": True}

        message = data["message"]
        text = message.get("text")
        
        if not text:
            logger.info("No text in message")
            return {"ok": True}

        # Получаем данные пользователя
        from_user = message.get("from", {})
        user_id = from_user.get("id")
        username = from_user.get("username")
        first_name = from_user.get("first_name", "User")
        chat_id = message.get("chat", {}).get("id")

        logger.info(f"Processing message: text={text}, user_id={user_id}, chat_id={chat_id}")

        # Обработка команды /start
        if text.startswith("/start"):
            args = text.split(" ")
            
            # Проверяем, есть ли токен авторизации
            if len(args) > 1 and args[1].startswith("auth_"):
                token = args[1].replace("auth_", "")
                logger.info(f"Processing auth token: {token}")

                if not user_id:
                    await send_message(chat_id, "❌ Ошибка: не удалось получить ваш ID")
                    return {"ok": True}

                try:
                    # Отправляем данные на API для привязки пользователя к токену
                    async with httpx.AsyncClient() as client:
                        verify_response = await client.post(
                            f"{WEB_APP_URL}/api/auth/verify-token",
                            json={
                                "token": token,
                                "userId": user_id,
                                "username": username,
                                "firstName": first_name,
                            },
                            timeout=10.0,
                        )
                        verify_data = verify_response.json()

                    if not verify_data.get("success"):
                        await send_message(
                            chat_id,
                            "❌ Ошибка авторизации. Токен недействителен или истек."
                        )
                        return {"ok": True}

                    # Отправляем подтверждение и кнопку для возврата на сайт
                    callback_url = verify_data.get("callbackUrl")
                    await send_message(
                        chat_id,
                        f"✅ Авторизация успешна!\n\n"
                        f"Вы авторизованы как: {first_name or username or f'ID: {user_id}'}\n\n"
                        f"Нажмите кнопку ниже, чтобы вернуться на сайт.",
                        buttons=[[{"text": "🔗 Вернуться на сайт", "url": callback_url}]]
                    )
                    logger.info("Auth successful, message sent")
                except Exception as e:
                    logger.error(f"Error verifying token: {e}")
                    await send_message(
                        chat_id,
                        "❌ Ошибка при авторизации. Попробуйте еще раз."
                    )
            else:
                # Обычная команда /start
                logger.info("Sending regular /start response")
                await send_message(
                    chat_id,
                    "👋 Привет! Я бот для GiftDraw.today.\n\n"
                    "Для авторизации на сайте перейдите по ссылке на сайте и нажмите \"Connect via Telegram\"."
                )
        else:
            logger.info(f"Message is not /start command: {text}")

        return {"ok": True}

    except Exception as e:
        logger.error(f"Error in webhook: {e}", exc_info=True)
        return {"ok": True}  # Всегда возвращаем ok, чтобы Telegram не повторял запрос


async def send_message(
    chat_id: int,
    text: str,
    buttons: Optional[list] = None
):
    """Отправка сообщения через Telegram Bot API"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    
    reply_markup = None
    if buttons:
        reply_markup = {
            "inline_keyboard": [
                [
                    {"text": btn["text"], "url": btn["url"]}
                    for btn in row
                ]
                for row in buttons
            ]
        }

    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
    }
    
    if reply_markup:
        payload["reply_markup"] = reply_markup

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            response.raise_for_status()
            result = response.json()
            
            if not result.get("ok"):
                logger.error(f"Telegram API error: {result}")
                raise Exception(f"Telegram API error: {result}")
            
            return result
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

