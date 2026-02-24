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

## Формат файла

Один JSON-файл на пользователя, например `auth-message-ids/507777197.json`:

```json
{
  "current_message_id": 502,
  "last_bot_message_ids": [498, 495, 490]
}
```

- `current_message_id` — ID последнего сообщения авторизации (его не удаляем).
- `last_bot_message_ids` — до 10 предыдущих ID (их удаляем в боте при следующей авторизации).
