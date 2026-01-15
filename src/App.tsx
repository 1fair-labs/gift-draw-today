// src/App.tsx
import { useEffect, useState, useMemo, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { GlowWalletAdapter } from '@solana/wallet-adapter-glow';
import { TorusWalletAdapter } from '@solana/wallet-adapter-torus';
import { LedgerWalletAdapter } from '@solana/wallet-adapter-ledger';
import { MathWalletAdapter } from '@solana/wallet-adapter-mathwallet';
import { CoinbaseWalletAdapter } from '@solana/wallet-adapter-coinbase';
import { TrustWalletAdapter } from '@solana/wallet-adapter-trust';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';
import Landing from "./pages/Landing";
import MiniApp from "./pages/MiniApp";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";

const queryClient = new QueryClient();

// Компонент для корневого пути - сразу редиректит на /landing если не Telegram
function RootRedirect() {
  const [isTelegram, setIsTelegram] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = () => {
      // СТРОГАЯ проверка: только если Telegram SDK реально загружен
      // НЕ создаем window.telegram.WebApp искусственно!
      const tg = (window as any).Telegram?.WebApp || (window as any).telegram?.WebApp;
      
      // Если объекта нет вообще - точно не Telegram
      if (!tg) {
        setIsTelegram(false);
        setChecked(true);
        return;
      }
      
      // Дополнительные проверки для реального Telegram WebApp:
      // 1. Должен быть initDataUnsafe с user (данные пользователя)
      // 2. ИЛИ platform должен быть валидным (не 'unknown', не 'web')
      // 3. Должен быть метод ready (признак реального SDK)
      const hasUser = !!tg?.initDataUnsafe?.user;
      const platform = tg?.platform;
      const hasValidPlatform = platform && 
        platform !== 'unknown' && 
        platform !== 'web' && 
        (platform === 'ios' || platform === 'android' || platform === 'tdesktop' || platform === 'desktop' || platform === 'macos' || platform === 'windows' || platform === 'linux');
      const hasReadyMethod = typeof tg?.ready === 'function';
      
      // Только если есть пользователь ИЛИ валидная платформа И метод ready
      const isRealTelegram = hasReadyMethod && (hasUser || hasValidPlatform);
      
      setIsTelegram(isRealTelegram);
      setChecked(true);
    };

    // Проверяем сразу
    check();
    
    // И еще раз через небольшую задержку на случай асинхронной загрузки SDK
    const timer = setTimeout(check, 300);
    return () => clearTimeout(timer);
  }, []);

  // Пока проверяем, показываем loading
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Показываем MiniApp на корневом пути (редирект отключен)
  return <MiniApp />;
}

function App() {
  const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;
  
  // Solana network configuration
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  
  // Supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
      new GlowWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new MathWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TrustWalletAdapter(),
    ],
    []
  );

  // Обработчик ошибок кошелька
  const onError = useCallback((error: any) => {
    // Игнорируем некритичные ошибки Solflare (MetaMask detection)
    if (error?.message?.includes('solflare-detect-metamask') || 
        error?.message?.includes('Unknown response id')) {
      // Это не критичная ошибка, просто игнорируем
      return;
    }
    
    console.error('Wallet error:', error);
    
    // Если кошелек не установлен, открываем страницу установки
    if (error?.name === 'WalletNotFoundError' || 
        error?.name === 'WalletNotInstalledError' ||
        error?.message?.includes('not found') || 
        error?.message?.includes('not installed') ||
        error?.message?.includes('No provider found') ||
        error?.message?.includes('not available')) {
      const walletName = error?.wallet?.name || error?.wallet?.adapter?.name || 'wallet';
      const installUrls: Record<string, string> = {
        'Phantom': 'https://phantom.app/',
        'Solflare': 'https://solflare.com/',
        'Backpack': 'https://www.backpack.app/',
        'Glow': 'https://glow.app/',
        'Torus': 'https://tor.us/',
        'MathWallet': 'https://mathwallet.org/',
        'Coinbase Wallet': 'https://www.coinbase.com/wallet',
        'Trust Wallet': 'https://trustwallet.com/',
      };
      
      const installUrl = installUrls[walletName] || 'https://solana.com/ecosystem/explore?categories=wallet';
      
      // Используем setTimeout чтобы избежать блокировки UI
      setTimeout(() => {
        if (confirm(`${walletName} is not installed. Would you like to open the installation page?`)) {
          window.open(installUrl, '_blank');
        }
      }, 100);
    } else {
      // Для других ошибок показываем сообщение только если это не ошибка отмены пользователем
      if (error?.name !== 'WalletConnectionError' && 
          error?.name !== 'WalletNotSelectedError' &&
          !error?.message?.includes('User rejected') &&
          !error?.message?.includes('User cancelled')) {
        console.error('Wallet error details:', error);
        // Не показываем alert для всех ошибок, чтобы не раздражать пользователя
        // Ошибки уже логируются в консоль
      }
    }
  }, []);
  
  // Добавляем глобальный обработчик для игнорирования некритичных ошибок
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      // Игнорируем ошибки Solflare MetaMask detection
      if (args[0]?.includes?.('solflare-detect-metamask') || 
          args[0]?.includes?.('Unknown response id')) {
        return;
      }
      originalError.apply(console, args);
    };
    
    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false} onError={onError}>
        <WalletModalProvider>
          <TonConnectUIProvider manifestUrl={manifestUrl}>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/landing" element={<Landing />} />
                    <Route path="/miniapp" element={<MiniApp />} />
                    <Route path="/auth" element={<AuthCallback />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </QueryClientProvider>
          </TonConnectUIProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;