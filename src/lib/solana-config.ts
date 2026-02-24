// src/lib/solana-config.ts
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, createTransferInstruction } from '@solana/spl-token';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// Solana network: VITE_SOLANA_NETWORK=devnet для тестнета, иначе mainnet
const _env = typeof import.meta !== 'undefined' ? (import.meta as any).env : {};
const _networkEnv = _env?.VITE_SOLANA_NETWORK?.toLowerCase();
export const SOLANA_NETWORK = _networkEnv === 'devnet' || _networkEnv === 'testnet'
  ? WalletAdapterNetwork.Devnet
  : WalletAdapterNetwork.Mainnet;
// RPC: VITE_SOLANA_RPC_URL задаёт свой URL. Иначе для mainnet — Ankr, для devnet — public devnet.
export const SOLANA_RPC_URL = _env?.VITE_SOLANA_RPC_URL
  ? _env.VITE_SOLANA_RPC_URL
  : SOLANA_NETWORK === WalletAdapterNetwork.Devnet
    ? 'https://api.devnet.solana.com'
    : 'https://rpc.ankr.com/solana';

// Публичный mainnet RPC для fallback при 403 (API key not allowed to access blockchain)
const FALLBACK_MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

function isRpc403OrApiKeyError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('403') || msg.includes('API key is not allowed to access blockchain');
}

function getFallbackConnection(): Connection {
  return new Connection(FALLBACK_MAINNET_RPC, 'confirmed');
}

// Token mint addresses (SPL tokens)
export const USDT_MINT_ADDRESS = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'; // USDT on Solana
// GIFT: set VITE_GIFT_MINT_ADDRESS in .env (e.g. after running npm run create-gift-token)
export const GIFT_MINT_ADDRESS = (_env?.VITE_GIFT_MINT_ADDRESS ?? '').trim() || '';

// Lottery wallet address (where payments go)
// TODO: Replace with actual lottery wallet address
export const LOTTERY_WALLET_ADDRESS = ''; // TODO: Add lottery wallet address

// Create Solana connection
export const getSolanaConnection = () => {
  return new Connection(SOLANA_RPC_URL, 'confirmed');
};

// Get SOL balance (retry once on failure; on 403/API key error use fallback public RPC)
export const getSolBalance = async (publicKey: PublicKey): Promise<number> => {
  const connection = getSolanaConnection();
  try {
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9; // Convert lamports to SOL
  } catch (err) {
    if (SOLANA_NETWORK === WalletAdapterNetwork.Mainnet && isRpc403OrApiKeyError(err)) {
      console.warn('getSolBalance: primary RPC returned 403/API key error, using fallback public RPC');
      const fallback = getFallbackConnection();
      const balance = await fallback.getBalance(publicKey);
      return balance / 1e9;
    }
    console.warn('getSolBalance failed, retrying once:', err);
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9;
  }
};

// Get SPL token balance
export const getTokenBalance = async (
  publicKey: PublicKey,
  mintAddress: string
): Promise<number> => {
  const fetchBalance = async (conn: Connection): Promise<number> => {
    const mintPublicKey = new PublicKey(mintAddress);
    const tokenAccount = await getAssociatedTokenAddress(mintPublicKey, publicKey);
    try {
      const accountInfo = await getAccount(conn, tokenAccount);
      const decimals = accountInfo.mint.toString() === USDT_MINT_ADDRESS ? 6 : 9;
      return Number(accountInfo.amount) / Math.pow(10, decimals);
    } catch {
      return 0; // Token account doesn't exist
    }
  };

  try {
    const connection = getSolanaConnection();
    return await fetchBalance(connection);
  } catch (err) {
    if (SOLANA_NETWORK === WalletAdapterNetwork.Mainnet && isRpc403OrApiKeyError(err)) {
      try {
        return await fetchBalance(getFallbackConnection());
      } catch {
        return 0;
      }
    }
    console.error('Error getting token balance:', err);
    return 0;
  }
};

// Get USDT balance
export const getUsdtBalance = async (publicKey: PublicKey): Promise<number> => {
  return getTokenBalance(publicKey, USDT_MINT_ADDRESS);
};

// Get GIFT balance
export const getGiftBalance = async (publicKey: PublicKey): Promise<number> => {
  if (!GIFT_MINT_ADDRESS) {
    console.warn('GIFT mint address not configured');
    return 0;
  }
  return getTokenBalance(publicKey, GIFT_MINT_ADDRESS);
};

// Get all balances (SOL, USDT, GIFT)
export const getAllBalances = async (publicKey: PublicKey) => {
  const [solBalance, usdtBalance, giftBalance] = await Promise.all([
    getSolBalance(publicKey),
    getUsdtBalance(publicKey),
    getGiftBalance(publicKey),
  ]);

  return {
    sol: solBalance,
    usdt: usdtBalance,
    gift: giftBalance,
  };
};

// Purchase ticket transaction
// This function creates a transaction to purchase a ticket
// It transfers USDT from user to lottery wallet
export const createPurchaseTicketTransaction = async (
  fromPublicKey: PublicKey,
  toPublicKey: PublicKey, // Lottery wallet address
  amount: number, // Amount in USDT (will be converted to token units)
  mintAddress: string = USDT_MINT_ADDRESS
): Promise<Transaction> => {
  const connection = getSolanaConnection();
  const mintPublicKey = new PublicKey(mintAddress);
  
  // Get associated token addresses
  const fromTokenAccount = await getAssociatedTokenAddress(
    mintPublicKey,
    fromPublicKey
  );
  
  const toTokenAccount = await getAssociatedTokenAddress(
    mintPublicKey,
    toPublicKey
  );

  // Create transaction
  const transaction = new Transaction();

  // Add transfer instruction
  // USDT has 6 decimals, so multiply by 1e6
  const amountInUnits = Math.floor(amount * 1e6);
  
  transaction.add(
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromPublicKey,
      amountInUnits,
      []
    )
  );

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPublicKey;

  return transaction;
};
