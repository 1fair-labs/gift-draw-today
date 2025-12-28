// Утилита для проверки, открыт ли сайт в Telegram WebApp
export const isInTelegramWebApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Проверяем оба варианта: Telegram и telegram (для совместимости)
  const tg = (window as any).Telegram?.WebApp || (window as any).telegram?.WebApp;
  
  // Если объект WebApp не существует, точно не в Telegram
  if (!tg) return false;
  
  // Дополнительная проверка: должны быть данные пользователя или platform не должен быть 'unknown'
  // Это помогает отличить реальный Telegram WebApp от подделки
  const hasUser = !!tg.initDataUnsafe?.user;
  const platform = tg.platform;
  const hasValidPlatform = platform && platform !== 'unknown' && platform !== 'web';
  
  // Если есть пользователь или валидная платформа - это Telegram WebApp
  return hasUser || hasValidPlatform;
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

