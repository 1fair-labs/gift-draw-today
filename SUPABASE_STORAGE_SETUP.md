# Настройка Supabase Storage для аватаров

## Проблема
Telegram Bot API не хранит файлы долго. URL аватаров становятся невалидными (404) после холодного старта или через некоторое время.

## Решение
Аватары теперь скачиваются и сохраняются в Supabase Storage, что обеспечивает постоянную доступность.

## Шаг 1: Создайте bucket в Supabase Storage

1. Откройте ваш проект в [Supabase Dashboard](https://app.supabase.com)
2. Перейдите в **Storage** в левом меню
3. Нажмите **New bucket**
4. Назовите bucket: `avatars`
5. Установите **Public bucket** (чтобы аватары были доступны публично)
6. Нажмите **Create bucket**

## Шаг 2: Настройте политики безопасности (RLS)

1. В Storage перейдите в **Policies** для bucket `avatars`
2. Добавьте политику для чтения (SELECT):
   - Policy name: `Public read access`
   - Allowed operation: `SELECT`
   - Target roles: `anon`, `authenticated`
   - Policy definition: `true` (разрешить всем)

3. Добавьте политику для записи (INSERT/UPDATE):
   - Policy name: `Service role upload`
   - Allowed operation: `INSERT`, `UPDATE`
   - Target roles: `service_role` (используется серверными функциями)
   - Policy definition: `true`

**Важно:** Для записи через serverless функции Vercel используется `service_role` key, который должен быть в переменных окружения.

## Шаг 3: Проверьте переменные окружения в Vercel

Убедитесь, что в Vercel настроены переменные окружения:
- `VITE_SUPABASE_URL` - URL вашего проекта Supabase
- `VITE_SUPABASE_ANON_KEY` - Anon key из Supabase (для чтения)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (для записи в Storage)

**Где найти Service Role Key:**
1. В Supabase Dashboard → **Settings** → **API**
2. Найдите **service_role** key (секретный ключ)
3. Добавьте его в Vercel как `SUPABASE_SERVICE_ROLE_KEY`

## Шаг 4: Обновите код для использования Service Role Key

В `api/lib/user-auth-store.ts` может потребоваться использовать Service Role Key для записи в Storage. Проверьте, что Supabase client инициализирован с правильным ключом для serverless функций.

## Как это работает

1. **При логине:** Аватар скачивается с Telegram API и сохраняется в Supabase Storage
2. **При загрузке страницы:** Проверяется валидность URL аватара
   - Если URL из Supabase Storage - всегда валиден
   - Если URL из Telegram API - проверяется доступность
   - Если невалиден - автоматически обновляется через API `/api/auth/refresh-avatar`
3. **Публичный URL:** Аватары доступны по постоянному URL из Supabase Storage

## Преимущества

- ✅ Аватары всегда доступны (не зависят от Telegram API)
- ✅ Быстрая загрузка (CDN Supabase)
- ✅ Автоматическое обновление при необходимости
- ✅ Надежное хранение

## Миграция существующих аватаров

Существующие аватары с URL Telegram API будут автоматически обновлены при следующей загрузке страницы пользователем.
