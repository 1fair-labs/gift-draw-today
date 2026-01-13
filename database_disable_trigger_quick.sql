-- Быстрое отключение триггера (выполните это в Supabase SQL Editor)
-- Триггер вызывает ошибку при обновлении пользователя

ALTER TABLE users DISABLE TRIGGER update_users_last_used_at;

-- После отключения триггера авторизация должна работать
-- Если нужно включить триггер обратно позже:
-- ALTER TABLE users ENABLE TRIGGER update_users_last_used_at;
