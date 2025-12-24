-- Триггер для автоматического приведения wallet_address к нижнему регистру
-- Выполните этот SQL в Supabase SQL Editor

-- Функция для приведения wallet_address к нижнему регистру перед вставкой/обновлением
CREATE OR REPLACE FUNCTION normalize_wallet_address()
RETURNS TRIGGER AS $$
BEGIN
  NEW.wallet_address = LOWER(NEW.wallet_address);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для таблицы users
DROP TRIGGER IF EXISTS trigger_normalize_users_wallet_address ON users;
CREATE TRIGGER trigger_normalize_users_wallet_address
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION normalize_wallet_address();

-- Триггер для таблицы tickets (для поля owner)
CREATE OR REPLACE FUNCTION normalize_ticket_owner()
RETURNS TRIGGER AS $$
BEGIN
  NEW.owner = LOWER(NEW.owner);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_normalize_tickets_owner ON tickets;
CREATE TRIGGER trigger_normalize_tickets_owner
  BEFORE INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION normalize_ticket_owner();

