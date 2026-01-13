-- Проверка наличия необходимых колонок в таблице users
-- Выполните этот запрос в Supabase SQL Editor, чтобы проверить, что миграция выполнена

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'refresh_token',
    'refresh_expires_at',
    'access_token',
    'access_expires_at',
    'last_used_at',
    'is_revoked',
    'username',
    'first_name',
    'last_login_at'
  )
ORDER BY column_name;

-- Если колонки отсутствуют, выполните database_refresh_token_migration.sql
