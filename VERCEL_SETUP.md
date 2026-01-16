# Настройка Vercel для Production и Preview Deployments

## Текущая конфигурация

Проект настроен для работы с двумя ветками:
- **`main`** → Production deployment (автоматически при push)
- **`dev`** → Preview deployment (автоматически при push)

## Настройка в Vercel Dashboard

### 1. Откройте настройки проекта в Vercel

1. Перейдите на https://vercel.com/dashboard
2. Выберите проект `crypto-lottery-today`
3. Перейдите в **Settings** → **Git**

### 2. Настройте Production Branch

1. В разделе **Production Branch** убедитесь, что указано: `main`
2. Это стандартная настройка по умолчанию

### 3. Настройте Preview Deployments

1. В разделе **Preview Deployments** убедитесь, что включено:
   - ✅ **Automatic Preview Deployments** - включено
   - ✅ **Deploy Pull Requests** - включено (опционально)

### 4. Игнорирование веток (опционально)

Если нужно исключить какие-то ветки из автоматических деплоев:
- В разделе **Ignored Build Step** можно добавить условия
- По умолчанию все ветки кроме `main` создают preview deployments

## Как это работает

### Production Deployment (main)
- При каждом push в ветку `main` создается production deployment
- URL: `https://crypto-lottery-today.vercel.app` (или ваш кастомный домен)

### Preview Deployment (dev и другие ветки)
- При каждом push в ветку `dev` создается preview deployment
- URL: `https://crypto-lottery-today-{hash}.vercel.app` (уникальный для каждого коммита)
- Также доступен через Pull Request, если создан PR из `dev` в `main`

## Workflow разработки

1. **Разработка в ветке `dev`:**
   ```bash
   git checkout dev
   # Вносите изменения
   git add .
   git commit -m "Your changes"
   git push origin dev
   ```
   → Создается preview deployment автоматически

2. **Деплой в production:**
   ```bash
   git checkout main
   git merge dev
   git push origin main
   ```
   → Создается production deployment автоматически

## Переменные окружения

Убедитесь, что переменные окружения настроены для обеих сред:

1. **Settings** → **Environment Variables**
2. Добавьте переменные для:
   - **Production** (main)
   - **Preview** (dev и другие ветки)
   - **Development** (локальная разработка)

Пример переменных:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `TELEGRAM_BOT_TOKEN`
- И другие необходимые переменные

## Проверка настроек

После настройки проверьте:

1. Сделайте push в `dev` → должен появиться preview deployment
2. Сделайте push в `main` → должен обновиться production deployment
3. В Vercel Dashboard → **Deployments** вы увидите все деплои

## Дополнительные настройки

Если нужно изменить настройки сборки:

1. **Settings** → **General** → **Build & Development Settings**
2. Убедитесь, что:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

Эти настройки обычно определяются автоматически, но можно указать вручную.
