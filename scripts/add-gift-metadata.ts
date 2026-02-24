/**
 * Add Metaplex token metadata to existing GIFT mint so Phantom shows name, symbol, and image.
 * Image and metadata JSON: favicon.svg and gift-token-metadata.json (uri points to production).
 *
 * Prerequisites: keypair with devnet SOL (same as create-gift-token). Mint must already exist.
 *
 * Run: npm run add-gift-metadata
 * Set GIFT_MINT_ADDRESS if different from .env VITE_GIFT_MINT_ADDRESS (optional).
 */

import dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import {
  createV1,
  mplTokenMetadata,
  TokenStandard,
} from '@metaplex-foundation/mpl-token-metadata';
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import { keypairIdentity, percentAmount, publicKey } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const DEFAULT_METADATA_URI = 'https://giftdraw.today/gift-token-metadata.json';

function getKeypairPath(): string {
  const envPath = process.env.SOLANA_KEYPAIR_PATH;
  if (envPath) return path.resolve(envPath);
  const cwd = process.cwd();
  const local = path.join(cwd, 'phantom-keypair.json');
  if (fs.existsSync(local)) return local;
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.config', 'solana', 'id.json');
}

function loadKeypair(filePath: string): Uint8Array {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error('Keypair file not found:', resolved);
    process.exit(1);
  }
  const secret = JSON.parse(fs.readFileSync(resolved, 'utf-8')) as number[];
  return Uint8Array.from(secret);
}

async function main() {
  const mintAddress = process.env.GIFT_MINT_ADDRESS || process.env.VITE_GIFT_MINT_ADDRESS;
  if (!mintAddress) {
    console.error('Set GIFT_MINT_ADDRESS or VITE_GIFT_MINT_ADDRESS (mint to add metadata to).');
    process.exit(1);
  }

  const umi = createUmi(DEVNET_RPC).use(mplTokenMetadata()).use(mplToolbox());
  const secretKey = loadKeypair(getKeypairPath());
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  umi.use(keypairIdentity(keypair));

  const mint = publicKey(mintAddress);
  const uri = process.env.GIFT_METADATA_URI || DEFAULT_METADATA_URI;

  console.log('Adding metadata to mint', mintAddress, '...');
  console.log('Metadata URI:', uri);

  const tx = await createV1(umi, {
    mint,
    authority: umi.identity,
    payer: umi.identity,
    updateAuthority: umi.identity,
    name: 'GIFT',
    symbol: 'GIFT',
    uri,
    sellerFeeBasisPoints: percentAmount(0),
    tokenStandard: TokenStandard.Fungible,
    decimals: 9,
  }).sendAndConfirm(umi);

  console.log('Metadata created. Signature:', tx.signature);
  console.log('Phantom should now show GIFT with name and image (after refresh).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
