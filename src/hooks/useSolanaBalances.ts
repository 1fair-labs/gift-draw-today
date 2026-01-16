// src/hooks/useSolanaBalances.ts
import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAllBalances } from '@/lib/solana-config';

export function useSolanaBalances() {
  const { publicKey } = useWallet();
  const [solBalance, setSolBalance] = useState<number>(0);
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [giftBalance, setGiftBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const loadBalances = useCallback(async () => {
    if (!publicKey) {
      setSolBalance(0);
      setUsdtBalance(0);
      setGiftBalance(0);
      return;
    }

    setLoading(true);
    try {
      const balances = await getAllBalances(publicKey);
      setSolBalance(balances.sol);
      setUsdtBalance(balances.usdt);
      setGiftBalance(balances.gift);
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    loadBalances();
    
    // Refresh balances every 10 seconds
    const interval = setInterval(loadBalances, 10000);
    
    return () => clearInterval(interval);
  }, [loadBalances]);

  return {
    solBalance,
    usdtBalance,
    giftBalance,
    loading,
    refresh: loadBalances,
  };
}
