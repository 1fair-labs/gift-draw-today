/**
 * Update on-chain Metaplex metadata for GIFT token (name "Gift", uri to gift-token-metadata.json).
 * Run after add-gift-metadata when you change the off-chain JSON; Phantom will then show the new name.
 *
 * Prerequisites: same keypair as mint authority (update authority), devnet SOL.
 *
 * Run: npm run update-gift-metadata
 */

import dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { updateV1, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const DEFAULT_URI = 'https://giftdraw.today/gift-token-metadata.json';

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
    console.error('Set GIFT_MINT_ADDRESS or VITE_GIFT_MINT_ADDRESS.');
    process.exit(1);
  }

  const umi = createUmi(DEVNET_RPC).use(mplTokenMetadata()).use(mplToolbox());
  const secretKey = loadKeypair(getKeypairPath());
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  umi.use(keypairIdentity(keypair));

  const mint = publicKey(mintAddress);
  const uri = process.env.GIFT_METADATA_URI || DEFAULT_URI;

  console.log('Updating on-chain metadata for mint', mintAddress);
  console.log('New name: Gift, URI:', uri);

  const tx = await updateV1(umi, {
    mint,
    authority: umi.identity,
    payer: umi.identity,
    data: {
      name: 'Gift',
      symbol: 'GIFT',
      uri,
      sellerFeeBasisPoints: 0,
      creators: [{ address: umi.identity.publicKey, verified: true, share: 100 }],
    },
  }).sendAndConfirm(umi);

  console.log('Metadata updated. Signature:', tx.signature);
  console.log('Phantom should show "Gift" and new image after refresh.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
