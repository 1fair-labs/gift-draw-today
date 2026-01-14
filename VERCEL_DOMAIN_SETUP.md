# Настройка домена giftdraw.today

## Что было сделано:

1. ✅ Обновлены все ссылки в коде на новый домен `https://giftdraw.today`
2. ✅ Исправлена шапка для Telegram WebApp (уменьшены размеры, добавлены настройки цвета)
3. ✅ Добавлен username бота `@giftdrawtoday_bot` в функцию редиректа
4. ✅ Обновлен TON Connect Manifest с новым доменом

## Что нужно сделать в Vercel:

### ⚠️ ВАЖНО: Добавить кастомный домен giftdraw.today

**Перед настройкой Telegram бота необходимо добавить домен в Vercel:**

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Найдите проект `crypto-lottery-today`
3. Перейдите в **Settings** → **Domains**
4. Нажмите **Add Domain**
5. Введите: `giftdraw.today`
6. Следуйте инструкциям для настройки DNS записей у вашего регистратора домена

**Подробные инструкции см. в файле `VERCEL_CUSTOM_DOMAIN_SETUP.md`**

### 1. Создать новый проект или переименовать существующий

**Вариант А: Переименовать существующий проект**
1. Зайдите в настройки проекта в Vercel
2. Перейдите в Settings → General
3. Найдите поле "Project Name" и измените на `crypto-lottery-today`
4. Сохраните изменения

**Вариант Б: Создать новый проект**
1. Создайте новый проект в Vercel
2. Назовите его `crypto-lottery-today`
3. Подключите тот же GitHub репозиторий
4. Настройте деплой

### 2. Проверить домен

После переименования проекта автоматически будет доступен домен:
- `https://crypto-lottery-today.vercel.app`

### 3. Обновить настройки Telegram бота

1. Откройте @BotFather в Telegram
2. Найдите вашего бота `@giftdrawtoday_bot`
3. Выполните команду `/mybots`
4. Выберите вашего бота
5. Выберите "Bot Settings" → "Menu Button"
6. Или используйте команду `/newapp` для создания/обновления мини-приложения
7. Укажите новый URL: `https://giftdraw.today`

### 4. Настроить домен для Telegram Login Widget

**ВАЖНО:** Для работы Telegram Login Widget необходимо настроить домен через команду `/setdomain`:

1. Откройте @BotFather в Telegram
2. Введите команду `/setdomain`
3. Выберите вашего бота `@giftdrawtoday_bot`
4. Введите домен **без протокола и слеша**: `giftdraw.today`
5. После успешной настройки вы получите подтверждение от BotFather

**Примечание:** Если вы видите ошибку "Bot domain invalid" на странице, это означает, что домен не настроен в BotFather или указан неправильно.

### 5. Обновить TON Connect Manifest

Файл `public/tonconnect-manifest.json` уже обновлен с новым доменом. После деплоя он будет доступен по адресу:
- `https://giftdraw.today/tonconnect-manifest.json`

### 6. Проверить работу

1. Откройте мини-приложение в Telegram
2. Проверьте, что шапка отображается корректно
3. Проверьте подключение по Telegram ID
4. Проверьте отображение аватара
5. **Проверьте Telegram Login Widget** - кнопка должна работать без ошибки "Bot domain invalid"

## Изменения в коде:

### Файлы с обновленным доменом:
- ✅ `public/tonconnect-manifest.json`
- ✅ `index.html` (meta tags)
- ✅ `src/pages/Index.tsx` (функция `redirectToTelegramMiniApp`)

### Улучшения для Telegram WebApp:
- ✅ Настройка цвета фона шапки (`setHeaderColor`)
- ✅ Настройка цвета фона приложения (`setBackgroundColor`)
- ✅ Уменьшенные размеры элементов в шапке для мобильных устройств
- ✅ Адаптивные размеры текста и кнопок

## Важные замечания:

1. **Домен должен быть доступен** - после деплоя на Vercel новый домен будет автоматически доступен
2. **HTTPS обязателен** - Telegram требует HTTPS для мини-приложений
3. **CORS настройки** - Vercel автоматически настраивает CORS для вашего домена
4. **Кэширование** - может потребоваться время для обновления кэша Telegram

## После деплоя:

1. Проверьте доступность сайта: `https://giftdraw.today`
2. Проверьте доступность манифеста: `https://giftdraw.today/tonconnect-manifest.json`
3. Обновите URL мини-приложения в @BotFather
4. **Настройте домен для Telegram Login Widget через `/setdomain` в @BotFather**
5. Протестируйте мини-приложение в Telegram
6. Проверьте, что Telegram Login Widget работает без ошибки "Bot domain invalid"

