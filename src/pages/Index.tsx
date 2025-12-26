import { useState, useEffect, useRef } from 'react';
import { Ticket, Trophy, Users, Clock, Sparkles, Zap, ChevronRight, Wallet, Copy, LogOut, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase, type User, type Ticket as TicketType } from '@/lib/supabase';
import { TonConnect } from '@tonconnect/sdk';
import { TonConnectUI } from '@tonconnect/ui';

// Mock data for demonstration
const mockDraw = {
  id: 42,
  prize_pool: 125000,
  jackpot: 50000,
  participants: 847,
  end_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
};

const mockTickets = [
  { id: 1001, type: 'gold', status: 'in_draw', image: '' },
  { id: 1002, type: 'silver', status: 'available', image: '' },
  { id: 1003, type: 'bronze', status: 'available', image: '' },
];

// Типы для window.ethereum
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
    telegram?: {
      WebApp?: any;
    };
  }
}

// Переключатель типа кошелька: true = Telegram, false = MetaMask
const USE_TELEGRAM_WALLET = true; // Измените на false, чтобы вернуться к MetaMask

export default function Index() {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [telegramId, setTelegramId] = useState<number | null>(null); // Telegram ID пользователя
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [currentDraw] = useState(mockDraw);
  const [loading, setLoading] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(() => {
    const saved = localStorage.getItem('balance_visible');
    return saved !== null ? saved === 'true' : true;
  });
  const [cltBalance, setCltBalance] = useState<number>(0);
  
  // TON Connect instance
  const [tonConnect] = useState(() => {
    if (typeof window === 'undefined' || !USE_TELEGRAM_WALLET) {
      console.log('TON Connect not initialized: window undefined or USE_TELEGRAM_WALLET is false');
      return null;
    }
    const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;
    console.log('Initializing TON Connect with manifest URL:', manifestUrl);
    try {
      const instance = new TonConnect({ manifestUrl });
      console.log('TON Connect instance created successfully');
      return instance;
    } catch (error) {
      console.error('Error creating TON Connect instance:', error);
      return null;
    }
  });
  
  // TON Connect UI instance для показа модального окна
  const [tonConnectUI] = useState(() => {
    if (typeof window === 'undefined' || !USE_TELEGRAM_WALLET) {
      return null;
    }
    const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;
    try {
      const ui = new TonConnectUI({
        manifestUrl,
        actionsConfiguration: {
          twaReturnUrl: window.location.href
        },
        // Настраиваем список кошельков - только Telegram Wallet
        // Это будет применено при открытии модального окна
        walletsListConfiguration: {
          // includeWallets добавляет кошельки, но не фильтрует
          // Поэтому мы будем фильтровать при открытии модального окна
        }
      });
      console.log('TON Connect UI instance created successfully');
      return ui;
    } catch (error) {
      console.error('Error creating TON Connect UI instance:', error);
      return null;
    }
  });
  
  // Состояние подключения TON кошелька
  const [tonWallet, setTonWallet] = useState<any>(null);
  
  // Данные пользователя Telegram (для аватара и имени)
  const [telegramUser, setTelegramUser] = useState<any>(null);

  // Проверяем, был ли пользователь явно отключен
  const wasDisconnected = () => {
    return localStorage.getItem('wallet_disconnected') === 'true';
  };

  const setDisconnected = (value: boolean, address?: string) => {
    if (value) {
      localStorage.setItem('wallet_disconnected', 'true');
      if (address) {
        localStorage.setItem('last_disconnected_address', address.toLowerCase());
      }
    } else {
      localStorage.removeItem('wallet_disconnected');
      localStorage.removeItem('last_disconnected_address');
    }
  };

  const getLastDisconnectedAddress = () => {
    return localStorage.getItem('last_disconnected_address');
  };
  
  const cltPrice = 0.041; // CLT/USDT
  const usdBalance = (cltBalance * cltPrice).toFixed(2);

  // ========== METAMASK WALLET CODE (скрыто, когда USE_TELEGRAM_WALLET = true) ==========
  // Функция для получения провайдера MetaMask (поддержка мобильных устройств)
  const getEthereumProvider = () => {
    if (USE_TELEGRAM_WALLET) return null; // Скрываем MetaMask код
    if (typeof window === 'undefined') return null;
    
    // Основной способ - window.ethereum
    if (window.ethereum) {
      return window.ethereum;
    }
    
    // Альтернативные способы для мобильных устройств
    const win = window as any;
    
    // Проверяем различные варианты инжекции провайдера
    if (win.ethereum) return win.ethereum;
    if (win.web3?.currentProvider) return win.web3.currentProvider;
    if (win.web3?.ethereum) return win.web3.ethereum;
    
    // Дополнительные проверки для мобильных
    if (win.__metamask) return win.__metamask;
    
    return null;
  };

  // Проверка, открыт ли сайт в браузере MetaMask
  const isInMetaMaskBrowser = () => {
    if (USE_TELEGRAM_WALLET) return false; // Скрываем MetaMask код
    if (typeof navigator === 'undefined') return false;
    const userAgent = navigator.userAgent.toLowerCase();
    // Проверяем user agent браузера MetaMask
    return userAgent.includes('metamask') || userAgent.includes('mmsdk');
  };

  // Функция для копирования текста в буфер обмена (с fallback для iOS)
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      // Пробуем современный API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      
      // Fallback для старых браузеров и iOS Safari
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  };

  // Функция для проверки наличия приложения MetaMask
  const checkMetaMaskInstalled = (): Promise<boolean> => {
    if (USE_TELEGRAM_WALLET) return Promise.resolve(false); // Скрываем MetaMask код
    return new Promise((resolve) => {
      const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
      
      if (!isIOS && !isAndroid) {
        resolve(false);
        return;
      }
      
      // Запоминаем время начала проверки и состояние страницы
      const startTime = Date.now();
      const wasVisible = document.visibilityState === 'visible';
      let appOpened = false;
      let resolved = false;
      
      const resolveOnce = (value: boolean) => {
        if (!resolved) {
          resolved = true;
          window.removeEventListener('blur', handleBlur);
          window.removeEventListener('focus', handleFocus);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          resolve(value);
        }
      };
      
      // Слушаем событие blur (страница потеряла фокус - приложение открылось)
      const handleBlur = () => {
        appOpened = true;
        // Если приложение открылось, значит оно установлено
        setTimeout(() => {
          resolveOnce(true);
        }, 300);
      };
      
      // Слушаем событие focus (вернулись на страницу)
      const handleFocus = () => {
        const elapsed = Date.now() - startTime;
        // Если вернулись очень быстро (< 500ms), значит приложение не установлено
        // Если вернулись после открытия приложения (> 500ms), значит оно было установлено
        if (elapsed < 500 && !appOpened) {
          resolveOnce(false);
        }
      };
      
      // Слушаем изменение видимости страницы (более надежно на мобильных)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          appOpened = true;
          setTimeout(() => {
            resolveOnce(true);
          }, 300);
        } else if (document.visibilityState === 'visible') {
          const elapsed = Date.now() - startTime;
          if (elapsed < 500 && !appOpened) {
            resolveOnce(false);
          }
        }
      };
      
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Пытаемся открыть приложение
      try {
        if (isIOS) {
          // Для iOS используем iframe метод (более надежно)
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = 'metamask://';
          document.body.appendChild(iframe);
          
          // Удаляем iframe через короткое время
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 100);
          
          // Также пробуем через window.location
          setTimeout(() => {
            try {
              window.location.href = 'metamask://';
            } catch (e) {
              // Игнорируем ошибки
            }
          }, 50);
        } else if (isAndroid) {
          // Для Android пробуем через intent сначала
          try {
            const intentUrl = 'intent://#Intent;scheme=metamask;package=io.metamask;end';
            window.location.href = intentUrl;
          } catch (e) {
            // Если intent не сработал, пробуем прямую схему
            try {
              window.location.href = 'metamask://';
            } catch (e2) {
              // Игнорируем ошибки
            }
          }
        }
        
        // Таймаут: если через 2 секунды ничего не произошло, считаем что приложения нет
        setTimeout(() => {
          if (!appOpened) {
            resolveOnce(false);
          }
        }, 2000);
      } catch (e) {
        resolveOnce(false);
      }
    });
  };

  // Функция для открытия приложения MetaMask (просто открывает приложение, без браузера)
  const openMetaMaskApp = () => {
    if (USE_TELEGRAM_WALLET) return; // Скрываем MetaMask код
    try {
      // Определяем платформу
      const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
      
      if (isIOS) {
        // Для iOS пробуем открыть приложение MetaMask напрямую
        // Схема: metamask://
        const metamaskScheme = 'metamask://';
        
        // Пробуем открыть через iframe (более надежно на iOS)
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = metamaskScheme;
        document.body.appendChild(iframe);
        
        // Удаляем iframe через короткое время
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
        
        // Также пробуем через window.location (fallback)
        setTimeout(() => {
          try {
            window.location.href = metamaskScheme;
          } catch (e) {
            console.log('Could not open MetaMask via direct scheme');
          }
        }, 100);
      } else if (isAndroid) {
        // Для Android просто открываем приложение через прямую схему
        // НЕ используем intent с browser, чтобы не было ошибок
        const directScheme = 'metamask://';
        
        try {
          window.location.href = directScheme;
        } catch (e) {
          console.log('Could not open MetaMask');
        }
      }
    } catch (error) {
      console.error('Error opening MetaMask:', error);
    }
  };

  // Функция для получения или создания пользователя
  const getOrCreateUser = async (address: string): Promise<User | null> => {
    if (!supabase) {
      console.error('Supabase is not configured');
      return null;
    }
    
    try {
      const normalizedAddress = address.toLowerCase();
      console.log('getOrCreateUser: Checking for user with address:', normalizedAddress);
      
      // Проверяем, существует ли пользователь (триггер автоматически приведет к нижнему регистру)
      // Но для совместимости со старыми данными ищем без учета регистра
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .ilike('wallet_address', normalizedAddress)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user:', fetchError);
      }

      if (existingUser) {
        console.log('getOrCreateUser: User found:', existingUser.id);
        // Если адрес в базе в другом регистре, обновляем его (триггер приведет к нижнему)
        if (existingUser.wallet_address !== normalizedAddress) {
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ wallet_address: normalizedAddress })
            .eq('id', existingUser.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating wallet address:', updateError);
            return existingUser as User;
          }

          return updatedUser as User;
        }
        // Пользователь существует, возвращаем его
        return existingUser as User;
      }

      // Пользователь не существует, создаем нового (триггер автоматически приведет к нижнему регистру)
      console.log('getOrCreateUser: User not found, creating new user with address:', normalizedAddress);
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          wallet_address: normalizedAddress,
          balance: 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        // Если ошибка из-за дубликата (уникальное ограничение), пытаемся найти существующего
        if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
          console.log('getOrCreateUser: Duplicate detected, fetching existing user');
          const { data: foundUser, error: fetchError2 } = await supabase
            .from('users')
            .select('*')
            .ilike('wallet_address', normalizedAddress)
            .maybeSingle();
          
          if (fetchError2) {
            console.error('Error fetching user after duplicate error:', fetchError2);
          }
          
          if (foundUser) {
            console.log('getOrCreateUser: Found existing user after duplicate error:', foundUser.id);
            return foundUser as User;
          }
        }
        return null;
      }

      if (newUser) {
        console.log('getOrCreateUser: New user created successfully:', newUser.id);
      }
      return newUser as User;
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      return null;
    }
  };

  // Функция для загрузки билетов пользователя (по Telegram ID или адресу)
  const loadUserTickets = async (identifier: string | number) => {
    if (!supabase) {
      console.error('Supabase is not configured');
      return;
    }
    
    try {
      // Если identifier - число, это telegram_id, иначе - адрес
      const ownerId = typeof identifier === 'number' 
        ? `telegram_${identifier}` 
        : identifier.toLowerCase();
      
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('owner', ownerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading tickets:', error);
        return;
      }

      if (data) {
        setTickets(data as TicketType[]);
      }
    } catch (error) {
      console.error('Error in loadUserTickets:', error);
    }
  };

  // Функция для загрузки данных пользователя
  const loadUserData = async (address: string) => {
    try {
      console.log('loadUserData: Starting for address:', address);
      const user = await getOrCreateUser(address);
      if (user) {
        console.log('loadUserData: User data loaded, balance:', user.balance);
        setCltBalance(Number(user.balance));
      } else {
        console.warn('loadUserData: User not found or created');
      }

      await loadUserTickets(address);
      console.log('loadUserData: Completed successfully');
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Получаем данные пользователя Telegram при загрузке и подключаем по Telegram ID
  useEffect(() => {
    if (USE_TELEGRAM_WALLET && typeof window !== 'undefined' && window.telegram?.WebApp) {
      const tg = window.telegram.WebApp;
      tg.ready();
      tg.expand();
      
      // Настраиваем внешний вид для Telegram WebApp
      tg.setHeaderColor('#0a0a0a'); // Темный фон для шапки
      tg.setBackgroundColor('#0a0a0a'); // Темный фон для приложения
      tg.enableClosingConfirmation(); // Подтверждение закрытия
      
      // Скрываем стандартную кнопку "Back" если нужно, или настраиваем её
      // tg.BackButton.hide(); // Раскомментируйте, если хотите скрыть кнопку "Back"
      
      // Получаем данные пользователя Telegram
      const user = tg.initDataUnsafe?.user;
      if (user && user.id) {
        console.log('Telegram user data:', user);
        console.log('Telegram user ID:', user.id);
        console.log('User photo_url:', user.photo_url);
        setTelegramUser(user);
        setTelegramId(user.id);
        
        // Если пользователь не был явно отключен, автоматически подключаем по Telegram ID
        if (!wasDisconnected()) {
          console.log('Auto-connecting user by Telegram ID:', user.id);
          setIsConnected(true);
          loadUserData(user.id, true); // Загружаем данные по Telegram ID
        }
      } else {
        console.log('Telegram user data not available in initDataUnsafe');
      }
    } else {
      console.log('Telegram WebApp not available - user is on regular website');
    }
  }, []);

  // Проверка подключения при загрузке (новая архитектура через Telegram ID)
  // Подключение теперь происходит автоматически при загрузке, если пользователь в Telegram WebApp
  // Старая логика TON Connect оставлена для обратной совместимости, но не используется

    // MetaMask connection check (только если не используется Telegram Wallet)
    if (!USE_TELEGRAM_WALLET) {
      const checkConnection = async () => {
        // Если пользователь явно отключился, не подключаем автоматически
        if (wasDisconnected()) {
          return;
        }

        const ethereum = getEthereumProvider();
        if (ethereum) {
          try {
            const accounts = await ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
              const address = accounts[0];
              setWalletAddress(address);
              setIsConnected(true);
              await loadUserData(address);
            }
          } catch (error) {
            console.error('Error checking connection:', error);
          }
        }
      };

      checkConnection();

      // Слушаем изменения аккаунтов
      const ethereum = getEthereumProvider();
      if (ethereum) {
        const handleAccountsChanged = async (accounts: string[]) => {
          if (accounts.length === 0) {
            setIsConnected(false);
            setWalletAddress('');
            setTickets([]);
            setCltBalance(0);
            setDisconnected(true);
          } else {
            // Если пользователь был отключен, но изменил аккаунт в MetaMask, не подключаем автоматически
            if (wasDisconnected()) {
              return;
            }
            const address = accounts[0];
            setWalletAddress(address);
            setIsConnected(true);
            await loadUserData(address);
          }
        };

        ethereum.on('accountsChanged', handleAccountsChanged);

        return () => {
          if (ethereum) {
            ethereum.removeListener('accountsChanged', handleAccountsChanged);
          }
        };
      }
    }
  }, [tonConnect]);

  // Проверка, открыт ли сайт в Telegram WebApp
  const isInTelegramWebApp = () => {
    if (typeof window === 'undefined') return false;
    return !!(window.telegram?.WebApp);
  };

  // ========== TELEGRAM WALLET CONNECTION (TON Connect) ==========
  // Работает как в Telegram мини-приложении, так и в обычном браузере
  const handleConnectTelegramWallet = async () => {
    console.log('handleConnectTelegramWallet called');
    try {
      setLoading(true);
      console.log('Loading set to true');
      
      // Проверяем, доступен ли TON Connect
      if (!tonConnect) {
        console.error('TON Connect is null');
        alert('TON Connect is not available. Please make sure you are using a compatible browser.');
        setLoading(false);
        return;
      }

      console.log('TON Connect instance found');

      // Если кошелек уже подключен, просто обновляем данные
      try {
        const walletInfo = await tonConnect.getWallet();
        console.log('Current wallet info:', walletInfo);
        if (walletInfo) {
          const address = walletInfo.account.address;
          console.log('Wallet already connected:', address);
          setTonWallet(walletInfo);
          setDisconnected(false);
          setWalletAddress(address);
          setIsConnected(true);
          await loadUserData(address);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.log('No wallet connected yet:', e);
        // Кошелек не подключен, продолжаем подключение
      }

      // Получаем список доступных кошельков и фильтруем только Telegram Wallet
      console.log('Fetching wallets list...');
      const allWallets = await tonConnect.getWallets();
      console.log('All available wallets:', allWallets);
      
      // Фильтруем только Telegram Wallet
      // Telegram Wallet обычно имеет название "Wallet in Telegram" или "Wallet" с appName содержащим "telegram"
      const telegramWallet = allWallets.find(wallet => {
        const name = wallet.name.toLowerCase();
        const appName = wallet.appName?.toLowerCase() || '';
        // Проверяем различные варианты названия Telegram Wallet
        return (
          (name.includes('wallet') && (name.includes('telegram') || appName.includes('telegram'))) ||
          name === 'wallet in telegram' ||
          name === 'wallet' ||
          appName === 'wallet' ||
          wallet.bridgeUrl?.includes('telegram')
        );
      });
      
      console.log('All wallets for debugging:', allWallets.map(w => ({
        name: w.name,
        appName: w.appName,
        bridgeUrl: w.bridgeUrl
      })));
      
      if (!telegramWallet) {
        console.error('Telegram Wallet not found');
        alert('Telegram Wallet not found. Please make sure you are using Telegram and have Wallet enabled.');
        setLoading(false);
        return;
      }
      
      console.log('Found Telegram Wallet:', telegramWallet);
      const walletsList = [telegramWallet];

      // Используем TON Connect UI для показа модального окна с выбором кошелька
      // UI автоматически определит окружение и покажет соответствующий интерфейс
      console.log('Opening TON Connect UI...');
      
      // Используем прямое подключение к Telegram Wallet через SDK
      // Это позволит подключиться напрямую без показа модального окна с другими кошельками
      console.log('Attempting direct connection to Telegram Wallet:', telegramWallet);
      try {
        const connectionString = tonConnect.connect([telegramWallet]);
        console.log('Direct connection initiated, connection string:', connectionString);
        // Подключение обработается через onStatusChange в useEffect
        // Не сбрасываем loading сразу - пусть onStatusChange это сделает
      } catch (connectError: any) {
        console.error('Error connecting directly to Telegram Wallet:', connectError);
        // Если прямое подключение не сработало, пробуем через UI
        if (tonConnectUI) {
          console.log('Falling back to UI modal');
          try {
            await tonConnectUI.openModal();
            console.log('Modal opened as fallback');
          } catch (modalError: any) {
            console.error('Error opening modal:', modalError);
            setLoading(false);
            if (modalError.code !== 300) {
              throw modalError;
            }
          }
        } else {
          setLoading(false);
          throw connectError;
        }
      }
      
      // Если используем fallback через UI, не делаем ничего здесь
      if (!tonConnectUI) {
        // Fallback: используем прямой метод connect
        console.log('TON Connect UI not available, using direct connect method');
        console.log('Wallets list:', walletsList.map(w => ({ name: w.name, appName: w.appName, bridgeUrl: w.bridgeUrl })));
        
        try {
          const connectionString = tonConnect.connect(walletsList);
          console.log('Connection string generated:', connectionString);
          
          // Подключение обработается через событие onStatusChange в useEffect
          setLoading(false);
        } catch (connectError: any) {
          console.error('Error creating connection string:', connectError);
          throw connectError;
        }
      }
      
    } catch (error: any) {
      console.error('Error connecting Telegram wallet:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      if (error.code !== 300) { // 300 = пользователь отменил подключение
        const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const isInTelegram = isInTelegramWebApp();
        
        console.log('Error context:', { isMobile, isInTelegram, errorCode: error.code });
        
        if (!isInTelegram && !isMobile) {
          alert('Failed to connect. Please scan the QR code with your TON wallet app (Tonkeeper, TON Wallet, etc.)');
        } else if (!isInTelegram && isMobile) {
          alert('Failed to connect. Please make sure you have a TON wallet app installed (Tonkeeper, TON Wallet, etc.)');
        } else {
          alert(`Failed to connect Telegram wallet: ${error.message || 'Unknown error'}. Please try again.`);
        }
      } else {
        console.log('User cancelled connection');
      }
    } finally {
      setLoading(false);
      console.log('Loading set to false');
    }
  };

  // ========== METAMASK WALLET CONNECTION (скрыто) ==========
  const handleConnectMetaMaskWallet = async () => {
    // Определение мобильного устройства
    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
    
    // Пытаемся получить провайдер
    let ethereum = getEthereumProvider();
    
    // На мобильных устройствах провайдер может появиться с задержкой
    if (!ethereum && isMobile) {
      setLoading(true);
      // Ждем немного и проверяем снова (только на мобильных)
      // Пробуем несколько раз с увеличивающейся задержкой
      for (let i = 0; i < 3 && !ethereum; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        ethereum = getEthereumProvider();
      }
      setLoading(false);
    }
    
    if (!ethereum) {
      if (isMobile) {
        const siteUrl = window.location.href;
        const isInMetaMask = isInMetaMaskBrowser();
        
        let message = '';
        if (isIOS) {
          if (isInMetaMask) {
            message = 
              'MetaMask not detected in browser.\n\n' +
              'Try:\n' +
              '1. Refresh the page (pull down)\n' +
              '2. Make sure MetaMask is open and active\n' +
              '3. Restart the MetaMask app\n\n' +
              'If the problem persists, copy the site address and open it again in MetaMask browser.';
          } else {
            message = 
              '⚠️ On iOS, connection only works in MetaMask browser!\n\n' +
              'I will copy the site address so you can open it in MetaMask browser.\n\n' +
              'Continue?';
          }
        } else if (isAndroid) {
          if (isInMetaMask) {
            message = 
              'MetaMask not detected.\n\n' +
              'Try:\n' +
              '1. Refresh the page\n' +
              '2. Make sure MetaMask is open and active\n' +
              '3. Restart the MetaMask app';
          } else {
            message = 
              'MetaMask not detected in this browser.\n\n' +
              'I will copy the site address so you can open it in MetaMask browser.\n\n' +
              'Continue?';
          }
        } else {
          message = 
            'MetaMask not detected.\n\n' +
            'To connect:\n' +
            '1. Make sure MetaMask Mobile is installed\n' +
            '2. Open the site in MetaMask app browser\n' +
            '3. Or refresh the page';
        }
        
        const shouldOpen = window.confirm(message);
        
        if (shouldOpen && (isIOS || (isAndroid && !isInMetaMask))) {
          // Проверяем наличие приложения MetaMask
          setLoading(true);
          const isInstalled = await checkMetaMaskInstalled();
          setLoading(false);
          
          if (!isInstalled) {
            // Если приложение не установлено, предлагаем установку
            const installMessage = isIOS
              ? 'MetaMask app is not installed.\n\nWould you like to open the App Store to install it?'
              : 'MetaMask app is not installed.\n\nWould you like to open Google Play to install it?';
            
            if (window.confirm(installMessage)) {
              if (isIOS) {
                window.open('https://apps.apple.com/app/metamask/id1438144202', '_blank');
              } else {
                window.open('https://play.google.com/store/apps/details?id=io.metamask', '_blank');
              }
            }
            return;
          }
          
          // Копируем адрес в буфер обмена (с fallback для iOS)
          const siteDomain = window.location.hostname;
          const fullUrl = `https://${siteDomain}`;
          const copySuccess = await copyToClipboard(fullUrl);
          
          // Открываем приложение MetaMask
          openMetaMaskApp();
          
          // Показываем инструкции с небольшой задержкой
          setTimeout(() => {
            if (copySuccess) {
              alert('✅ Address copied!\n\nOpening MetaMask...\n\nIf MetaMask opened:\n1. Tap the "Browser" tab at the bottom\n2. Paste the address in the address bar (it\'s already in clipboard)\n3. Tap "Connect Wallet" on the site');
            } else {
              // Если не удалось скопировать, показываем адрес
              alert(`Opening MetaMask...\n\nSite address (copy manually):\n${fullUrl}\n\nAfter opening MetaMask:\n1. Tap the "Browser" tab\n2. Paste the address\n3. Tap "Connect Wallet"`);
            }
          }, 500);
        } else if (shouldOpen && !isInMetaMask) {
          // Если пользователь нажал OK, но не в MetaMask браузере, проверяем наличие приложения
          setLoading(true);
          const isInstalled = await checkMetaMaskInstalled();
          setLoading(false);
          
          if (!isInstalled) {
            const installMessage = isIOS
              ? 'MetaMask app is not installed.\n\nWould you like to open the App Store to install it?'
              : 'MetaMask app is not installed.\n\nWould you like to open Google Play to install it?';
            
            if (window.confirm(installMessage)) {
              if (isIOS) {
                window.open('https://apps.apple.com/app/metamask/id1438144202', '_blank');
              } else {
                window.open('https://play.google.com/store/apps/details?id=io.metamask', '_blank');
              }
            }
          }
        }
      } else {
        alert('MetaMask is not installed. Please install MetaMask to connect your wallet.');
      }
      return;
    }

    try {
      setLoading(true);
      
      // Всегда используем wallet_requestPermissions для явного запроса разрешений
      // Это гарантирует показ диалога выбора аккаунта
      let accounts: string[] = [];
      
      try {
        // Сначала пытаемся запросить разрешения явно
        const permissions = await ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
        
        if (permissions && permissions.length > 0) {
          accounts = await ethereum.request({
            method: 'eth_requestAccounts',
          });
        }
      } catch (permError: any) {
        // Если wallet_requestPermissions не поддерживается или отклонен, используем eth_requestAccounts
        if (permError.code === 4001) {
          setDisconnected(true);
          setLoading(false);
          alert('Please connect to MetaMask.');
          return;
        }
        
        accounts = await ethereum.request({
          method: 'eth_requestAccounts',
        });
      }
      
      if (accounts.length > 0) {
        const address = accounts[0];
        console.log('Connected wallet address:', address);
        
        // Подключаем кошелек (пользователь явно нажал Connect Wallet)
        setDisconnected(false);
        setWalletAddress(address);
        setIsConnected(true);
        
        // Загружаем данные пользователя из Supabase
        console.log('Loading user data for address:', address);
        await loadUserData(address);
        console.log('User data loaded successfully');
      } else {
        // Если аккаунты не получены
        setDisconnected(true);
        alert('No accounts found. Please connect your wallet in MetaMask.');
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        // Пользователь отклонил запрос, помечаем как отключенного
        setDisconnected(true);
        alert('Please connect to MetaMask.');
      } else {
        alert('Failed to connect wallet. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Общая функция подключения кошелька (выбирает между Telegram и MetaMask)
  const handleConnectWallet = async () => {
    console.log('handleConnectWallet called, USE_TELEGRAM_WALLET:', USE_TELEGRAM_WALLET);
    if (USE_TELEGRAM_WALLET) {
      await handleConnectTelegramWallet();
    } else {
      await handleConnectMetaMaskWallet();
    }
  };

  const handleDisconnect = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('Disconnecting wallet...');
    
    if (USE_TELEGRAM_WALLET) {
      // В новой архитектуре просто очищаем состояние
      // Telegram ID остается, но помечаем как отключенного
      const idToSave = telegramId;
      if (idToSave) {
        setDisconnected(true, `telegram_${idToSave}`);
      }
    } else {
      // Старая логика для MetaMask
      if (tonConnectUI) {
        try {
          await tonConnectUI.disconnect();
        } catch (error) {
          console.error('Error disconnecting via UI:', error);
        }
      }
      if (tonConnect) {
        try {
          await tonConnect.disconnect();
        } catch (error) {
          console.error('Error disconnecting via SDK:', error);
        }
      }
    }
    
    // Очищаем состояние
    setIsConnected(false);
    setWalletAddress('');
    setTelegramId(null);
    setTickets([]);
    setCltBalance(0);
    setTonWallet(null);
    
    console.log('Wallet disconnected, state cleared');
  };

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      // Можно добавить toast уведомление
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleEnterDraw = () => {
    alert('Ticket selection modal will open here');
  };

  // Функция для покупки билетов через Telegram Wallet
  const handleBuyTicket = async () => {
    if (!isConnected || !telegramId) {
      alert('Please connect your wallet first.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Проверяем, что мы в Telegram WebApp
      const tg = window.telegram?.WebApp;
      if (!tg) {
        alert('Please open this site in Telegram to buy tickets.');
        setLoading(false);
        return;
      }
      
      // Количество билетов и цена (можно сделать выбор количества)
      const ticketCount = 1; // TODO: Добавить выбор количества билетов
      const pricePerTicket = 1; // USDT за билет
      const totalPrice = ticketCount * pricePerTicket;
      
      // Адрес кошелька лотереи (замените на ваш)
      const lotteryWalletAddress = 'YOUR_LOTTERY_WALLET_ADDRESS'; // TODO: Замените на реальный адрес
      
      // Используем Telegram Wallet API для отправки инвойса
      // Telegram Wallet поддерживает sendInvoice для платежей
      if (tg.platform === 'web' || tg.platform === 'ios' || tg.platform === 'android') {
        // Открываем Telegram Wallet для оплаты
        tg.openInvoice({
          url: `https://t.me/wallet?startattach=invoice&invoice=${encodeURIComponent(JSON.stringify({
            currency: 'USD',
            prices: [{
              label: `${ticketCount} Ticket(s)`,
              amount: (totalPrice * 100).toString() // В центах
            }],
            provider_token: '', // Для TON/USDT не нужен
            payload: JSON.stringify({
              telegram_id: telegramId,
              ticket_count: ticketCount,
              lottery_address: lotteryWalletAddress
            })
          }))}`
        }, (status: string) => {
          if (status === 'paid') {
            // Платеж успешен - создаем билеты в Supabase
            createTicketsAfterPayment(ticketCount, telegramId);
          } else {
            console.log('Payment cancelled or failed:', status);
            setLoading(false);
          }
        });
      } else {
        // Fallback: используем TON Connect для отправки транзакции
        if (tonConnect && tonWallet) {
          // TODO: Реализовать отправку транзакции через TON Connect
          alert('Payment integration via TON Connect will be implemented here');
          setLoading(false);
        } else {
          alert('Telegram Wallet is not available. Please use Telegram app.');
          setLoading(false);
        }
      }
    } catch (error: any) {
      console.error('Error buying ticket:', error);
      alert('Failed to process payment. Please try again.');
      setLoading(false);
    }
  };
  
  // Функция для создания билетов после успешной оплаты
  const createTicketsAfterPayment = async (count: number, tgId: number) => {
    if (!supabase) {
      console.error('Supabase is not configured');
      setLoading(false);
      return;
    }
    
    try {
      const ownerId = `telegram_${tgId}`;
      const ticketType = 'bronze'; // TODO: Можно сделать выбор типа билета
      
      // Создаем билеты
      const ticketsToCreate = Array.from({ length: count }, () => ({
        owner: ownerId,
        type: ticketType,
        status: 'available' as const
      }));
      
      const { data: newTickets, error } = await supabase
        .from('tickets')
        .insert(ticketsToCreate)
        .select();
      
      if (error) {
        console.error('Error creating tickets:', error);
        alert('Payment successful, but failed to create tickets. Please contact support.');
        setLoading(false);
        return;
      }
      
      // Обновляем список билетов
      await loadUserTickets(tgId);
      
      alert(`✅ Successfully purchased ${count} ticket(s)!`);
      setLoading(false);
    } catch (error) {
      console.error('Error in createTicketsAfterPayment:', error);
      alert('Payment successful, but failed to create tickets. Please contact support.');
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'available') return 'Available';
    if (status === 'in_draw') return 'In Draw';
    if (status === 'used') return 'Used';
    return status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'in_draw') return 'bg-neon-green/20 text-neon-green border-neon-green/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getTicketTypeColor = (type: string) => {
    switch (type) {
      case 'gold': return 'text-neon-gold';
      case 'silver': return 'text-foreground/80';
      case 'bronze': return 'text-orange-400';
      default: return 'text-foreground';
    }
  };

  const formatTimeRemaining = (endAt: string) => {
    const end = new Date(endAt).getTime();
    const now = Date.now();
    const diff = end - now;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className={`border-b border-border/50 backdrop-blur-xl bg-background/50 sticky top-0 z-50 ${isInTelegramWebApp() ? 'pt-safe' : ''}`}>
          <div className="container mx-auto px-4">
            <div className={`max-w-4xl mx-auto ${isInTelegramWebApp() ? 'py-3' : 'py-2 sm:py-4'} flex justify-between items-center gap-2`}>
            <div className="flex items-center gap-2 sm:gap-2 md:gap-3 min-w-0 flex-shrink">
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center animate-spin-slow">
                  <Sparkles className="w-5 h-5 sm:w-5 sm:h-5 md:w-5 md:h-5 text-background" />
                </div>
              </div>
              <h1 className={`${isInTelegramWebApp() ? 'text-sm' : 'text-base sm:text-base md:text-lg lg:text-xl'} font-display font-bold gradient-text leading-tight truncate`}>
                <span>CryptoLottery.today</span>
              </h1>
            </div>
            
            {isConnected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={`neon-border bg-card/50 hover:bg-card border border-primary/30 font-medium gap-1.5 sm:gap-2 px-2 sm:px-3 ${isInTelegramWebApp() ? 'h-9 text-xs' : 'h-10 sm:h-10'} flex-shrink-0`}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {/* Аватар пользователя Telegram */}
                      {telegramUser?.photo_url && (
                        <Avatar className={`${isInTelegramWebApp() ? 'h-5 w-5' : 'h-6 w-6 sm:h-7 sm:w-7'}`}>
                          <AvatarImage src={telegramUser.photo_url} alt={telegramUser.first_name || 'User'} />
                          <AvatarFallback className="text-xs">
                            {telegramUser.first_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`${isInTelegramWebApp() ? 'text-[10px]' : 'text-xs sm:text-xs'} font-semibold text-neon-gold leading-tight whitespace-nowrap`}>
                        {isBalanceVisible 
                          ? `${cltBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CLT`
                          : '•••••• CLT'}
                      </div>
                      {!isInTelegramWebApp() && (
                        <div className="flex items-center gap-1.5 sm:gap-1.5 pl-1.5 sm:pl-2 border-l border-border/50">
                          <div className="w-2 h-2 sm:w-2 sm:h-2 rounded-full bg-neon-green animate-blink"></div>
                          <span className="text-xs sm:text-xs font-mono hidden sm:inline">{walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : ''}</span>
                        </div>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-card border-border/50">
                  {/* Информация о пользователе */}
                  {telegramUser && (
                    <div className="px-2 py-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        {telegramUser.photo_url && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={telegramUser.photo_url} alt={telegramUser.first_name || 'User'} />
                            <AvatarFallback>
                              {telegramUser.first_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {telegramUser.first_name} {telegramUser.last_name || ''}
                          </div>
                          {telegramUser.username && (
                            <div className="text-xs text-muted-foreground truncate">
                              @{telegramUser.username}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <DropdownMenuLabel className="text-sm text-muted-foreground tracking-wider p-0">Balance</DropdownMenuLabel>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newValue = !isBalanceVisible;
                        setIsBalanceVisible(newValue);
                        localStorage.setItem('balance_visible', String(newValue));
                      }}
                    >
                      {isBalanceVisible ? (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <div className="px-2 py-1.5">
                    <div className="text-lg font-semibold text-neon-gold mb-1">
                      {isBalanceVisible 
                        ? `${cltBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CLT`
                        : '•••••• CLT'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isBalanceVisible ? `≈ $${usdBalance} USDT` : '•••••• USDT'}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleCopyAddress}
                    className="cursor-pointer"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Address
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.preventDefault();
                      handleDisconnect(e);
                    }}
                    onSelect={(e) => {
                      e.preventDefault();
                      handleDisconnect();
                    }}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={handleConnectWallet}
                disabled={loading}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-display font-semibold text-xs sm:text-xs md:text-sm glow-purple px-3 sm:px-3 h-10 sm:h-10 flex-shrink-0"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1.5 sm:mr-1.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span className="hidden sm:inline">Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1.5 sm:mr-1.5" />
                    <span className="whitespace-nowrap">Connect Wallet</span>
                  </>
                )}
              </Button>
            )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Hero Stats */}
            {false && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { 
                    label: 'Already Awarded', 
                    value: '$125K', 
                    icon: Trophy, 
                    color: 'text-neon-gold',
                    borderHover: 'hover:border-neon-gold/40',
                    bgHover: 'group-hover:bg-neon-gold/5'
                  },
                  { 
                    label: 'Players', 
                    value: '847', 
                    icon: Users, 
                    color: 'text-neon-cyan',
                    borderHover: 'hover:border-neon-cyan/40',
                    bgHover: 'group-hover:bg-neon-cyan/5'
                  },
                  { 
                    label: 'Fair & Transparent', 
                    labelTop: 'CHAINLINK VRF',
                    value: '', 
                    icon: Zap, 
                    color: 'text-neon-purple',
                    borderHover: 'hover:border-neon-purple/40',
                    bgHover: 'group-hover:bg-neon-purple/5',
                    isLongText: true 
                  },
                  { 
                    label: 'CLT Price', 
                    value: `$${cltPrice.toFixed(3)}`, 
                    icon: TrendingUp, 
                    color: 'text-neon-green',
                    borderHover: 'hover:border-neon-green/40',
                    bgHover: 'group-hover:bg-neon-green/5'
                  },
                ].map((stat, i) => (
                  <Card 
                    key={i} 
                    className={`glass-card p-5 text-center group relative overflow-hidden transition-all duration-300 hover:scale-[1.02] border border-border/50 ${stat.borderHover} ${stat.bgHover} hover:shadow-xl hover:shadow-primary/10`}
                  >
                    {/* Content */}
                    <div className="relative z-10">
                      <div className="mb-3">
                        <stat.icon className={`w-7 h-7 mx-auto ${stat.color} group-hover:scale-110 group-hover:drop-shadow-lg transition-all duration-300`} />
                      </div>
                      {stat.value && (
                        <p className="text-2xl md:text-3xl font-display font-bold mb-2 transition-colors">
                          {stat.value}
                        </p>
                      )}
                      {stat.labelTop && (
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground group-hover:text-foreground/90 transition-colors mb-1">
                          {stat.labelTop}
                        </p>
                      )}
                      <p className={`text-xs font-medium ${stat.isLongText ? 'uppercase tracking-wide leading-tight px-1' : 'uppercase tracking-wider'} text-muted-foreground group-hover:text-foreground/90 transition-colors`}>
                        {stat.label}
                      </p>
                    </div>
                    
                    {/* Subtle shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </Card>
                ))}
              </div>
            )}

            {/* Current Draw Card */}
            {currentDraw && (
              <Card className="glass-card overflow-hidden relative group">
                {/* Animated border glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-20 blur-xl group-hover:opacity-30 transition-opacity" />
                
                <div className="relative p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-neon-green/20 text-neon-green border-neon-green/30 animate-pulse">
                          LIVE
                        </Badge>
                        <span className="text-muted-foreground font-display">Draw #{currentDraw.id}</span>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Jackpot Prize</p>
                        <p className="text-4xl md:text-5xl lg:text-6xl font-display font-black gradient-jackpot animate-pulse-glow">
                          {currentDraw.jackpot.toLocaleString('en-US').replace(/,/g, ' ')} CLT
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-6 text-sm">
                        <div>
                          <p className="text-muted-foreground">Prize Pool</p>
                          <p className="text-xl font-display font-bold text-neon-gold">${currentDraw.prize_pool.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Participants</p>
                          <p className="text-xl font-display font-bold text-neon-cyan">{currentDraw.participants}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Winners (Top 25%)</p>
                          <p className="text-xl font-display font-bold text-neon-purple">{Math.floor(currentDraw.participants * 0.25)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Ends in</p>
                        <p className="text-3xl font-display font-bold text-neon-pink">
                          {formatTimeRemaining(currentDraw.end_at)}
                        </p>
                      </div>
                      
                      <Button 
                        onClick={handleEnterDraw}
                        size="lg"
                        className="w-full md:w-auto bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-display font-bold text-lg px-8 py-6 glow-purple group"
                      >
                        Enter Draw
                        <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>

                  {/* Prize distribution hint */}
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <p className="text-sm text-muted-foreground text-center">
                      <Sparkles className="w-4 h-4 inline-block mr-2 text-neon-gold" />
                      Poker-style payouts: Top 25% share the prize pool. First place takes the biggest share!
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Your Tickets Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Ticket className="w-6 h-6 text-primary" />
                  <h2 className="text-xl md:text-2xl font-display font-bold">Your NFT Tickets</h2>
                  {isConnected && (
                    <Badge variant="secondary" className="font-mono">{tickets.length}</Badge>
                  )}
                </div>
                
                <Button 
                  onClick={handleBuyTicket}
                  disabled={loading || !isConnected}
                  className="bg-gradient-to-r from-neon-gold to-orange-500 hover:opacity-90 text-background font-display font-bold glow-gold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                      Minting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Buy Ticket
                    </span>
                  )}
                </Button>
              </div>

              {!isConnected ? (
                <Card className="glass-card p-12 text-center">
                  <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-base md:text-lg font-display text-muted-foreground/80 mb-4">Connect your wallet to view tickets</p>
                  {USE_TELEGRAM_WALLET ? (
                    (() => {
                      const isInTelegram = isInTelegramWebApp();
                      const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                      
                      return (
                        <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg text-left">
                          <p className="text-sm font-semibold text-primary mb-2">
                            {isInTelegram ? '📱 Telegram Wallet Connection:' : '🔗 TON Wallet Connection:'}
                          </p>
                          {isInTelegram ? (
                            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                              <li>Tap "Connect Wallet" button</li>
                              <li>Select your TON wallet (Tonkeeper, TON Wallet, etc.)</li>
                              <li>Approve the connection in your wallet</li>
                            </ol>
                          ) : isMobile ? (
                            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                              <li>Tap "Connect Wallet" button</li>
                              <li>Select your TON wallet from the list</li>
                              <li>Your wallet app will open automatically</li>
                              <li>Approve the connection in your wallet</li>
                            </ol>
                          ) : (
                            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                              <li>Tap "Connect Wallet" button</li>
                              <li>A QR code will appear</li>
                              <li>Scan the QR code with your TON wallet app (Tonkeeper, TON Wallet, etc.)</li>
                              <li>Approve the connection in your wallet</li>
                            </ol>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && !isInMetaMaskBrowser() && (
                      <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg text-left">
                        <p className="text-sm font-semibold text-primary mb-2">📱 Mobile Connection:</p>
                        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Open MetaMask Mobile app</li>
                          <li>Tap the "Browser" tab at the bottom</li>
                          <li>Enter the site address in the address bar</li>
                          <li>Tap "Connect Wallet"</li>
                        </ol>
                      </div>
                    )
                  )}
                </Card>
              ) : tickets.length === 0 ? (
                <Card className="glass-card p-12 text-center">
                  <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg text-muted-foreground mb-4">No tickets yet</p>
                  <p className="text-sm text-muted-foreground/70">Buy your first NFT ticket and enter the draw for a chance to win!</p>
                </Card>
              ) : (
                <div className="max-h-[600px] overflow-y-auto pr-2 flex flex-col gap-3 custom-scrollbar">
                  {tickets.map((ticket) => (
                      <Card 
                        key={ticket.id} 
                        className="glass-card p-4 group hover:border-primary/50 transition-all duration-300 hover:glow-purple"
                      >
                        <div className="flex items-center gap-4">
                          {/* Ticket Image/Placeholder */}
                          <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20 flex-shrink-0">
                            {ticket.image ? (
                              <img
                                src={ticket.image}
                                alt={`${ticket.type} ticket`}
                                className="w-full h-full object-cover"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Ticket className={`w-8 h-8 ${getTicketTypeColor(ticket.type)}`} />
                              </div>
                            )}
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>

                          {/* Ticket Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-lg font-bold">#{ticket.id}</span>
                              <Badge variant="outline" className={`capitalize ${getTicketTypeColor(ticket.type)} border-current/30`}>
                                {ticket.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">NFT Lottery Ticket</p>
                          </div>

                          {/* Status */}
                          <Badge 
                            variant="outline" 
                            className={`${getStatusColor(ticket.status)} font-medium hidden sm:flex`}
                          >
                            {getStatusLabel(ticket.status)}
                          </Badge>

                          {/* Action */}
                          {ticket.status === 'available' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-primary hover:text-primary hover:bg-primary/10"
                            >
                              Enter
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          )}
                        </div>
                        
                        {/* Mobile status */}
                        <div className="mt-3 sm:hidden">
                          <Badge 
                            variant="outline" 
                            className={`${getStatusColor(ticket.status)} font-medium`}
                          >
                            {getStatusLabel(ticket.status)}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                </div>
              )}
            </div>

            {/* How It Works */}
            <Card className="glass-card p-6 md:p-8">
              <h3 className="text-lg font-display font-bold mb-6 text-center gradient-text">How It Works</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { step: '01', title: 'Buy NFT Ticket', desc: 'Mint unique NFT tickets that give you entry to the lottery draws' },
                  { step: '02', title: 'Enter the Draw', desc: 'Choose which draw to enter with your available tickets' },
                  { step: '03', title: 'Win Prizes', desc: 'Top 25% of participants share the prize pool, poker-style!' },
                ].map((item, i) => (
                  <div key={i} className="text-center group">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-display font-bold text-background group-hover:scale-110 transition-transform">
                      {item.step}
                    </div>
                    <h4 className="font-display font-bold mb-2">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 mt-12">
          <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
            <p>Decentralized • Transparent • Fair</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
