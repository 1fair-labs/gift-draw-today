-- Удаление триггера update_users_last_used_at
-- Триггер вызывает ошибку при обновлении существующих пользователей
-- last_used_at обновляется вручную в коде, триггер не нужен

-- Удаляем триггер
DROP TRIGGER IF EXISTS update_users_last_used_at ON users;

-- Удаляем функцию (опционально)
DROP FUNCTION IF EXISTS update_last_used_at();

-- Теперь last_used_at обновляется вручную в коде при каждом обновлении refresh_token
-- Это безопаснее и не вызывает ошибок
