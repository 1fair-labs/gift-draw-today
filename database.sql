-- Создание таблицы users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  balance NUMERIC(20, 2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индекса для быстрого поиска по wallet_address
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- Создание таблицы tickets (если еще не существует)
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  owner TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gold', 'silver', 'bronze')),
  status TEXT NOT NULL CHECK (status IN ('available', 'in_draw', 'used')),
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индекса для быстрого поиска билетов по владельцу
CREATE INDEX IF NOT EXISTS idx_tickets_owner ON tickets(owner);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at в таблице users
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Включение Row Level Security (RLS) для безопасности
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Политики безопасности для users (разрешаем чтение и запись всем)
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (true);

-- Политики безопасности для tickets (разрешаем чтение и запись всем)
CREATE POLICY "Tickets are viewable by everyone" ON tickets
  FOR SELECT USING (true);

CREATE POLICY "Tickets can be inserted by anyone" ON tickets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Tickets can be updated by anyone" ON tickets
  FOR UPDATE USING (true);

