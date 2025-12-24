-- Миграция для исправления регистра адресов кошельков
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Обновляем все адреса в таблице users к нижнему регистру
UPDATE users
SET wallet_address = LOWER(wallet_address)
WHERE wallet_address != LOWER(wallet_address);

-- 2. Обновляем все адреса в таблице tickets к нижнему регистру
UPDATE tickets
SET owner = LOWER(owner)
WHERE owner != LOWER(owner);

-- 3. Проверяем дубликаты (если есть)
-- Если после миграции остались дубликаты, нужно их объединить
-- Например, если есть два пользователя с одинаковым адресом в разном регистре:
-- 
-- SELECT wallet_address, COUNT(*) as count
-- FROM users
-- GROUP BY LOWER(wallet_address)
-- HAVING COUNT(*) > 1;
--
-- Затем нужно вручную объединить записи, оставив одну с правильным балансом

-- 4. Убеждаемся, что уникальный индекс работает правильно
-- (должен быть создан в database.sql)
-- Если нужно пересоздать индекс:
-- DROP INDEX IF EXISTS idx_users_wallet_address;
-- CREATE UNIQUE INDEX idx_users_wallet_address ON users(LOWER(wallet_address));

