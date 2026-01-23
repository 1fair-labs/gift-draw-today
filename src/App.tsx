// src/AppComponent.tsx
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SolanaWalletProvider } from '@/lib/solana-wallet-provider';
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
  return (
    <SolanaWalletProvider>
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
    </SolanaWalletProvider>
  );
}

export default App;
