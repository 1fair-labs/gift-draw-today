# Инструкция по созданию нового репозитория и деплою

## Шаг 1: Подготовка проекта локально

Проект уже подготовлен:
- ✅ `package.json` обновлен с именем `crypto-lottery-today`
- ✅ Все ссылки обновлены на новый домен
- ✅ README.md обновлен

## Шаг 2: Создание нового репозитория на GitHub

### Вариант А: Через веб-интерфейс GitHub

1. Откройте https://github.com/new
2. Заполните:
   - **Repository name**: `crypto-lottery-today`
   - **Description**: `Decentralized lottery platform with Telegram integration`
   - **Visibility**: Public или Private (на ваше усмотрение)
   - **НЕ** создавайте README, .gitignore или лицензию (они уже есть)
3. Нажмите "Create repository"

### Вариант Б: Через GitHub CLI (если установлен)

```bash
gh repo create crypto-lottery-today --public --description "Decentralized lottery platform with Telegram integration"
```

## Шаг 3: Подключение нового репозитория

Выполните следующие команды в терминале:

```bash
# Убедитесь, что вы в корневой директории проекта
cd "C:\Users\Admin\Desktop\CryptoLottery_today\Cursor AI\russian-modem-guide"

# Удалите старый remote (опционально, если хотите сохранить старый)
# git remote remove origin

# Добавьте новый remote
git remote add new-origin https://github.com/YOUR_USERNAME/crypto-lottery-today.git
# Замените YOUR_USERNAME на ваш GitHub username

# Переименуйте remote (если хотите заменить старый)
# git remote rename origin old-origin
# git remote rename new-origin origin

# Или просто замените URL существующего origin
git remote set-url origin https://github.com/YOUR_USERNAME/crypto-lottery-today.git

# Проверьте, что remote настроен правильно
git remote -v

# Отправьте код в новый репозиторий
git push -u origin main
```

## Шаг 4: Деплой в Vercel

### Через веб-интерфейс Vercel

1. Откройте https://vercel.com/new
2. Нажмите "Import Git Repository"
3. Выберите ваш новый репозиторий `crypto-lottery-today`
4. Настройте проект:
   - **Project Name**: `crypto-lottery-today` (будет автоматически)
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (по умолчанию)
   - **Build Command**: `npm run build` (по умолчанию)
   - **Output Directory**: `dist` (по умолчанию)
5. Добавьте Environment Variables:
   - `VITE_SUPABASE_URL` - ваш Supabase URL
   - `VITE_SUPABASE_ANON_KEY` - ваш Supabase Anon Key
6. Нажмите "Deploy"

### Через Vercel CLI (альтернатива)

```bash
# Установите Vercel CLI (если еще не установлен)
npm i -g vercel

# Войдите в Vercel
vercel login

# Деплой проекта
vercel

# Следуйте инструкциям:
# - Link to existing project? No
# - Project name: crypto-lottery-today
# - Directory: ./
# - Override settings: No
```

## Шаг 5: Проверка деплоя

После деплоя проверьте:

1. **Основной домен**: `https://crypto-lottery-today.vercel.app`
2. **TON Connect Manifest**: `https://crypto-lottery-today.vercel.app/tonconnect-manifest.json`
3. **Работа сайта**: Откройте в браузере и проверьте функциональность

## Шаг 6: Обновление Telegram бота

1. Откройте @BotFather в Telegram
2. Найдите вашего бота `@giftdrawtoday_bot`
3. Выполните команду `/mybots`
4. Выберите вашего бота → "Bot Settings" → "Menu Button"
5. Или используйте `/newapp` для создания/обновления мини-приложения
6. Укажите новый URL: `https://crypto-lottery-today.vercel.app`

## Шаг 7: Тестирование

1. Откройте мини-приложение в Telegram
2. Проверьте подключение по Telegram ID
3. Проверьте отображение аватара
4. Проверьте покупку билетов (если настроено)

## Важные замечания

### Сохранение истории коммитов

Если вы хотите сохранить всю историю коммитов из старого репозитория, просто выполните `git push` - вся история будет перенесена.

### Если нужно начать с чистого листа

Если вы хотите начать с чистого листа (без истории):

```bash
# Удалите .git папку
rm -rf .git

# Инициализируйте новый репозиторий
git init
git add .
git commit -m "Initial commit: CryptoLottery.today"

# Добавьте remote
git remote add origin https://github.com/YOUR_USERNAME/crypto-lottery-today.git

# Отправьте код
git push -u origin main
```

### Обновление существующего проекта в Vercel

Если у вас уже есть проект в Vercel с другим именем:

1. Зайдите в настройки проекта
2. Settings → General → Project Name
3. Измените на `crypto-lottery-today`
4. Домен автоматически обновится

## Troubleshooting

### Проблема: "Repository not found"

- Проверьте, что репозиторий создан на GitHub
- Проверьте правильность URL в `git remote -v`
- Убедитесь, что у вас есть доступ к репозиторию

### Проблема: Домен не обновился в Vercel

- Подождите несколько минут (DNS может обновляться)
- Проверьте настройки проекта в Vercel
- Убедитесь, что проект переименован правильно

### Проблема: Telegram мини-приложение не работает

- Проверьте, что URL в @BotFather правильный
- Убедитесь, что сайт доступен по HTTPS
- Проверьте консоль браузера на ошибки

