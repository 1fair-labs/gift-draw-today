/**
 * Derive Solana keypair from Phantom recovery phrase (BIP39) and write to phantom-keypair.json.
 *
 * SECURITY:
 * - Phrase is read ONLY from env PHANTOM_RECOVERY_PHRASE (from .env or shell; never from args).
 * - Output file is in .gitignore — do NOT commit it. Do NOT commit .env.
 * - Run only on your machine; never share the phrase or the generated file.
 *
 * Usage (one-time, locally):
 *   Put PHANTOM_RECOVERY_PHRASE in .env, or set in shell, then: npm run phantom-keypair
 *
 * Then run create-gift-token with:
 *   set SOLANA_KEYPAIR_PATH=phantom-keypair.json
 *   npm run create-gift-token
 */

import dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { HDKey } from 'micro-ed25519-hdkey';

const DERIVATION_PATH = "m/44'/501'/0'/0'";
const OUTPUT_FILE = 'phantom-keypair.json';

function main() {
  const phrase = process.env.PHANTOM_RECOVERY_PHRASE?.trim();
  if (!phrase) {
    console.error('PHANTOM_RECOVERY_PHRASE is not set.');
    console.error('');
    console.error('Usage (run only locally, never commit the phrase):');
    console.error('  Windows CMD:    set PHANTOM_RECOVERY_PHRASE="word1 word2 ... word12"');
    console.error('  PowerShell:     $env:PHANTOM_RECOVERY_PHRASE="word1 word2 ... word12"');
    console.error('  Linux/macOS:    export PHANTOM_RECOVERY_PHRASE="word1 word2 ... word12"');
    console.error('  Then:          npm run phantom-keypair');
    console.error('');
    console.error('The output file phantom-keypair.json is in .gitignore. Do NOT commit it.');
    process.exit(1);
  }

  if (!bip39.validateMnemonic(phrase)) {
    console.error('Invalid recovery phrase (must be 12 or 24 valid BIP39 words).');
    process.exit(1);
  }

  const seed = bip39.mnemonicToSeedSync(phrase, '');
  const hd = HDKey.fromMasterSeed(seed.toString('hex'));
  const derived = hd.derive(DERIVATION_PATH);
  const keypair = Keypair.fromSeed(derived.privateKey);

  const outPath = path.resolve(process.cwd(), OUTPUT_FILE);
  const secretArray = Array.from(keypair.secretKey);
  fs.writeFileSync(outPath, JSON.stringify(secretArray), 'utf-8');

  console.log('Keypair derived and written to:', outPath);
  console.log('Public key (address):', keypair.publicKey.toString());
  console.log('');
  console.log('Do NOT commit', OUTPUT_FILE, 'or share it.');
  console.log('To create GIFT token, run:');
  console.log('  set SOLANA_KEYPAIR_PATH=' + OUTPUT_FILE);
  console.log('  npm run create-gift-token');
}

main();
