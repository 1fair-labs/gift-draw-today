-- Колонки для хранения ID сообщений бота в Telegram (удаление старых при новой авторизации).
-- Выполнить в Supabase SQL Editor если current_message_id или last_bot_message_ids отсутствуют.

-- Текущее сообщение (один ID)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS current_message_id INTEGER;

COMMENT ON COLUMN users.current_message_id IS 'ID текущего сообщения авторизации бота.';

-- Массив до 10 предыдущих ID (для удаления при следующей авторизации)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_bot_message_ids INTEGER[] DEFAULT '{}';

COMMENT ON COLUMN users.last_bot_message_ids IS 'До 10 предыдущих ID сообщений авторизации; удаляются при новой авторизации.';

-- Если раньше использовалась колонка last_bot_message_id, можно перенести данные и удалить старую (опционально):
-- UPDATE users SET current_message_id = last_bot_message_id WHERE last_bot_message_id IS NOT NULL AND current_message_id IS NULL;
-- ALTER TABLE users DROP COLUMN IF EXISTS last_bot_message_id;

-- Важно: для записи с сервера (webhook) должен использоваться SUPABASE_SERVICE_ROLE_KEY,
-- иначе RLS может блокировать UPDATE и строки не обновятся (в логах будет "0 rows updated").
-- RLS: для Service Role политики не применяются; для anon — нужна политика UPDATE на таблице users.
