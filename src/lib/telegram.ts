// Утилита для проверки, открыт ли сайт в Telegram WebApp
export const isInTelegramWebApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Проверяем оба варианта: Telegram и telegram (для совместимости)
  const tg = (window as any).Telegram?.WebApp || window.telegram?.WebApp;
  // Простая проверка: объект WebApp должен существовать
  return !!tg;
};

// Типы для window.telegram
declare global {
  interface Window {
    telegram?: {
      WebApp?: any;
    };
    Telegram?: {
      WebApp?: any;
    };
  }
}

