// src/lib/solana-config.ts
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, createTransferInstruction } from '@solana/spl-token';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// Solana network configuration
export const SOLANA_NETWORK = WalletAdapterNetwork.Mainnet; // Change to Devnet for testing
export const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com'; // Or use custom RPC

// Token mint addresses (SPL tokens)
// TODO: Replace with actual mint addresses for USDT and GIFT tokens
export const USDT_MINT_ADDRESS = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'; // USDT on Solana
export const GIFT_MINT_ADDRESS = ''; // TODO: Add GIFT token mint address

// Lottery wallet address (where payments go)
// TODO: Replace with actual lottery wallet address
export const LOTTERY_WALLET_ADDRESS = ''; // TODO: Add lottery wallet address

// Create Solana connection
export const getSolanaConnection = () => {
  return new Connection(SOLANA_RPC_URL, 'confirmed');
};

// Get SOL balance
export const getSolBalance = async (publicKey: PublicKey): Promise<number> => {
  const connection = getSolanaConnection();
  const balance = await connection.getBalance(publicKey);
  return balance / 1e9; // Convert lamports to SOL
};

// Get SPL token balance
export const getTokenBalance = async (
  publicKey: PublicKey,
  mintAddress: string
): Promise<number> => {
  try {
    const connection = getSolanaConnection();
    const mintPublicKey = new PublicKey(mintAddress);
    
    // Get associated token address
    const tokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      publicKey
    );

    try {
      const accountInfo = await getAccount(connection, tokenAccount);
      // Convert balance to human-readable format (assuming 6 decimals for USDT, adjust for GIFT)
      const decimals = accountInfo.mint.toString() === USDT_MINT_ADDRESS ? 6 : 9; // Default to 9 for GIFT
      return Number(accountInfo.amount) / Math.pow(10, decimals);
    } catch (error) {
      // Token account doesn't exist, balance is 0
      return 0;
    }
  } catch (error) {
    console.error('Error getting token balance:', error);
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
