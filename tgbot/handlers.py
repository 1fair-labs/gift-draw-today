import os
import httpx
from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command

router = Router()

WEB_APP_URL = os.getenv('WEB_APP_URL', 'https://giftdraw.today')

@router.message(Command("start"))
async def cmd_start(message: Message):
    """Обработка команды /start"""
    text = message.text or ""
    args = text.split(" ")
    
    # Проверяем, есть ли токен авторизации
    if len(args) > 1 and args[1].startswith("auth_"):
        token = args[1].replace("auth_", "")
        user_id = message.from_user.id
        username = message.from_user.username
        first_name = message.from_user.first_name or "User"
        
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
                await message.answer(
                    "❌ Ошибка авторизации. Токен недействителен или истек."
                )
                return

            # Отправляем подтверждение и кнопку для возврата на сайт
            callback_url = verify_data.get("callbackUrl")
            from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
            
            keyboard = InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        InlineKeyboardButton(
                            text="🔗 Вернуться на сайт",
                            url=callback_url
                        )
                    ]
                ]
            )
            
            await message.answer(
                f"✅ Авторизация успешна!\n\n"
                f"Вы авторизованы как: {first_name or username or f'ID: {user_id}'}\n\n"
                f"Нажмите кнопку ниже, чтобы вернуться на сайт.",
                reply_markup=keyboard
            )
        except Exception as e:
            print(f"Error verifying token: {e}")
            await message.answer(
                "❌ Ошибка при авторизации. Попробуйте еще раз."
            )
    else:
        # Обычная команда /start
        await message.answer(
            "👋 Привет! Я бот для GiftDraw.today.\n\n"
            "Для авторизации на сайте перейдите по ссылке на сайте и нажмите \"Connect via Telegram\"."
        )

@router.message(F.text)
async def handle_text(message: Message):
    """Обработка текстовых сообщений"""
    # Можно добавить обработку других команд здесь
    pass

