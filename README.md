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
# GIFT token mint (после запуска npm run create-gift-token):
# VITE_GIFT_MINT_ADDRESS=<mint_address>
```

### Creating the GIFT token (devnet)

To create the GIFT SPL token on Solana devnet and use it in the app:

1. Install dependencies: `npm install`
2. **Keypair with devnet SOL** — choose one:
   - **Option A (Solana CLI):** `solana config set --url devnet`, `solana-keygen new`, `solana airdrop 2`. Then run step 3 (script uses `~/.config/solana/id.json` by default).
   - **Option B (use existing Phantom wallet):** Derive keypair from your Phantom recovery phrase **once, locally**. Phrase is read only from env (never logged or stored). Output file is in `.gitignore` — do not commit it.
     - PowerShell: `$env:PHANTOM_RECOVERY_PHRASE="word1 word2 ... word12"; npm run phantom-keypair`
     - Then: `$env:SOLANA_KEYPAIR_PATH="phantom-keypair.json"; npm run create-gift-token`
3. Run: `npm run create-gift-token` (with `SOLANA_KEYPAIR_PATH` set if using Option B).
4. Add the printed mint address to `.env`: `VITE_GIFT_MINT_ADDRESS=<mint_address>`
5. Restart the dev server or rebuild the app.

**Security:** Never commit `phantom-keypair.json`, recovery phrase, or `.env` with secrets. The phrase is only read from `PHANTOM_RECOVERY_PHRASE` env var.

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
