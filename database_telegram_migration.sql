-- Миграция для поддержки Telegram ID
-- Добавляем поле telegram_id в таблицу users

-- Добавляем колонку telegram_id (если еще не существует)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

-- Создаем индекс для быстрого поиска по telegram_id
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Обновляем таблицу tickets, чтобы owner мог быть как wallet_address, так и telegram_id
-- (owner уже TEXT, так что может хранить и то, и другое)

-- Комментарии для документации
COMMENT ON COLUMN users.telegram_id IS 'Telegram user ID for identification in Telegram mini app';
COMMENT ON COLUMN users.wallet_address IS 'Wallet address (can be TON address or legacy address)';


