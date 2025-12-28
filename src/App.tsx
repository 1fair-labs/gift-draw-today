import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import MiniApp from "./pages/MiniApp";
import NotFound from "./pages/NotFound";
import { isInTelegramWebApp } from "./lib/telegram";

const queryClient = new QueryClient();

const App = () => {
  const [isTelegram, setIsTelegram] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  // Проверяем наличие Telegram WebApp после загрузки
  useEffect(() => {
    const checkTelegram = () => {
      const tg = (window as any).Telegram?.WebApp || (window as any).telegram?.WebApp;
      if (tg) {
        setIsTelegram(true);
        setIsChecked(true);
      } else {
        // Проверяем несколько раз, так как SDK может загружаться асинхронно
        let attempts = 0;
        const maxAttempts = 50;
        const interval = setInterval(() => {
          attempts++;
          const tgCheck = (window as any).Telegram?.WebApp || (window as any).telegram?.WebApp;
          if (tgCheck) {
            setIsTelegram(true);
            setIsChecked(true);
            clearInterval(interval);
          } else if (attempts >= maxAttempts) {
            setIsTelegram(false);
            setIsChecked(true);
            clearInterval(interval);
          }
        }, 100);
        
        return () => clearInterval(interval);
      }
    };

    checkTelegram();
  }, []);

  // Инициализация Telegram WebApp при загрузке приложения
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let resizeHandler: (() => void) | null = null;
    let viewportHandler: (() => void) | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 50; // Максимум 50 попыток (5 секунд)
    
    // Функция инициализации Telegram WebApp
    const initTelegramWebApp = () => {
      if (typeof window === 'undefined') return false;
      
      // Проверяем наличие Telegram WebApp SDK
      if (!window.telegram?.WebApp) {
        retryCount++;
        if (retryCount > MAX_RETRIES) {
          console.warn('Telegram WebApp SDK not loaded after maximum retries');
          return false;
        }
        console.log(`Telegram WebApp SDK not loaded yet, retrying... (${retryCount}/${MAX_RETRIES})`);
        // Повторяем попытку через 100ms
        timeoutId = setTimeout(initTelegramWebApp, 100);
        return false;
      }

      const tg = window.telegram.WebApp;
      
      // Проверяем, что методы доступны
      if (!tg.ready || !tg.expand || !tg.disableVerticalSwipes) {
        retryCount++;
        if (retryCount > MAX_RETRIES) {
          console.warn('Telegram WebApp methods not available after maximum retries');
          return false;
        }
        console.log(`Telegram WebApp methods not available yet, retrying... (${retryCount}/${MAX_RETRIES})`);
        timeoutId = setTimeout(initTelegramWebApp, 100);
        return false;
      }
      
      // Сбрасываем счетчик при успешной инициализации
      retryCount = 0;

      console.log('Initializing Telegram WebApp...');
      
      // Логируем информацию о WebApp
      console.log('WebApp initialized', {
        platform: tg.platform || 'unknown',
        version: tg.version || 'unknown'
      });
      
      try {
        // ВАЖНО: ready() должен быть вызван первым
        tg.ready();
        
        // КРИТИЧЕСКИ ВАЖНО: expand() должен быть вызван СРАЗУ после ready()
        // Это разворачивает приложение на весь экран
        // Для Telegram Desktop версии 6.0 expand() может не работать, но пробуем
        const expandApp = () => {
          if (tg.expand) {
            try {
              tg.expand();
              console.log('expand() called');
            } catch (e) {
              console.error('Error expanding:', e);
            }
          } else {
            console.warn('tg.expand() is not available');
          }
        };
        
        // Вызываем expand сразу после ready()
        expandApp();
        
        // Для десктопной версии вызываем expand очень агрессивно
        // Telegram Desktop версии 6.0 может требовать множественных вызовов
        if (!tg.platform || tg.platform === 'unknown' || tg.platform === 'tdesktop' || tg.platform === 'desktop') {
          // Очень частые вызовы для десктопной версии
          for (let i = 0; i < 20; i++) {
            setTimeout(() => expandApp(), i * 100);
          }
        } else {
          // Для мобильных версий
          setTimeout(expandApp, 100);
          setTimeout(expandApp, 300);
          setTimeout(expandApp, 500);
        }
        
        console.log('Viewport height:', tg.viewportHeight);
        console.log('Viewport stable height:', tg.viewportStableHeight);
        console.log('Platform:', tg.platform);
        
        // Отключаем сворачивание приложения свайпом вниз
        if (tg.disableVerticalSwipes) {
          try {
            tg.disableVerticalSwipes();
            console.log('Vertical swipes disabled');
          } catch (e) {
            console.warn('disableVerticalSwipes not supported:', e);
          }
        }
        
        // Настраиваем внешний вид для Telegram WebApp
        if (tg.setHeaderColor) {
          try {
            tg.setHeaderColor('#0a0a0a');
          } catch (e) {
            console.warn('setHeaderColor not supported:', e);
          }
        }
        
        if (tg.setBackgroundColor) {
          try {
            tg.setBackgroundColor('#0a0a0a');
          } catch (e) {
            console.warn('setBackgroundColor not supported:', e);
          }
        }
        
        console.log('Telegram WebApp appearance configured');
        
        // Обработчик изменения viewport для поддержания полноэкранного режима
        viewportHandler = () => {
          expandApp();
        };
        
        if (tg.onEvent && viewportHandler) {
          try {
            tg.onEvent('viewportChanged', viewportHandler);
          } catch (e) {
            console.warn('onEvent not supported:', e);
          }
        }
        
        // Также обрабатываем событие изменения размера окна
        resizeHandler = () => {
          setTimeout(() => {
            expandApp();
          }, 100);
        };
        window.addEventListener('resize', resizeHandler);
        
        // Для десктопной версии также слушаем события фокуса
        const focusHandler = () => {
          setTimeout(() => {
            expandApp();
          }, 200);
        };
        window.addEventListener('focus', focusHandler);
        
        return true;
      } catch (error) {
        console.error('Error initializing Telegram WebApp:', error);
        return false;
      }
    };

    // Пробуем инициализировать сразу
    initTelegramWebApp();
    
    // Также пробуем после полной загрузки страницы
    const domContentLoadedHandler = () => {
      initTelegramWebApp();
    };
    
    const loadHandler = () => {
      initTelegramWebApp();
    };
    
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', domContentLoadedHandler);
    } else {
      // Если DOM уже загружен, пробуем сразу
      initTelegramWebApp();
    }
    
    // Также пробуем после полной загрузки всех ресурсов
    window.addEventListener('load', loadHandler);
    
    // Cleanup: удаляем обработчики событий при размонтировании
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (viewportHandler && window.telegram?.WebApp?.offEvent) {
        window.telegram.WebApp.offEvent('viewportChanged', viewportHandler);
      }
      window.removeEventListener('DOMContentLoaded', domContentLoadedHandler);
      window.removeEventListener('load', loadHandler);
    };
  }, []);

  // Показываем Landing пока проверяем, или если не Telegram
  if (!isChecked) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={isTelegram ? <MiniApp /> : <Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/miniapp" element={<MiniApp />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
