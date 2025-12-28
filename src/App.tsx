// src/App.tsx
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Landing from "./pages/Landing";
import MiniApp from "./pages/MiniApp";
import NotFound from "./pages/NotFound";
import { isInTelegramWebApp } from "./lib/telegram";

const queryClient = new QueryClient();

// Компонент для редиректа с корня
function RootRedirect() {
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const check = () => {
      const tg = (window as any).Telegram?.WebApp || (window as any).telegram?.WebApp;
      setIsTelegram(!!tg);
      setChecked(true);
    };

    // Проверяем сразу и с небольшой задержкой на случай асинхронной загрузки
    check();
    const timer = setTimeout(check, 300);
    return () => clearTimeout(timer);
  }, []);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Если в Telegram — остаёмся на /
  // Если не в Telegram — редиректим на /landing
  if (isTelegram) {
    return <MiniApp />;
  } else {
    return <Navigate to="/landing" replace />;
  }
}

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/miniapp" element={<MiniApp />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;