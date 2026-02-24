-- Добавление колонки last_bot_message_ids в таблицу users
-- Хранит до 10 ID предыдущих сообщений авторизации для последующего удаления.
-- Текущее сообщение хранится в last_bot_message_id и не удаляется.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_bot_message_ids INTEGER[] DEFAULT '{}';

COMMENT ON COLUMN users.last_bot_message_ids IS 'ID последних до 10 сообщений авторизации бота в Telegram; только эти сообщения удаляются при новой авторизации.';
