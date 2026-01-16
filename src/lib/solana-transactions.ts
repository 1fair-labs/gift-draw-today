// src/lib/solana-transactions.ts
import { Transaction, PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { createPurchaseTicketTransaction, LOTTERY_WALLET_ADDRESS, USDT_MINT_ADDRESS } from './solana-config';

/**
 * Send a transaction to purchase a ticket
 * @param amount Amount in USDT
 * @returns Transaction signature
 */
export const purchaseTicket = async (
  wallet: any, // Wallet adapter instance
  amount: number
): Promise<string> => {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  if (!LOTTERY_WALLET_ADDRESS) {
    throw new Error('Lottery wallet address not configured');
  }

  // Create transaction
  const transaction = await createPurchaseTicketTransaction(
    wallet.publicKey,
    new PublicKey(LOTTERY_WALLET_ADDRESS),
    amount,
    USDT_MINT_ADDRESS
  );

  // Sign and send transaction
  const signature = await wallet.sendTransaction(transaction, {
    skipPreflight: false,
  });

  return signature;
};

/**
 * Hook to purchase a ticket using the connected wallet
 */
export const usePurchaseTicket = () => {
  const wallet = useWallet();

  const purchase = async (amount: number): Promise<string> => {
    if (!wallet.publicKey || !wallet.sendTransaction) {
      throw new Error('Wallet not connected or does not support transactions');
    }

    return purchaseTicket(wallet, amount);
  };

  return { purchase, wallet };
};
