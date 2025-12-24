-- Исправление уникального ограничения для wallet_address
-- Выполните этот SQL после миграции migration_fix_wallet_addresses.sql

-- 1. Удаляем старый индекс (если существует)
DROP INDEX IF EXISTS idx_users_wallet_address;

-- 2. Создаем уникальный индекс на LOWER(wallet_address) для case-insensitive уникальности
-- Это предотвратит создание дубликатов с разным регистром
CREATE UNIQUE INDEX idx_users_wallet_address_lower 
ON users(LOWER(wallet_address));

-- 3. Также обновляем индекс для tickets
DROP INDEX IF EXISTS idx_tickets_owner;
CREATE INDEX idx_tickets_owner_lower ON tickets(LOWER(owner));

-- Примечание: Supabase/PostgREST может не поддерживать функциональные индексы напрямую
-- В этом случае можно использовать триггер для автоматического приведения к нижнему регистру

