# GiftDraw.today

Web app for fair, transparent draws with Solana and NFT tickets.

> **Важно:** это веб-сайт (открывается в браузере или во встроенном браузере Telegram), а не Telegram Mini App. Подробнее — см. [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md).

## Features

- 🎫 **NFT Tickets** — участие в тиражах по билетам
- 💰 **Solana / Phantom** — кошелёк для покупки и балансов
- 🔐 **Авторизация через Telegram-бота** — вход по ссылке из бота
- 📱 **Удобно в браузере** — в т.ч. при открытии из Telegram

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: shadcn-ui + Tailwind CSS
- **Blockchain**: Solana (Phantom), Supabase
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Telegram Bot (для авторизации пользователей)

### Installation

```bash
npm install
npm run dev
```

### Environment Variables

Create a `.env` file (see `.env.example` if present):

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# Опционально: тестнет Solana (в Phantom переключи на Devnet)
# VITE_SOLANA_NETWORK=devnet
# Свой RPC: VITE_SOLANA_RPC_URL=https://...
```

### Database

Run SQL migrations in order (see repo root):

1. `database.sql` — base schema
2. `database_telegram_migration.sql` — Telegram ID support
3. `database_trigger_lowercase.sql` — lowercase wallet addresses

## Deployment (Vercel)

1. Connect GitHub repo to Vercel
2. Set environment variables
3. Deploy on push to main

## Docs

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — что за проект и почему не Mini App
- [TELEGRAM_BOT_AUTH_SETUP.md](./TELEGRAM_BOT_AUTH_SETUP.md) — авторизация через бота
- [TELEGRAM_BOT_SETUP.md](./TELEGRAM_BOT_SETUP.md) — настройка бота
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) — Supabase
- [VERCEL_SETUP.md](./VERCEL_SETUP.md) — Vercel

## License

MIT
