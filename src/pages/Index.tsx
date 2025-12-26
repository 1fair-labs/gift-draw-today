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

// Типы для window.telegram
declare global {
  interface Window {
    telegram?: {
      WebApp?: any;
    };
  }
}

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
    if (typeof window === 'undefined') {
      console.log('TON Connect not initialized: window undefined');
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
    if (typeof window === 'undefined') {
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


  // Функция для получения или создания пользователя по Telegram ID
  // Функция для получения детальной информации об ошибке
  const getDetailedError = async (telegramId: number): Promise<string> => {
    if (!supabase) {
      return 'Supabase not configured';
    }
    
    // Проверяем, может ли быть проблема с RLS
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (testError) {
      if (testError.code === 'PGRST301' || testError.message?.includes('permission denied') || testError.message?.includes('RLS')) {
        return 'RLS policy blocking\nCheck Supabase RLS settings';
      }
      return `Error: ${testError.message || testError.code || 'Unknown'}`;
    }
    
    // Пробуем вставить тестовые данные
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        balance: 0,
      })
      .select()
      .single();
    
    if (insertError) {
      if (insertError.code === 'PGRST301' || insertError.message?.includes('permission denied') || insertError.message?.includes('RLS')) {
        return 'RLS policy blocking insert\nEnable INSERT policy in Supabase';
      }
      if (insertError.code === '42703' || insertError.message?.includes('column') || insertError.message?.includes('telegram_id')) {
        return 'Column telegram_id missing\nRun database migration';
      }
      if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
        return 'User already exists\nTrying to fetch...';
      }
      return `Insert error: ${insertError.message || insertError.code || 'Unknown'}`;
    }
    
    return 'Unknown error';
  };

  const getOrCreateUserByTelegramId = async (telegramId: number): Promise<User | null> => {
    if (!supabase) {
      const errorMsg = 'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel environment variables.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    try {
      console.log('getOrCreateUserByTelegramId: Checking for user with telegram_id:', telegramId);
      
      // Проверяем, существует ли пользователь с таким telegram_id
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user:', fetchError);
        // Если ошибка из-за RLS, возвращаем null с информацией
        if (fetchError.code === 'PGRST301' || fetchError.message?.includes('permission denied') || fetchError.message?.includes('RLS')) {
          throw new Error('RLS policy is blocking SELECT. Please check Supabase RLS policies.');
        }
      }

      if (existingUser) {
        console.log('getOrCreateUserByTelegramId: User found:', existingUser.id);
        return existingUser as User;
      }

      // Пользователь не существует, создаем нового
      console.log('getOrCreateUserByTelegramId: User not found, creating new user with telegram_id:', telegramId);
      console.log('Inserting user data:', { telegram_id: telegramId, balance: 0 });
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId,
          balance: 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating user:', insertError);
        console.error('Error code:', insertError.code);
        console.error('Error message:', insertError.message);
        console.error('Error details:', insertError.details);
        console.error('Error hint:', insertError.hint);
        
        // Если ошибка из-за RLS
        if (insertError.code === 'PGRST301' || insertError.message?.includes('permission denied') || insertError.message?.includes('RLS')) {
          throw new Error('RLS policy is blocking INSERT. Please enable INSERT policy for users table in Supabase.');
        }
        
        // Если ошибка из-за отсутствия колонки
        if (insertError.code === '42703' || insertError.message?.includes('column') || insertError.message?.includes('telegram_id')) {
          throw new Error('Column telegram_id does not exist. Please run database_telegram_migration.sql in Supabase.');
        }
        
        // Если ошибка из-за дубликата, пытаемся найти существующего
        if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
          console.log('getOrCreateUserByTelegramId: Duplicate detected, fetching existing user');
          const { data: foundUser, error: fetchError2 } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .maybeSingle();
          
          if (fetchError2) {
            console.error('Error fetching user after duplicate error:', fetchError2);
            throw new Error(`Duplicate user exists but cannot fetch: ${fetchError2.message}`);
          }
          
          if (foundUser) {
            console.log('✅ getOrCreateUserByTelegramId: Found existing user after duplicate error:', foundUser.id);
            return foundUser as User;
          }
        }
        
        throw new Error(`Failed to create user: ${insertError.message || insertError.code || 'Unknown error'}`);
      }

      if (newUser) {
        console.log('✅ getOrCreateUserByTelegramId: New user created successfully:', newUser.id);
        console.log('Created user data:', JSON.stringify(newUser, null, 2));
      } else {
        console.error('❌ getOrCreateUserByTelegramId: User creation returned null');
        throw new Error('User creation returned null');
      }
      return newUser as User;
    } catch (error: any) {
      console.error('Error in getOrCreateUserByTelegramId:', error);
      throw error; // Пробрасываем ошибку дальше для обработки
    }
  };

  // Функция для получения или создания пользователя по адресу (для обратной совместимости)
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

  // Функция для загрузки данных пользователя (по адресу или telegram_id)
  const loadUserData = async (identifier: string | number, isTelegramId: boolean = false) => {
    try {
      if (isTelegramId && typeof identifier === 'number') {
        // Загрузка по Telegram ID
        console.log('loadUserData: Starting for telegram_id:', identifier);
        const user = await getOrCreateUserByTelegramId(identifier);
        if (user) {
          console.log('loadUserData: User data loaded, balance from DB:', user.balance);
          setCltBalance(Number(user.balance));
        } else {
          console.warn('loadUserData: User not found or created');
        }

        await loadUserTickets(identifier);
      } else if (typeof identifier === 'string') {
        // Загрузка по адресу (для обратной совместимости)
        console.log('loadUserData: Starting for address:', identifier);
        const user = await getOrCreateUser(identifier);
        if (user) {
          console.log('loadUserData: User data loaded, balance:', user.balance);
          setCltBalance(Number(user.balance));
        } else {
          console.warn('loadUserData: User not found or created');
        }

        await loadUserTickets(identifier);
      }
      console.log('loadUserData: Completed successfully');
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Получаем данные пользователя Telegram при загрузке и подключаем по Telegram ID
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Проверяем оба варианта: Telegram и telegram (для совместимости)
    const tg = (window as any).Telegram?.WebApp || window.telegram?.WebApp;
    if (!tg) {
      console.log('Not running in Telegram WebApp');
      return;
    }

    // 🔑 Критически важные вызовы - должны быть вызваны ПЕРВЫМИ
    try {
      tg.ready();
      tg.expand(); // Разворачиваем приложение на весь экран
      tg.disableVerticalSwipes(); // Отключаем свайп вниз для закрытия
      tg.setHeaderColor('transparent'); // Прозрачная шапка, чтобы не перекрывалась вырезом
      tg.setBackgroundColor('#0a0a0a'); // Темный фон для приложения
      tg.enableClosingConfirmation(); // Подтверждение закрытия
      
      console.log('Telegram WebApp initialized with fullscreen mode');
    } catch (error) {
      console.error('Error initializing Telegram WebApp:', error);
    }

    // Асинхронная функция для подключения пользователя
    const connectUser = async () => {
      // Используем showAlert для отладки в Telegram (так как консоль недоступна)
      const debugAlert = (message: string) => {
        if (tg.showAlert) {
          try {
            tg.showAlert(message);
          } catch (e) {
            console.error('Error showing alert:', e);
          }
        }
      };
      
      // Проверяем наличие данных пользователя
      let user = tg.initDataUnsafe?.user;
      
      // Если user не найден, пробуем парсить initData
      if (!user && tg.initData) {
        try {
          const params = new URLSearchParams(tg.initData);
          const userParam = params.get('user');
          if (userParam) {
            try {
              user = JSON.parse(decodeURIComponent(userParam));
            } catch (parseError) {
              try {
                user = JSON.parse(userParam);
              } catch (parseError2) {
                // Игнорируем ошибки парсинга
              }
            }
          }
        } catch (e) {
          // Игнорируем ошибки парсинга
        }
      }
      
      if (user && user.id) {
        // Данные пользователя найдены
        setTelegramUser(user);
        setTelegramId(user.id);
        
        // Сохраняем telegram_id в БД
        try {
          const savedUser = await getOrCreateUserByTelegramId(user.id);
          if (savedUser) {
            debugAlert(`✅ Connected!\nTelegram ID: ${savedUser.telegram_id}`);
            // Автоматически подключаем пользователя
            if (!wasDisconnected()) {
              setIsConnected(true);
              setDisconnected(false);
              await loadUserData(user.id, true);
            }
          } else {
            debugAlert('❌ Failed to save user');
          }
        } catch (err: any) {
          const errorMsg = err.message || err.toString() || 'Unknown error';
          // Показываем детальную ошибку
          debugAlert(`❌ Error: ${errorMsg}`);
          
          // Если это ошибка RLS или миграции, показываем инструкции
          if (errorMsg.includes('RLS') || errorMsg.includes('policy')) {
            setTimeout(() => {
              if (tg.showAlert) {
                tg.showAlert('Fix: Enable INSERT policy\nin Supabase RLS settings');
              }
            }, 2000);
          } else if (errorMsg.includes('column') || errorMsg.includes('telegram_id')) {
            setTimeout(() => {
              if (tg.showAlert) {
                tg.showAlert('Fix: Run migration\ndatabase_telegram_migration.sql');
              }
            }, 2000);
          }
        }
      } else {
        // Данные пользователя недоступны
        const debugInfo = `User data not available\nPlatform: ${tg.platform || 'unknown'}\nVersion: ${tg.version || 'unknown'}\nHas initData: ${!!tg.initData}\nHas initDataUnsafe: ${!!tg.initDataUnsafe}`;
        debugAlert(debugInfo);
        
        // Показываем инструкции
        if (tg.showAlert) {
          setTimeout(() => {
            tg.showAlert('⚠️ Bot needs to be configured in BotFather to request user data.\n\nPlease check bot settings.');
          }, 2000);
        }
      }
    };

    // Вызываем асинхронную функцию
    connectUser();
  }, []);

  // Обработчик изменения статуса подключения кошелька TON Connect
  useEffect(() => {
    if (!tonConnect) return;

    // Восстанавливаем подключение при загрузке, если кошелек уже был подключен
    const restoreConnection = async () => {
      try {
        const wallet = tonConnect.wallet;
        if (wallet) {
          console.log('Restoring wallet connection:', wallet);
          const address = wallet.account.address;
          setTonWallet(wallet);
          setDisconnected(false);
          setWalletAddress(address);
          setIsConnected(true);
          
          // Сохраняем telegram_id в БД если есть
          if (telegramId && supabase) {
            getOrCreateUserByTelegramId(telegramId).then((user) => {
              if (user && supabase) {
                supabase
                  .from('users')
                  .update({ wallet_address: address.toLowerCase() })
                  .eq('telegram_id', telegramId);
              }
            });
          }
          
          // Загружаем данные
          if (telegramId) {
            loadUserData(telegramId, true);
          } else {
            loadUserData(address);
          }
        }
      } catch (error) {
        console.error('Error restoring connection:', error);
      }
    };

    restoreConnection();

    const unsubscribe = tonConnect.onStatusChange((walletInfo) => {
      console.log('Wallet status changed:', walletInfo);
      
      if (walletInfo) {
        // Кошелек подключен
        const address = walletInfo.account.address;
        console.log('Wallet connected:', address);
        
        setTonWallet(walletInfo);
        setDisconnected(false);
        setWalletAddress(address);
        setIsConnected(true);
        setLoading(false);
        
        // Сохраняем telegram_id в БД при подключении кошелька
        if (telegramId && supabase) {
          console.log('Saving telegram_id to user record:', telegramId);
          // Обновляем или создаем пользователя с telegram_id и адресом кошелька
          getOrCreateUserByTelegramId(telegramId).then((user) => {
            if (user && supabase) {
              // Обновляем адрес кошелька для пользователя
              supabase
                .from('users')
                .update({ wallet_address: address.toLowerCase() })
                .eq('telegram_id', telegramId)
                .then(({ error }) => {
                  if (error) {
                    console.error('Error updating wallet address:', error);
                  } else {
                    console.log('Wallet address updated for telegram_id:', telegramId);
                  }
                });
            }
          });
        }
        
        // Загружаем данные пользователя (билеты и баланс)
        if (telegramId) {
          loadUserData(telegramId, true);
        } else {
          loadUserData(address);
        }
      } else {
        // Кошелек отключен
        console.log('Wallet disconnected');
        setTonWallet(null);
        setWalletAddress('');
        setIsConnected(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnect, telegramId]);

  // Проверка, открыт ли сайт в Telegram WebApp
  const isInTelegramWebApp = () => {
    if (typeof window === 'undefined') return false;
    // Проверяем оба варианта: Telegram и telegram (для совместимости)
    return !!((window as any).Telegram?.WebApp || window.telegram?.WebApp);
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

      // Проверяем, подключен ли кошелек через свойство wallet
      const currentWallet = tonConnect.wallet;
      if (currentWallet) {
        console.log('Wallet already connected:', currentWallet);
        const address = currentWallet.account.address;
        console.log('Wallet address:', address);
        setTonWallet(currentWallet);
        setDisconnected(false);
        setWalletAddress(address);
        setIsConnected(true);
        setLoading(false);
        
        // Сохраняем telegram_id в БД если есть
        if (telegramId && supabase) {
          getOrCreateUserByTelegramId(telegramId).then((user) => {
            if (user && supabase) {
              supabase
                .from('users')
                .update({ wallet_address: address.toLowerCase() })
                .eq('telegram_id', telegramId);
            }
          });
        }
        
        // Загружаем данные по telegram_id если есть, иначе по адресу
        if (telegramId) {
          loadUserData(telegramId, true);
        } else {
          loadUserData(address);
        }
        return;
      }
      
      console.log('No wallet connected yet, initiating connection...');

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

  // Функция подключения через Telegram
  const handleConnectWallet = async () => {
    console.log('handleConnectWallet called');
    
    // Строгая проверка: находимся ли мы в Telegram WebApp
    const tg = (window as any).Telegram?.WebApp || window.telegram?.WebApp;
    
    // Проверяем несколько признаков того, что мы в Telegram WebApp:
    // 1. Объект tg должен существовать
    // 2. Должен быть initDataUnsafe
    // 3. Должен быть user внутри initDataUnsafe (или platform не должен быть 'unknown')
    const hasTgObject = !!tg;
    const hasInitData = !!tg?.initDataUnsafe;
    const hasUser = !!tg?.initDataUnsafe?.user;
    const platform = tg?.platform;
    const isInTelegram = hasTgObject && hasInitData && (hasUser || (platform && platform !== 'unknown'));
    
    console.log('Telegram WebApp check:', { hasTgObject, hasInitData, hasUser, platform, isInTelegram });
    
    // Если НЕ в Telegram WebApp, редиректим в мини-приложение
    if (!isInTelegram) {
      const miniAppUrl = 'https://t.me/cryptolotterytoday_bot/enjoy';
      console.log('Not in Telegram WebApp, redirecting to:', miniAppUrl);
      
      // Пробуем несколько способов редиректа
      try {
        // Способ 1: прямой редирект (самый надежный)
        window.location.href = miniAppUrl;
        // Если редирект не сработал сразу, пробуем другие способы
        setTimeout(() => {
          try {
            window.location.assign(miniAppUrl);
          } catch (e) {
            window.open(miniAppUrl, '_blank');
          }
        }, 100);
      } catch (error) {
        console.error('Error with redirect:', error);
        // Fallback: открываем в новой вкладке
        window.open(miniAppUrl, '_blank');
      }
      return; // ВАЖНО: сразу выходим, не продолжаем выполнение
    }
    
    // В Telegram WebApp - если уже подключен, ничего не делаем
    if (isConnected) {
      console.log('Already connected');
      return;
    }
    
    // В Telegram WebApp подключаем по telegram_id (если автоматическое подключение не сработало)
    console.log('In Telegram WebApp, connecting via Telegram ID...');
    setLoading(true);
    
    try {
      if (!tg) {
        console.error('Telegram WebApp object not found');
        alert('Telegram WebApp is not available');
        setLoading(false);
        return;
      }

      // Используем showAlert для отладки в Telegram
      const debugAlert = (message: string) => {
        if (tg.showAlert) {
          try {
            tg.showAlert(message);
          } catch (e) {
            // Игнорируем ошибки
          }
        }
      };
      
      // Проверяем наличие данных пользователя
      let user = tg.initDataUnsafe?.user;
      
      // Если user не найден, пробуем парсить initData
      if (!user && tg.initData) {
        try {
          const params = new URLSearchParams(tg.initData);
          const userParam = params.get('user');
          if (userParam) {
            try {
              user = JSON.parse(decodeURIComponent(userParam));
            } catch (parseError) {
              try {
                user = JSON.parse(userParam);
              } catch (parseError2) {
                // Игнорируем ошибки парсинга
              }
            }
          }
        } catch (e) {
          // Игнорируем ошибки парсинга
        }
      }
      
      if (user && user.id) {
        // Данные пользователя найдены
        setTelegramUser(user);
        setTelegramId(user.id);
        
        // Сохраняем telegram_id в БД
        try {
          const savedUser = await getOrCreateUserByTelegramId(user.id);
          if (savedUser) {
            debugAlert(`✅ Connected!\nTelegram ID: ${savedUser.telegram_id}`);
            // Подключаем пользователя
            setIsConnected(true);
            setDisconnected(false);
            // Загружаем данные пользователя
            await loadUserData(user.id, true);
          } else {
            debugAlert('❌ Failed to save user');
          }
        } catch (err: any) {
          const errorMsg = err.message || err.toString() || 'Unknown error';
          // Показываем детальную ошибку
          debugAlert(`❌ Error: ${errorMsg}`);
          
          // Если это ошибка RLS или миграции, показываем инструкции
          if (errorMsg.includes('RLS') || errorMsg.includes('policy')) {
            setTimeout(() => {
              if (tg.showAlert) {
                tg.showAlert('Fix: Enable INSERT policy\nin Supabase RLS settings');
              }
            }, 2000);
          } else if (errorMsg.includes('column') || errorMsg.includes('telegram_id')) {
            setTimeout(() => {
              if (tg.showAlert) {
                tg.showAlert('Fix: Run migration\ndatabase_telegram_migration.sql');
              }
            }, 2000);
          }
        }
      } else {
        // Данные пользователя недоступны, но мы в Telegram WebApp
        // Это может быть проблема с настройками бота
        const debugInfo = `User data not available\nPlatform: ${tg.platform || 'unknown'}\nVersion: ${tg.version || 'unknown'}`;
        debugAlert(debugInfo);
        
        // Показываем инструкции
        setTimeout(() => {
          if (tg.showAlert) {
            tg.showAlert('⚠️ Bot needs to be configured in BotFather.\n\nCheck bot settings to enable user data.');
          }
        }, 2000);
        
        // Показываем alert только если мы действительно в Telegram WebApp
        if (tg.showAlert) {
          // В Telegram WebApp используем showAlert
          tg.showAlert('Telegram user data is not available. Please check bot settings in BotFather.');
        } else {
          // Если showAlert недоступен, значит мы не в Telegram WebApp - редиректим
          const miniAppUrl = 'https://t.me/cryptolotterytoday_bot/enjoy';
          window.location.href = miniAppUrl;
        }
      }
    } catch (error: any) {
      console.error('Error connecting via Telegram:', error);
      alert('Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('Disconnecting wallet...');
    
    // Очищаем состояние
    // Telegram ID остается, но помечаем как отключенного
    const idToSave = telegramId;
    if (idToSave) {
      setDisconnected(true, `telegram_${idToSave}`);
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
        <header className={`border-b border-border/50 backdrop-blur-xl bg-background/50 z-50 ${
          isInTelegramWebApp() && typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
            ? 'fixed top-0 left-0 right-0' // Фиксированная шапка на мобильных Telegram WebApp
            : 'sticky top-0' // Обычная sticky шапка на десктопе
        }`}>
          <div className="container mx-auto px-4">
            <div className={`max-w-4xl mx-auto ${isInTelegramWebApp() ? 'py-4 min-h-[60px]' : 'py-2 sm:py-4'} flex justify-between items-center gap-2`}>
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
                    {/* Telegram Icon SVG */}
                    <svg 
                      className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1.5 sm:mr-1.5" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.193l-1.87 8.81c-.14.625-.5.78-1.016.485l-2.8-2.06-1.35 1.29c-.15.15-.276.276-.566.276l.2-2.84 5.183-4.68c.226-.2-.05-.312-.35-.11l-6.4 4.03-2.76-.86c-.6-.19-.614-.6.12-.9l10.75-4.15c.5-.18.94.13.78.68z"/>
                    </svg>
                    <span className="whitespace-nowrap">Connect via Telegram</span>
                  </>
                )}
              </Button>
            )}
            </div>
          </div>
        </header>

        {/* Отступ для контента, чтобы не перекрывался фиксированным header на мобильных */}
        {isInTelegramWebApp() && typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && (
          <div className="h-[60px]" /> // Высота header для мобильных
        )}

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
                  <p className="text-base md:text-lg font-display text-muted-foreground/80 mb-4">Connect via Telegram to view tickets</p>
                  {(() => {
                    const isInTelegram = isInTelegramWebApp();
                    
                    return (
                      <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg text-left">
                        <p className="text-sm font-semibold text-primary mb-2">
                          {isInTelegram ? '📱 Telegram Connection:' : '🔗 Connect via Telegram:'}
                        </p>
                        {isInTelegram ? (
                          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Tap "Connect via Telegram" button</li>
                            <li>Your Telegram account will be connected automatically</li>
                            <li>View your tickets and balance</li>
                          </ol>
                        ) : (
                          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Tap "Connect via Telegram" button</li>
                            <li>You will be redirected to Telegram mini app</li>
                            <li>Your account will be connected automatically</li>
                            <li>View your tickets and balance</li>
                          </ol>
                        )}
                      </div>
                    );
                  })()}
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
