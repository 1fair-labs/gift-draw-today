# Supabase Storage: ID сообщений авторизации бота

ID сообщений авторизации («Authorization successful!») хранятся в **Supabase Storage**, а не в таблице `users`.

## Бакет

- **Имя бакета:** `auth-data`
- **Тип:** приватный (Private)
- **Путь к файлам:** `auth-message-ids/{telegram_id}.json`

## Создание бакета

1. Supabase Dashboard → **Storage** → **New bucket**
2. Name: `auth-data`
3. **Private bucket** — включить (файлы не должны быть доступны по публичной ссылке)
4. Создать

Права: при использовании **Service Role Key** на сервере (webhook) запись и чтение работают без дополнительных RLS-политик для Storage.

### Если ничего не сохраняется

1. **Проверьте ключ на сервере (Vercel и т.д.):** в переменных окружения должен быть **SUPABASE_SERVICE_ROLE_KEY** (не только anon). В логах при старте должно быть: `UserAuthStore initialized with Service Role key`.
2. **Политики Storage (RLS):** для приватного бакета с **anon** ключом загрузка по умолчанию запрещена. Либо задайте **Service Role Key** в окружении webhook, либо в Supabase: Storage → бакет `auth-data` → Policies → добавьте политику **Allow upload** для нужной роли (например, service_role или authenticated).
3. **Логи:** при ошибке записи в логах будет строка `❌ Error saving auth message IDs to Storage:` и текст ошибки (например, "new row violates row-level security policy" или "Bucket not found").

## Формат файла

Один JSON-файл на пользователя, например `auth-message-ids/507777197.json`:

### Новый формат (актуальный)

```json
{
  "current_auth_message_id": 606,
  "current_command_message_id": 605,
  "history_ids": [600, 596, 594, 595, 590]
}
```

- `current_auth_message_id` — ID последнего сообщения авторизации бота (`✅ Authorization successful!`).
- `current_command_message_id` — ID последней команды пользователя (`/start` или нажатие кнопки), которая привела к успешной авторизации.
- `history_ids` — до 25 предыдущих ID сообщений (старые `current_auth_message_id`, старые команды и т.п.), **только они удаляются при новой авторизации**.

### Старый формат (поддерживается для обратной совместимости)

```json
{
  "current_message_id": 502,
  "last_bot_message_ids": [498, 495, 490]
}
```

При чтении:

- `current_message_id` используется как `current_auth_message_id`,
- `last_bot_message_ids` интерпретируется как `history_ids`.
