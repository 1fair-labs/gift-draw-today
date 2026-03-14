# Supabase Storage: ID сообщений авторизации бота (append-only)

ID сообщений авторизации («Authorization successful!») хранятся в **Supabase Storage**, а не в таблице `users`. Используется **append-only** схема: одно событие авторизации = один файл; после удаления сообщений в Telegram файлы удаляются.

## Бакет

- **Имя бакета:** `auth-data`
- **Тип:** приватный (Private)
- **Путь:** `auth-message-ids/{telegram_id}/{bot_message_id}.json`

## Создание бакета

1. Supabase Dashboard → **Storage** → **New bucket**
2. Name: `auth-data`
3. **Private bucket** — включить
4. Создать

Права: при использовании **Service Role Key** на сервере (webhook) запись и чтение работают без дополнительных RLS-политик.

### Если ничего не сохраняется

1. В окружении webhook должен быть **SUPABASE_SERVICE_ROLE_KEY**. В логах: `UserAuthStore initialized with Service Role key`.
2. При ошибке в логах: `❌ Error saving auth event to Storage:` или `❌ Exception saving auth event:`.

## Формат (append-only)

- **Один файл на одно событие авторизации:** `auth-message-ids/{telegram_id}/{bot_message_id}.json`
- **Содержимое:** `{"command_id": 695, "bot_id": 696}`
  - `command_id` — ID сообщения пользователя (команда `/start` или сообщение с кнопкой «🔐 Authorize»).
  - `bot_id` — ID ответа бота «Authorization successful!».

## Логика работы

1. Пользователь вызывает авторизацию (ссылка с токеном или нажатие кнопки) → бот отправляет «Authorization successful!» и получает `message_id` ответа.
2. **Читаем** все файлы в папке `auth-message-ids/{telegram_id}/`, собираем из них `command_id` и `bot_id` в список ID на удаление.
3. **Удаляем** в Telegram все сообщения с этими ID (кроме только что отправленного ответа бота).
4. **Удаляем** в Storage все прочитанные файлы.
5. **Сохраняем** один новый файл для текущего события: `auth-message-ids/{telegram_id}/{new_bot_id}.json` с `command_id` и `bot_id`.

В итоге у пользователя в Storage хранится **не более одного файла** (текущее событие). Объём хранилища минимален; гонок при параллельных запросах нет (каждый запрос только дописывает свой файл и удаляет старые после удаления сообщений).

## Поддержка, новости и прочее

Удаляются **только** сообщения, чьи ID записаны в этих файлах (команды авторизации и ответы «Authorization successful!»). Сообщения поддержки (ИИ), новости о розыгрышах и любые другие сообщения бота в Storage не попадают и не удаляются.
