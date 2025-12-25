# Настройка Telegram Mini App и Wallet Integration

## Что было сделано:

1. **Архитектура изменена на использование Telegram ID:**
   - Пользователи идентифицируются по Telegram ID вместо адреса кошелька
   - Данные синхронизируются между сайтом и мини-приложением по Telegram ID
   - База данных обновлена для поддержки `telegram_id`

2. **Подключение через Telegram Mini App:**
   - При нажатии "Connect Wallet" на обычном сайте - редирект в Telegram мини-приложение
   - В мини-приложении автоматическое подключение по Telegram ID
   - Отображение аватара и данных пользователя

3. **Платежи через Telegram Wallet:**
   - Интеграция с Telegram Wallet API для покупки билетов
   - Автоматическое создание билетов после успешной оплаты

## Что нужно настроить:

### 1. Миграция базы данных

Выполните SQL миграцию из файла `database_telegram_migration.sql`:

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_id BIGINT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
```

### 2. Настройка Telegram бота и мини-приложения

В файле `src/pages/Index.tsx` найдите функцию `redirectToTelegramMiniApp()` и замените:

```typescript
const botUsername = 'YOUR_BOT_USERNAME'; // Замените на реальный username бота
const miniAppUrl = `https://t.me/${botUsername}/your_mini_app`; // Замените на реальный URL
```

**Как получить URL мини-приложения:**
1. Создайте бота через @BotFather
2. Настройте мини-приложение через @BotFather командой `/newapp`
3. Укажите URL вашего сайта (например, `https://russian-modem-guide.vercel.app`)
4. Получите URL вида: `https://t.me/your_bot/your_mini_app`

### 3. Настройка адреса кошелька лотереи

В функции `handleBuyTicket()` замените:

```typescript
const lotteryWalletAddress = 'YOUR_LOTTERY_WALLET_ADDRESS'; // Замените на реальный адрес
```

### 4. Настройка платежей через Telegram Wallet

Telegram Wallet API использует метод `openInvoice()` для платежей. Текущая реализация использует базовый подход.

**Для работы с TON/USDT:**
- Telegram Wallet поддерживает прямые переводы в TON
- Можно использовать TON Connect для отправки транзакций
- Или использовать Telegram Payments API для фиатных платежей

**Альтернативный подход - TON Connect транзакции:**
Если `openInvoice()` не работает для криптовалют, используйте TON Connect для отправки транзакций:

```typescript
// Пример отправки транзакции через TON Connect
const transaction = {
  validUntil: Math.floor(Date.now() / 1000) + 360,
  messages: [{
    address: lotteryWalletAddress,
    amount: totalPrice * 1000000000, // В nanoTON
  }]
};

await tonConnect.sendTransaction(transaction);
```

### 5. Проверка работы

1. **На обычном сайте:**
   - Нажмите "Connect Wallet"
   - Должен произойти редирект в Telegram мини-приложение

2. **В Telegram мини-приложении:**
   - Автоматическое подключение по Telegram ID
   - Отображение аватара и данных пользователя
   - Возможность покупки билетов

3. **Синхронизация:**
   - Данные синхронизируются по Telegram ID
   - Билеты видны и на сайте, и в мини-приложении

## Структура данных:

### Таблица `users`:
- `id` - UUID
- `telegram_id` - BIGINT (уникальный, новый)
- `wallet_address` - TEXT (опционально, для обратной совместимости)
- `balance` - NUMERIC
- `created_at`, `updated_at` - TIMESTAMP

### Таблица `tickets`:
- `owner` - TEXT (формат: `telegram_123456` для Telegram ID или адрес кошелька)
- Остальные поля без изменений

## Важные замечания:

1. **Telegram ID уникален** - один пользователь = один Telegram ID
2. **Обратная совместимость** - старые пользователи по `wallet_address` продолжают работать
3. **Безопасность** - Telegram ID получается только из `initDataUnsafe.user.id` в WebApp
4. **Платежи** - требуют настройки Telegram Payments или использования TON Connect

## Следующие шаги:

1. ✅ Выполнить миграцию базы данных
2. ✅ Настроить URL мини-приложения
3. ✅ Настроить адрес кошелька лотереи
4. ⚠️ Протестировать платежи (может потребоваться доработка)
5. ⚠️ Добавить выбор количества билетов при покупке
6. ⚠️ Добавить выбор типа билета (gold/silver/bronze)

