/**
 * Create GIFT SPL token on Solana devnet and print the mint address.
 *
 * Prerequisites:
 *   - Solana CLI keypair with devnet SOL: solana config set --url devnet && solana airdrop 2
 *   - Or set SOLANA_KEYPAIR_PATH to your keypair JSON file path
 *   - Optionally set GIFT_CREATOR_WALLET to mint tokens to that address (default: keypair address)
 *
 * Run: npm run create-gift-token
 *
 * After running, add to .env: VITE_GIFT_MINT_ADDRESS=<printed_mint_address>
 * Then restart dev server or rebuild the app.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const DECIMALS = 9;
const INITIAL_SUPPLY = 100_000_000 * Math.pow(10, DECIMALS); // 100M GIFT

function getKeypairPath(): string {
  const envPath = process.env.SOLANA_KEYPAIR_PATH;
  if (envPath) return path.resolve(envPath);
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.config', 'solana', 'id.json');
}

function loadKeypair(filePath: string): Keypair {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error('Keypair file not found:', resolved);
    console.error('');
    console.error('Create a keypair and get devnet SOL:');
    console.error('  solana config set --url devnet');
    console.error('  solana-keygen new');
    console.error('  solana airdrop 2');
    console.error('');
    console.error('Or set SOLANA_KEYPAIR_PATH to your keypair JSON path.');
    process.exit(1);
  }
  const secret = JSON.parse(fs.readFileSync(resolved, 'utf-8')) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function main() {
  const keypairPath = getKeypairPath();
  const payer = loadKeypair(keypairPath);
  const connection = new Connection(DEVNET_RPC, 'confirmed');

  const balance = await connection.getBalance(payer.publicKey);
  if (balance < 0.01 * 1e9) {
    console.error('Insufficient SOL for transaction fees. Get devnet SOL:');
    console.error('  solana airdrop 2');
    process.exit(1);
  }

  console.log('Creating GIFT mint on devnet...');
  const mintAddress = await createMint(
    connection,
    payer,
    payer.publicKey,
    null,
    DECIMALS
  );
  console.log('Mint created:', mintAddress.toString());

  const creatorAddress = process.env.GIFT_CREATOR_WALLET
    ? new PublicKey(process.env.GIFT_CREATOR_WALLET)
    : payer.publicKey;
  console.log('Creating token account and minting initial supply to', creatorAddress.toString(), '...');
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintAddress,
    creatorAddress
  );
  await mintTo(
    connection,
    payer,
    mintAddress,
    ata.address,
    payer,
    INITIAL_SUPPLY
  );
  console.log('Minted', INITIAL_SUPPLY / Math.pow(10, DECIMALS), 'GIFT to', creatorAddress.toString());

  console.log('');
  console.log('---');
  console.log('GIFT mint address (add to .env):');
  console.log('VITE_GIFT_MINT_ADDRESS=' + mintAddress.toString());
  console.log('---');
  console.log('');
  console.log('Then restart the dev server or rebuild the app.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
