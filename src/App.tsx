import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Типы для window.telegram уже определены в Index.tsx

const App = () => {
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
      
      // Для отладки: показываем информацию о WebApp
      if (tg.showAlert) {
        const debugInfo = `WebApp initialized\nPlatform: ${tg.platform || 'unknown'}\nVersion: ${tg.version || 'unknown'}`;
        console.log('Debug info:', debugInfo);
        // Раскомментируйте следующую строку для показа alert в Telegram
        // tg.showAlert(debugInfo);
      }
      
      try {
        // ВАЖНО: ready() должен быть вызван первым
        tg.ready();
        
        // Настраиваем полноэкранный режим - вызываем несколько раз для надежности
        const expandApp = () => {
          if (tg.expand) {
            try {
              tg.expand();
              console.log('Telegram WebApp expanded, isExpanded:', tg.isExpanded);
            } catch (e) {
              console.error('Error expanding:', e);
            }
          }
        };
        
        // Вызываем expand сразу
        expandApp();
        
        // Для десктопной версии вызываем expand более агрессивно
        if (tg.platform === 'tdesktop' || tg.platform === 'desktop' || !tg.platform || tg.platform === 'unknown') {
          // Множественные вызовы с разными задержками для десктопной версии
          setTimeout(expandApp, 50);
          setTimeout(expandApp, 100);
          setTimeout(expandApp, 200);
          setTimeout(expandApp, 300);
          setTimeout(expandApp, 500);
          setTimeout(expandApp, 800);
          setTimeout(expandApp, 1000);
          setTimeout(expandApp, 1500);
          setTimeout(expandApp, 2000);
        } else {
          // Для мобильных версий достаточно меньше вызовов
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
        
        // Отключаем подтверждение закрытия - оно мешает пользователю
        // if (tg.enableClosingConfirmation) {
        //   try {
        //     tg.enableClosingConfirmation();
        //   } catch (e) {
        //     console.warn('enableClosingConfirmation not supported:', e);
        //   }
        // }
        
        console.log('Telegram WebApp appearance configured');
        
        // Обработчик изменения viewport для поддержания полноэкранного режима
        viewportHandler = () => {
          console.log('Viewport changed, expanding...');
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
        
        // Периодически проверяем и расширяем (для десктопной версии)
        const expandInterval = setInterval(() => {
          // Проверяем, развернуто ли приложение
          const isExpanded = tg.isExpanded !== false; // isExpanded может быть undefined, true или false
          const viewportTooSmall = tg.viewportHeight && tg.viewportHeight < window.innerHeight * 0.9;
          
          if (!isExpanded || viewportTooSmall) {
            console.log('App not fully expanded, expanding...', { isExpanded, viewportHeight: tg.viewportHeight, windowHeight: window.innerHeight });
            expandApp();
          }
        }, 1000); // Проверяем каждую секунду
        
        // Очищаем интервал через 30 секунд (увеличено для десктопной версии)
        setTimeout(() => {
          clearInterval(expandInterval);
        }, 30000);
        
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

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
