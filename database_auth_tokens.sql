-- Создание таблицы для хранения токенов авторизации
CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY,
  user_id BIGINT,
  username TEXT,
  first_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Создание индекса для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);

-- Создание индекса для поиска активных токенов (без user_id)
CREATE INDEX IF NOT EXISTS idx_auth_tokens_active ON auth_tokens(expires_at) WHERE user_id IS NULL;

-- Функция для автоматической очистки истекших токенов (опционально, можно запускать периодически)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Включение Row Level Security (RLS)
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;

-- Политики безопасности для auth_tokens (разрешаем чтение и запись всем для serverless функций)
CREATE POLICY "Auth tokens are viewable by everyone" ON auth_tokens
  FOR SELECT USING (true);

CREATE POLICY "Auth tokens can be inserted by everyone" ON auth_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Auth tokens can be updated by everyone" ON auth_tokens
  FOR UPDATE USING (true);

CREATE POLICY "Auth tokens can be deleted by everyone" ON auth_tokens
  FOR DELETE USING (true);
