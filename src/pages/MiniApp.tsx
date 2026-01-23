// src/pages/MiniApp.tsx - New Mini App architecture
import { useState, useEffect, useCallback, useRef } from 'react';
import { Info, Sparkles, Ticket, X, Wand2, LogOut } from 'lucide-react';

// Telegram icon component (airplane only, no circle)
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"
      fill="currentColor"
    />
  </svg>
);
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { supabase, type User, type Ticket as TicketType, type Draw } from '@/lib/supabase';
import { isInTelegramWebApp } from '@/lib/telegram';
import { getAllBalances } from '@/lib/solana-config';
import { SolanaWalletModal } from '@/components/SolanaWalletModal';
import HomeScreen from './miniapp/HomeScreen';
import TicketsScreen from './miniapp/TicketsScreen';
import ProfileScreen from './miniapp/ProfileScreen';
import AboutScreen from './miniapp/AboutScreen';

type Screen = 'home' | 'tickets' | 'profile' | 'about';

export default function MiniApp() {
  const { publicKey, connect, disconnect, connecting, connected, wallet, select } = useWallet();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevScreen, setPrevScreen] = useState<Screen | null>(null);
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [giftBalance, setGiftBalance] = useState<number>(0);
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(() => {
    const saved = localStorage.getItem('balance_visible');
    return saved !== null ? saved === 'true' : true;
  });
  const [loading, setLoading] = useState(false);
  const [viewport, setViewport] = useState<{ height: number; width: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [safeAreaTop, setSafeAreaTop] = useState(0);
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);
  const [currentDraw, setCurrentDraw] = useState<Draw | null>(null);

  // Get or create user by Telegram ID
  const getOrCreateUserByTelegramId = async (telegramId: number): Promise<User | null> => {
    if (!supabase) {
      console.error('Supabase is not configured.');
      return null;
    }

    try {
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST301') {
        console.error('Error fetching user:', fetchError);
      }

      if (existingUser) {
        return existingUser as User;
      }

      // Generate anon_id if not exists
      const anonId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId,
          anon_id: anonId,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          const { data: foundUser } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .maybeSingle();
          if (foundUser) return foundUser as User;
        }
        console.error('Failed to create user:', insertError.message);
        return null;
      }

      return newUser as User;
    } catch (error: any) {
      console.error('Error in getOrCreateUserByTelegramId:', error);
      return null;
    }
  };

  // Load user tickets
  const loadUserTickets = async (telegramId: number) => {
    if (!supabase) return;
    
    try {
      const ownerId = `telegram_${telegramId}`;
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

  // Load user data
  const loadUserData = async (telegramId: number) => {
    try {
      const userData = await getOrCreateUserByTelegramId(telegramId);
      if (userData) {
        setUser(userData);
        // Balance column removed, set to 0
        setGiftBalance(0);
      }
      await loadUserTickets(telegramId);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Load active draw from Supabase
  const loadActiveDraw = async () => {
    if (!supabase) {
      console.error('Supabase is not configured.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('draws')
        .select('*')
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error loading active draw:', error);
        return;
      }

      if (data) {
        setCurrentDraw(data as Draw);
      } else {
        // ��T����� �-��T� �-��T¦��-�-�-���- T��-��T˦�T�T�TȦ-, T�T�T¦-�-�-�-�����-�-���- null
        setCurrentDraw(null);
      }
    } catch (error) {
      console.error('Error in loadActiveDraw:', error);
    }
  };

  // Helper function to add debug log (only to console)
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
  }, []);

  // Load wallet balances
  const loadWalletBalances = useCallback(async () => {
    if (!publicKey) {
      addDebugLog('No wallet connected');
      setSolBalance(0);
      setUsdtBalance(0);
      setGiftBalance(0);
      return;
    }

    try {
      addDebugLog(`Loading Solana balances for: ${publicKey.toString()}`);
      
      const balances = await getAllBalances(publicKey);
      
      setSolBalance(balances.sol);
      setUsdtBalance(balances.usdt);
      setGiftBalance(balances.gift);
      
      addDebugLog(`SOL balance: ${balances.sol.toFixed(4)} SOL`);
      addDebugLog(`USDT balance: ${balances.usdt.toFixed(6)} USDT`);
      addDebugLog(`GIFT balance: ${balances.gift.toFixed(6)} GIFT`);
    } catch (error) {
      addDebugLog(`Error loading wallet balances`);
      console.error('Error loading wallet balances:', error);
    }
  }, [publicKey, addDebugLog]);

  // Update ticket draw_id in Supabase
  const updateTicketDrawId = async (ticketId: number, drawId: string) => {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          draw_id: drawId,
          status: 'in_draw'
        })
        .eq('id', ticketId);

      if (error) {
        console.error('Error updating ticket:', error);
        return false;
      }

      // Reload tickets
      if (telegramId) {
        await loadUserTickets(telegramId);
      }

      return true;
    } catch (error) {
      console.error('Error in updateTicketDrawId:', error);
      return false;
    }
  };

  // Handle enter draw
  const handleEnterDraw = useCallback((ticketId: number, drawId: string) => {
    updateTicketDrawId(ticketId, drawId).then((success) => {
      if (success) {
        // Show success message
        console.log('Ticket entered into draw successfully');
      } else {
        console.error('Failed to enter ticket into draw');
      }
    });
  }, [telegramId]);

  // Handle buy ticket
  const handleBuyTicket = useCallback(async () => {
    // Set loading immediately to show animation BEFORE any checks
    setLoading(true);

    if (!telegramId) {
      setLoading(false);
      alert('Please connect via Telegram first.');
      return;
    }

    // If wallet is not connected, connect it first
    if (!walletAddress || !connected || !publicKey) {
      // Open wallet selection modal
      setWalletModalOpen(true);
      
      setLoading(false);
      return;
    }
    
    // After wallet is connected, check USDT balance
    const WebApp = (window as any).Telegram?.WebApp;
        const minUsdtBalance = 1.1; // Minimum required USDT balance
        
        // Wait a bit for balances to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Re-check balances after loading
        await loadWalletBalances();
        
        // Wait a bit more for state to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get current balance from state
        const currentUsdtBalance = usdtBalance;
        addDebugLog(`���- Checking USDT balance: ${currentUsdtBalance.toFixed(6)} USDT (min: ${minUsdtBalance})`);
        
        // Check USDT balance
        if (currentUsdtBalance < minUsdtBalance) {
          addDebugLog(`��� Insufficient balance: ${currentUsdtBalance.toFixed(6)} < ${minUsdtBalance}`);
          setLoading(false);
          const openPurchase = confirm(
            `Insufficient USDT balance. You need at least ${minUsdtBalance} USDT to buy a ticket.\n\nYour current balance: ${currentUsdtBalance.toFixed(6)} USDT\n\nWould you like to open the USDT purchase page?`
          );
          
          if (openPurchase && WebApp) {
            // Open Phantom wallet
            const walletUrl = 'https://phantom.app/';
            
            // Try to open via Telegram or direct link
            if (WebApp.openLink) {
              WebApp.openLink(walletUrl);
            } else {
              // Fallback
              window.open(walletUrl, '_blank');
            }
          }
          return;
        }
        
    // Continue with purchase

    try {
      const WebApp = (window as any).Telegram?.WebApp;
      if (!WebApp || !isInTelegramWebApp()) {
        setLoading(false);
        alert('Please open this site in Telegram to buy tickets.');
        return;
      }

      // Check USDT balance (if wallet was already connected)
      const minUsdtBalance = 1.1;
      addDebugLog(`���- Checking USDT balance: ${usdtBalance.toFixed(6)} USDT (min: ${minUsdtBalance})`);
      
      // Reload balances before check
      if (walletAddress) {
        await loadWalletBalances();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const currentUsdtBalance = usdtBalance;
      addDebugLog(`���- Current USDT balance after reload: ${currentUsdtBalance.toFixed(6)} USDT`);
      
      if (currentUsdtBalance < minUsdtBalance) {
        addDebugLog(`��� Insufficient balance: ${currentUsdtBalance.toFixed(6)} < ${minUsdtBalance}`);
        setLoading(false);
        const openPurchase = confirm(
          `Insufficient USDT balance. You need at least ${minUsdtBalance} USDT to buy a ticket.\n\nYour current balance: ${currentUsdtBalance.toFixed(6)} USDT\n\nWould you like to open the USDT purchase page?`
        );
        
        if (openPurchase) {
          // Open Phantom wallet
          const walletUrl = 'https://phantom.app/';
          
          if (WebApp.openLink) {
            WebApp.openLink(walletUrl);
          } else {
            window.open(walletUrl, '_blank');
          }
        }
        return;
      }

      // Check SOL balance
      if (solBalance < 0.02) {
        // TODO: Show dialog to add SOL
        const addSol = confirm('Your SOL balance is low. Add 0.05 SOL (+$0.08 to price)?');
        if (!addSol) {
          setLoading(false);
          return;
        }
      }

      // TODO: Implement actual ticket purchase via SPL token transaction
      // For now, using mock payment
      const ticketCount = 1;
      const totalPriceCents = 100; // $1.00 = 100 cents

      // Create tickets after payment with max 5 seconds timeout
      const mintingStartTime = Date.now();
      const maxMintingTime = 5000; // 5 seconds max
      
      const mintingPromise = createTicketsAfterPayment(ticketCount, telegramId);
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), maxMintingTime);
      });
      
      await Promise.race([mintingPromise, timeoutPromise]);
      
      // Ensure minimum 1 second display
      const elapsed = Date.now() - mintingStartTime;
      if (elapsed < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
      }
      
      // Switch to tickets screen
      setCurrentScreen('tickets');
    } catch (error: any) {
      console.error('Error buying ticket:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, telegramId, solBalance, usdtBalance, loadWalletBalances]);

  // Create tickets after payment
  const createTicketsAfterPayment = async (count: number, tgId: number) => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    try {
      const ownerId = `telegram_${tgId}`;
      const ticketType = 'bronze';
      
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
      
      await loadUserTickets(tgId);
      alert(`��� Successfully purchased ${count} ticket(s)!`);
    } catch (error) {
      console.error('Error in createTicketsAfterPayment:', error);
      alert('Payment successful, but failed to create tickets. Please contact support.');
    }
  };

  // Connect wallet (Phantom)
  const handleConnectWallet = useCallback(async () => {
    // If wallet is already connected, refresh balances
    if (connected && publicKey) {
      setWalletAddress(publicKey.toString());
      await loadWalletBalances();
      return;
    }

    try {
      // Always open wallet selection modal
      // This allows reconnection even if wallet was previously connected
      setWalletModalOpen(true);
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  }, [connected, publicKey, loadWalletBalances]);

  // Sync publicKey with walletAddress
  useEffect(() => {
    console.log('🔍 Wallet state check:', {
      publicKey: publicKey?.toString(),
      connected,
      walletAddress,
      walletName: wallet?.adapter.name
    });
    
    if (publicKey) {
      setWalletAddress(publicKey.toString());
      loadWalletBalances();
    } else {
      setWalletAddress(null);
      setSolBalance(0);
      setUsdtBalance(0);
      setGiftBalance(0);
    }
  }, [publicKey, loadWalletBalances, connected, wallet, walletAddress]);

  // Initialize Telegram WebApp
  useEffect(() => {
    const isInTelegram = isInTelegramWebApp();
    const WebApp = (window as any).Telegram?.WebApp;
    
    // ��T����� �-�� �- Telegram, T�T�T¦-�-�-�-�����-�-���- �+��T���T¦-���-T˦� T��������-
    if (!isInTelegram || !WebApp) {
      // �ަ�T����+����TϦ��-, �-�-�-����Ț-�-�� ���� T�T�T�T��-��T�T¦-�- ���- T��-���-��T�T� Tͦ�T��-�-�-
      const isMobileDevice = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
      setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent));
      
      // ��T�T¦-�-�-�-�����-�-���- viewport �+��T� �+��T���T¦-���-
      if (!isMobileDevice) {
        setViewport({ height: window.innerHeight, width: window.innerWidth });
      }
      
      // �צ-��T�Tæ��-���- �-��T¦��-�-T˦� T��-��T˦�T�T�T� �+�-���� �-�-�� Telegram
      loadActiveDraw();
      return;
    }

    try {
      WebApp.ready();

      // �ަ�T����+����TϦ��- �����-T�TĦ-T��-T�
      const platform = WebApp.platform || '';
      const isMobilePlatform = platform === 'ios' || platform === 'android';
      const isDesktop = platform === 'desktop' || platform === 'web' || (!isMobilePlatform && platform !== '');
      setIsMobile(isMobilePlatform);
      setIsIOS(platform === 'ios');

      // �ߦ-��T�TǦ-���- safe area insets �+��T� �-�-�-����Ț-T�T�
      if (isMobilePlatform && WebApp.safeAreaInsets) {
        setSafeAreaTop(WebApp.safeAreaInsets.top || 0);
        setSafeAreaBottom(WebApp.safeAreaInsets.bottom || 0);
      }

      // ��-���-�-T��-TǦ��-�-���- T¦-��Ț��- �-�- �-�-�-����Ț-T�T� T�T�T�T��-��T�T¦-�-T� (�-�� �-�- �+��T���T¦-����)
      if (isMobilePlatform && !isDesktop) {
        const expandToFullscreen = () => {
          if (WebApp.expand) {
            try {
              WebApp.expand();
            } catch (e) {
              // Ignore errors
            }
          }
        };

        expandToFullscreen();
        setTimeout(expandToFullscreen, 0);
        setTimeout(expandToFullscreen, 10);
        setTimeout(expandToFullscreen, 20);
        setTimeout(expandToFullscreen, 50);
        setTimeout(expandToFullscreen, 100);
        setTimeout(expandToFullscreen, 150);
        setTimeout(expandToFullscreen, 200);
        setTimeout(expandToFullscreen, 300);
        setTimeout(expandToFullscreen, 500);
        setTimeout(expandToFullscreen, 800);
        setTimeout(expandToFullscreen, 1000);
      }

      if (WebApp.onEvent) {
        WebApp.onEvent('viewportChanged', () => {
          if (isMobilePlatform && !isDesktop) {
            setTimeout(() => {
              if (WebApp.expand) {
                try {
                  WebApp.expand();
                } catch (e) {
                  // Ignore errors
                }
              }
            }, 100);
          }
          if (WebApp.viewportHeight) {
            setViewport({ height: WebApp.viewportHeight, width: WebApp.viewportWidth || window.innerWidth });
          }
          if (isMobilePlatform && WebApp.safeAreaInsets) {
            setSafeAreaTop(WebApp.safeAreaInsets.top || 0);
            setSafeAreaBottom(WebApp.safeAreaInsets.bottom || 0);
          }
        });
      }

      if (WebApp.viewportHeight) {
        setViewport({ height: WebApp.viewportHeight, width: WebApp.viewportWidth || window.innerWidth });
      }
      
      if (isMobilePlatform && WebApp.safeAreaInsets) {
        setSafeAreaTop(WebApp.safeAreaInsets.top || 0);
      }

      if (WebApp.initDataUnsafe?.user && WebApp.requestWriteAccess) {
        try {
          WebApp.requestWriteAccess((granted: boolean) => {
            if (granted) {
              console.log('Write access granted - can send messages to user');
            } else {
              console.warn('Write access denied - cannot send messages');
            }
          });
        } catch (error) {
          console.warn('Error requesting write access:', error);
        }
      }

      if (WebApp.disableVerticalSwipes) {
        WebApp.disableVerticalSwipes();
      }

      if (WebApp.setHeaderColor) {
        WebApp.setHeaderColor('transparent');
      }

      if (WebApp.setBackgroundColor) {
        WebApp.setBackgroundColor('#0a0a0a');
      }
    } catch (error) {
      console.error('Error initializing Telegram WebApp:', error);
    }

    // Connect user
    const connectUser = async () => {
      let user = WebApp.initDataUnsafe?.user;

      if (!user && WebApp.initData) {
        try {
          const params = new URLSearchParams(WebApp.initData);
          const userParam = params.get('user');
          if (userParam) {
            user = JSON.parse(decodeURIComponent(userParam));
          }
        } catch (e) {
          console.warn('Could not parse user from initData');
        }
      }

      if (user && user.id) {
        setTelegramUser(user);
        setTelegramId(user.id);
        await loadUserData(user.id);
      }
    };

    connectUser();
    loadActiveDraw();

    // Wallet connection is handled by useEffect that syncs publicKey
    // Wallet connection is handled by useEffect that syncs publicKey

    // Cleanup
    return () => {
      if (WebApp?.offEvent) {
        WebApp.offEvent('viewportChanged', () => { /* empty */ });
      }
    };
  }, []);

  // Update active draw every 10 seconds
  useEffect(() => {
    loadActiveDraw();
    
    const interval = setInterval(() => {
      loadActiveDraw();
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Sync wallet connection state is handled by useEffect that syncs publicKey above

  // Update balances automatically every 10 seconds
  useEffect(() => {
    if (!walletAddress) return;

    // Update immediately when wallet address changes
    loadWalletBalances();
    if (telegramId) {
      loadUserData(telegramId);
    }

    // Then update every 10 seconds
    const interval = setInterval(() => {
      loadWalletBalances();
      if (telegramId) {
        loadUserData(telegramId);
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [walletAddress, telegramId, loadWalletBalances]);

  // Update balances when app becomes visible (user returns from wallet)
  useEffect(() => {
    if (!walletAddress) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to app, refresh balances
        loadWalletBalances();
        if (telegramId) {
          loadUserData(telegramId);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also listen for focus event as fallback
    const handleFocus = () => {
      loadWalletBalances();
      if (telegramId) {
        loadUserData(telegramId);
      }
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [walletAddress, telegramId, loadWalletBalances]);

  // Handle navigation from buttons with animation (Enter Draw button)
  const handleNavigateToTickets = () => {
    setPrevScreen(currentScreen);
    // ��-�-TǦ-���- T�T�T¦-�-�-�-�����-�-���- Tͦ�T��-�- tickets T� �-�-TǦ-��Ț-�-�� ���-����TƦ����� T���T��-�-�-
    setCurrentScreen('tickets');
    setIsTransitioning(false);
    // �ݦ��-�-��T�TȦ-T� ���-�+��T������- �+��T� ��T����-���-���-��T� �-�-TǦ-��Ț-�-���- T��-T�T¦-TϦ-��T� (T���T��-�-�-)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // �צ-��T�T����-���- �-�-���-�-TƦ�T� - tickets T��+�-�����-��T�T�T� �- TƦ��-T�T�, home T�TŦ-�+��T� �-�����-�-
        setIsTransitioning(true);
        setTimeout(() => {
          setIsTransitioning(false);
          setPrevScreen(null);
        }, 300);
      });
    });
  };

  // Handle navigation to tickets without animation (bottom nav button)
  const handleNavigateToTicketsNoAnimation = () => {
    setCurrentScreen('tickets');
    setIsTransitioning(false);
  };

  const handleNavigateToProfile = () => {
    setCurrentScreen('profile');
  };

  const handleNavigateToHome = () => {
    setCurrentScreen('home');
  };

  // Send welcome message to bot
  const sendWelcomeMessage = useCallback(async (telegramId: number) => {
    try {
      console.log('Attempting to send welcome message to user:', telegramId);
      
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId: telegramId,
          text: 'You have granted permission to send you messages when you opened this bot.',
        }),
      });

      const responseData = await response.json();
      console.log('Send message response:', { status: response.status, data: responseData });

      if (!response.ok) {
        console.error('Failed to send welcome message:', responseData);
        
        // ��T����� ���-��Ț��-�-�-T¦���T� �-�� �-�-TǦ-�� �+���-���-�� T� �-�-T¦-�-, ���-���-��T˦-�-���- ���-�+T����-����T�
        if (responseData.details?.error_code === 403 || 
            responseData.details?.description?.includes('bot was blocked') ||
            responseData.details?.description?.includes('chat not found')) {
          console.warn('User needs to start a conversation with the bot first. Please send /start to @giftdrawtoday_bot');
          // �ܦ-���-�- ���-���-���-T�T� Tæ-���+�-�-�����-���� ���-��Ț��-�-�-T¦���T�
          alert('Please start a conversation with @giftdrawtoday_bot first by sending /start command.');
        }
      } else {
        console.log('Welcome message sent successfully');
      }
    } catch (error) {
      console.error('Error sending welcome message:', error);
    }
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      triggerHaptic();
      
      // ��T¦���T�TǦ-���- ���-TȦ������� ��T����� ���-�+����T�TǦ��-
      if (connected && publicKey) {
        try {
          await disconnect();
        } catch (error) {
          console.error('Error disconnecting wallet:', error);
        }
      }
      
      // ��TǦ�Tɦ-���- cookie T���T�T����� TǦ�T����� API
      try {
        await fetch('/api/auth/session?action=logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Error clearing session:', error);
      }
      
      // ��TǦ�Tɦ-���- localStorage
      localStorage.removeItem('balance_visible');
      
      // ��T�T¦-�-�-�-�����-�-���- TĦ��-��, T�T¦- ���-��Ț��-�-�-T¦���T� T¦-��Ț��- T�T¦- T��-�����-�����-����T�T�
      // ��T¦- ��T����+�-T¦-T��-T¦�T� ��T��-�-��T���T� T���T�T����� ��T��� T������+T�T�Tɦ��� ���-��T�Tæ�����
      localStorage.setItem('just_logged_out', 'true');
      
      // �ݦ��-���+�����-�-�- ����T������-��T�Tæ��-���- T�T�T��-�-��T�T� �-���� �����-���-���-��T� T��-T�T¦-TϦ-��T�
      // ��-T�T¦-TϦ-���� �-TǦ�T�T¦�T�T�T� ��T��� ����T������-��T�Tæ�����
      window.location.replace('/');
    } catch (error) {
      console.error('Error during logout:', error);
      // �� T���T�TǦ-�� �-TȦ��-���� �-T��� T��-�-�-�- ����T������-��T�Tæ��-���- T�T�T��-�-��T�T�
      window.location.replace('/');
    }
  }, [connected, publicKey, disconnect]);

  // Handle authorization through bot
  const handleConnectViaBot = useCallback(async () => {
    // �Ӧ��-��T���T�Tæ��- �+�����-�-T˦� TǦ�T����-�-�-�� ���+���-T¦�TĦ����-T¦-T� �+��T� �-T�T����������-�-�-��T� ���-��T��-T��- �-�-T¦-T������-TƦ���
    // ��T¦- �-�� T¦-�����-, �- ��T��-T�T¦- �-�-T�����T� T¦-���-, T�T¦- ���-��T��-T� ��T���TȦ��� T� T��-��T¦-
    // ��T����-��Ț�Tæ��- timestamp + T���T�TǦ-���-T˦� TƦ�T�T�T� �+��T� Tæ-�����-��Ț-�-T�T¦�
    const timestamp = Date.now().toString();
    const randomDigits = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    const authId = timestamp + randomDigits;
    // Сохраняем origin на сервере перед переходом к боту
try {
  await fetch('/api/auth/prepare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: authId, origin: window.location.origin }),
  });
} catch (error) {
  console.error('Failed to save origin:', error);
}
    // �� �-�-�-�-�� T���T�T¦��-�� �-T¦�T�T˦-�-���- �-�-T¦- T� ���-T��-�-��T�T��-�- auth, ���-�����- ��T��-�����-���+��T� ��T��� /start
    const botUrl = `https://t.me/giftdrawtoday_bot?start=${authId}`;
    
    // ��T����-��Ț�Tæ��- ��T�TϦ-�-�� ����T���TŦ-�+ - T�T¦- ���-T��-�-T¦�T�Tæ�T� �-�-T¦-�-�-T¦�TǦ�T���T�T� �-T¦�T��-�-��T� /start
    // ��T��� ����T��-�-�- �-T¦�T�T�T¦��� �-�-T¦- Telegram �-�-T¦-�-�-T¦�TǦ�T����� �-T¦�T��-�-��TϦ�T� ���-�-�-�-�+T� /start T� ���-T��-�-��T�T��-�- ���� URL
    // �ݦ� T�T�T¦-�-�-�-�����-�-���- loading, T¦-�� ���-�� ����T���TŦ-�+ ��T��-��T�TŦ-�+��T� �-���-�-�-���-�-�-
    window.location.href = botUrl;
  }, []);

  // Initialize user from Telegram WebApp (if in Telegram)
  useEffect(() => {
    // ��T����� ���-��Ț��-�-�-T¦���T� Tæ��� �-�-T¦-T������-�-�-�-, �-�� �+�����-���- �-��TǦ����-
    if (telegramUser) return;

    // ��T����� Tæ��� �- Telegram WebApp, ��T����-��Ț�Tæ��- T�T�Tɦ�T�T¦-T�T�Tɦ��� �+�-�-�-T˦� �-�-��T�TϦ-T�T�
    if (isInTelegramWebApp()) {
      const WebApp = (window as any).Telegram?.WebApp;
      if (WebApp?.initDataUnsafe?.user) {
        const user = WebApp.initDataUnsafe.user;
        setTelegramUser(user);
        if (user.id) {
          setTelegramId(user.id);
          loadUserData(user.id);
          
          // �צ-��T��-TȦ��-�-���- T��-��T���TȦ��-���� �-�- �-T¦�T��-�-��T� T��-�-�-Tɦ��-����
          if (WebApp.requestWriteAccess) {
            WebApp.requestWriteAccess((granted: boolean) => {
              if (granted) {
                sendWelcomeMessage(user.id);
              }
            });
          }
        }
        return;
      }
    }

    // ��T��-�-��T�TϦ��- T���T�T���T� ���� cookie (�+��T� �-�-T¦-T������-TƦ��� TǦ�T����� �-�-T¦-)
    let lastSessionCheck = 0;
    const SESSION_CHECK_COOLDOWN = 3000; // �ܦ��-���-Tæ- 3 T�����Tæ-�+T� �-�����+T� ��T��-�-��T����-�-��
    
    const checkSession = async () => {
      // �ݦ� ��T��-�-��T�TϦ��- T���T�T���T� ��T����� ���-��Ț��-�-�-T¦���T� T¦-��Ț��- T�T¦- T��-�����-�����-����T�T�
      const justLoggedOut = localStorage.getItem('just_logged_out');
      if (justLoggedOut === 'true') {
        localStorage.removeItem('just_logged_out');
        return false;
      }
      
      // �ަ�T��-�-��TǦ��-�-���- TǦ-T�T¦-T�T� ��T��-�-��T��-��
      const now = Date.now();
      if (now - lastSessionCheck < SESSION_CHECK_COOLDOWN) {
        return false;
      }
      lastSessionCheck = now;
      
      try {
        // ��T��-�-��T�TϦ��- cookie TǦ�T����� API endpoint
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.authenticated && data.userId) {
            // �Ҧ-T�T�T¦-�-�-�-�����-�-���- �+�-�-�-T˦� ���-��Ț��-�-�-T¦���T� ���� T���T�T�����
            setTelegramUser({
              id: data.userId,
              first_name: data.firstName || '',
              last_name: data.lastName || '',
              username: data.username || '',
              photo_url: data.avatarUrl || undefined,
            });
            setTelegramId(data.userId);
            await loadUserData(data.userId);
            return true; // �ᦦT�T���T� �-�-���+���-�-
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
      return false; // �ᦦT�T���T� �-�� �-�-���+���-�-
    };

    // ��T��-�-��T�TϦ��- T���T�T���T� T�T��-��T� ��T��� ���-��T�Tæ����� (T¦-��Ț��- �-�+���- T��-��)
    checkSession();
      
    // ��T��-�-��T�TϦ��- T���T�T���T� ��T��� �-���+���-�-T�T¦� T�T�T��-�-��T�T� (���-���+�- ���-��Ț��-�-�-T¦���T� �-�-���-T��-Tɦ-��T�T�T� �-�- �-�����-�+��T�)
    // ��T����-��Ț�Tæ��- T¦-��Ț��- visibilitychange, T¦-�� ���-�� focus �-�-����T� T�T��-�-�-T�T˦-�-T�T� T�����TȦ��-�- TǦ-T�T¦-
    const handleVisibilityChange = async () => {
      // �ݦ� ��T��-�-��T�TϦ��- T���T�T���T� ��T����� ���-��Ț��-�-�-T¦���T� T¦-��Ț��- T�T¦- T��-�����-�����-����T�T�
      const justLoggedOut = localStorage.getItem('just_logged_out');
      if (justLoggedOut === 'true') {
        return;
      }
      
      if (document.visibilityState === 'visible' && !telegramUser) {
        await checkSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [telegramUser, loadUserData, sendWelcomeMessage]);

  // Haptic feedback function
  const triggerHaptic = () => {
    // Try Telegram WebApp haptic feedback first
    const WebApp = (window as any).Telegram?.WebApp;
    if (WebApp?.HapticFeedback?.impactOccurred) {
      try {
        WebApp.HapticFeedback.impactOccurred('light');
      } catch (e) {
        // Fallback to navigator.vibrate
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    } else if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const screenHeight = viewport?.height || window.innerHeight;

  return (
    <div 
      className="overflow-hidden bg-background h-screen w-full"
      style={isMobile ? { 
        height: `${screenHeight}px`,
        overflow: 'hidden',
      } : {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
      }}
    >
      {!isMobile ? (
        <div 
          className="relative bg-background overflow-hidden flex flex-col"
          style={{
            width: '428px',
            height: '926px',
            maxWidth: '100%',
            maxHeight: '100%',
            boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)',
            borderRadius: '20px',
          }}
        >
          {/* Header - T¦-��Ț��- �-�- �+��T���T¦-���� */}
          <header className="backdrop-blur-xl bg-background/50 z-50 sticky top-0 h-[72px] flex-shrink-0">
            <div className="px-4 py-4 h-full flex justify-between items-center gap-3 overflow-hidden">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {telegramUser ? (
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0 ml-2"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      triggerHaptic();
                      handleNavigateToProfile();
                    }}
                  >
                    {telegramUser.photo_url && (
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarImage src={telegramUser.photo_url} alt={telegramUser.first_name || 'User'} />
                        <AvatarFallback className="text-sm">
                          {telegramUser.first_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-base font-display font-bold truncate">
                        {telegramUser?.first_name} {telegramUser?.last_name || ''}
                      </h2>
                      {user?.anon_id && (
                        <p className="text-xs text-muted-foreground font-mono truncate">ID: {user.anon_id}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-6 h-6 text-primary" />
                    <h2 className="text-base font-display font-bold">GiftDraw.today</h2>
                  </div>
                )}
              </div>
              
              {/* �ڦ-�-�����- ���-�+����T�TǦ��-��T� TǦ�T����� �-�-T¦- ������ �����-�-���- �-T�TŦ-�+�- */}
              {!telegramUser ? (
                <Button
                  onClick={handleConnectViaBot}
                  className="bg-[#0088cc] hover:bg-[#0077b5] text-white px-3 py-1.5"
                  size="sm"
                >
                  <TelegramIcon className="w-5 h-5 mr-1" />
                  <span className="text-xs">Connect via Telegram</span>
                </Button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="group p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              )}
            </div>
          </header>

          {/* Screens Container �+��T� �+��T���T¦-���- */}
          <div 
            className="relative w-full overflow-hidden flex-1"
            style={{
              minHeight: 0, // ��T�T��-T¦- �-���-T�T� header �� footer
            }}
          >
            <div className="relative w-full h-full overflow-hidden">
              {(currentScreen === 'home' || (currentScreen === 'tickets' && isTransitioning)) && (
                <div 
                  className="absolute inset-0 w-full h-full transition-transform duration-300 ease-in-out"
                  style={{
                    transform: currentScreen === 'tickets' && isTransitioning ? 'translateX(-100%)' : 'translateX(0)',
                  }}
                >
                  <HomeScreen 
                    currentDraw={currentDraw}
                    onEnterDraw={handleNavigateToTickets}
                    isVisible={currentScreen === 'home'}
                  />
                </div>
              )}
              {currentScreen === 'tickets' && (
                <div 
                  className="absolute inset-0 w-full h-full transition-transform duration-300 ease-in-out"
                  style={{
                    transform: isTransitioning ? 'translateX(0)' : (prevScreen === 'home' ? 'translateX(100%)' : 'translateX(0)'),
                  }}
                >
                  <TicketsScreen
                    tickets={tickets}
                    onEnterDraw={handleEnterDraw}
                    onBuyTicket={handleBuyTicket}
                    loading={loading}
                  />
                </div>
              )}
              {currentScreen === 'profile' && (
                <div className="absolute inset-0 w-full h-full">
                  <ProfileScreen
                    telegramUser={telegramUser}
                    user={user}
                    walletAddress={walletAddress}
                    giftBalance={giftBalance}
                    usdtBalance={usdtBalance}
                    solBalance={solBalance}
                    isBalanceVisible={isBalanceVisible}
                    onToggleBalanceVisibility={() => {
                      const newValue = !isBalanceVisible;
                      setIsBalanceVisible(newValue);
                      localStorage.setItem('balance_visible', String(newValue));
                    }}
                    onConnectWallet={handleConnectWallet}
                    onBuyTicket={handleBuyTicket}
                    loading={loading}
                  />
                </div>
              )}
              {currentScreen === 'about' && (
                <div className="absolute inset-0 w-full h-full">
                  <AboutScreen />
                </div>
              )}
            </div>
          </div>

          {/* Bottom Navigation �+��T� �+��T���T¦-���- */}
          <footer className="border-t border-white/20 backdrop-blur-xl bg-background/50 z-50 rounded-t-2xl h-[60px] flex-shrink-0" style={{ marginBottom: '16px' }}>
            <div className="flex items-center justify-between px-8 pt-6 pb-2 h-full">
              {/* About Button (Left) */}
              <Button
                variant="ghost"
                size="lg"
                className="flex flex-col items-center gap-1 h-auto py-2 pb-4 hover:bg-transparent hover:text-inherit active:bg-transparent"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerHaptic();
                  setCurrentScreen('about');
                }}
              >
                <Info className={`w-5 h-5 ${currentScreen === 'about' ? 'text-white' : 'text-muted-foreground'}`} />
                <span className={`text-xs ${currentScreen === 'about' ? 'text-white font-semibold' : 'text-muted-foreground'}`}>
                  About
                </span>
              </Button>

              {/* Draw Button (Center) */}
              <Button
                variant="ghost"
                size="lg"
                className="flex flex-col items-center gap-1 h-auto py-2 pb-4 hover:bg-transparent hover:text-inherit active:bg-transparent"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerHaptic();
                  handleNavigateToHome();
                }}
              >
                <Wand2 className={`w-5 h-5 ${currentScreen === 'home' ? 'text-white' : 'text-muted-foreground'}`} />
                <span className={`text-xs ${currentScreen === 'home' ? 'text-white font-semibold' : 'text-muted-foreground'}`}>
                  Draw
                </span>
              </Button>

              {/* Tickets Button (Right) */}
              <Button
                variant="ghost"
                size="lg"
                className="flex flex-col items-center gap-1 h-auto py-2 pb-4 hover:bg-transparent hover:text-inherit active:bg-transparent"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerHaptic();
                  handleNavigateToTicketsNoAnimation();
                }}
              >
                <Ticket className={`w-5 h-5 ${currentScreen === 'tickets' ? 'text-white' : 'text-muted-foreground'}`} />
                <span className={`text-xs ${currentScreen === 'tickets' ? 'text-white font-semibold' : 'text-muted-foreground'}`}>
                  Tickets
                </span>
              </Button>
            </div>
          </footer>
        </div>
      ) : (
        <>
          {/* Header - T¦-��Ț��- �-�- �-�-�-����Ț-T�T�, T� ���-���-T¦����-�- �� ���-�-�����-�� ���-�+����T�TǦ��-��T� */}
          {isMobile && (
            <header 
              className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/50 border-b border-border/50"
              style={{ 
                paddingTop: `${Math.max(safeAreaTop, 0)}px`
              }}
            >
              <div className="px-4 py-4 h-[66px] flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {telegramUser ? (
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0 ml-2"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      triggerHaptic();
                      handleNavigateToProfile();
                    }}
                  >
                    {telegramUser.photo_url && (
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={telegramUser.photo_url} alt={telegramUser.first_name || 'User'} />
                        <AvatarFallback className="text-sm">
                          {telegramUser.first_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-sm font-display font-bold truncate">
                        {telegramUser?.first_name} {telegramUser?.last_name || ''}
                      </h2>
                      {user?.anon_id && (
                        <p className="text-xs text-muted-foreground font-mono truncate">ID: {user.anon_id}</p>
                      )}
                    </div>
                  </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-5 h-5 text-primary" />
                      <h2 className="text-sm font-display font-bold">GiftDraw.today</h2>
                    </div>
                  )}
                </div>
                
                {/* �ڦ-�-�����- ���-�+����T�TǦ��-��T� TǦ�T����� �-�-T¦- ������ �����-�-���- �-T�TŦ-�+�- */}
                {!telegramUser ? (
                  <Button
                    onClick={handleConnectViaBot}
                    className="bg-[#0088cc] hover:bg-[#0077b5] text-white px-3 py-1.5"
                    size="sm"
                  >
                    <TelegramIcon className="w-5 h-5 mr-1" />
                    <span className="text-xs">Connect via Telegram</span>
                  </Button>
                ) : (
                  <button
                    onClick={handleLogout}
                    className="group p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                )}
              </div>
            </header>
          )}

          {/* Screens Container �+��T� �-�-�-����Ț-T�T� */}
          <div 
            className="relative w-full overflow-hidden"
            style={isMobile ? {
              height: viewport?.height 
                ? `${Math.max(viewport.height - 66 - 66 - Math.max(safeAreaTop, 0) - Math.max(safeAreaBottom, 0), 0)}px`
                : `calc(100dvh - ${66 + 66 + Math.max(safeAreaTop, 0) + Math.max(safeAreaBottom, 0)}px)`,
              marginTop: `${66 + Math.max(safeAreaTop, 0)}px`,
              overflow: 'hidden',
              maxHeight: viewport?.height 
                ? `${Math.max(viewport.height - 66 - 66 - Math.max(safeAreaTop, 0) - Math.max(safeAreaBottom, 0), 0)}px`
                : undefined,
            } : {}}
          >
            <div className="relative w-full h-full overflow-hidden">
              {(currentScreen === 'home' || (currentScreen === 'tickets' && isTransitioning)) && (
                <div 
                  className="absolute inset-0 w-full h-full transition-transform duration-300 ease-in-out"
                  style={{
                    transform: currentScreen === 'tickets' && isTransitioning ? 'translateX(-100%)' : 'translateX(0)',
                  }}
                >
                  <HomeScreen 
                    currentDraw={currentDraw}
                    onEnterDraw={handleNavigateToTickets}
                    isVisible={currentScreen === 'home'}
                  />
                </div>
              )}
              {currentScreen === 'tickets' && (
                <div 
                  className="absolute inset-0 w-full h-full transition-transform duration-300 ease-in-out"
                  style={{
                    transform: isTransitioning ? 'translateX(0)' : (prevScreen === 'home' ? 'translateX(100%)' : 'translateX(0)'),
                  }}
                >
                  <TicketsScreen
                    tickets={tickets}
                    onEnterDraw={handleEnterDraw}
                    onBuyTicket={handleBuyTicket}
                    loading={loading}
                  />
                </div>
              )}
              {currentScreen === 'profile' && (
                <div className="absolute inset-0 w-full h-full">
                  <ProfileScreen
                    telegramUser={telegramUser}
                    user={user}
                    walletAddress={walletAddress}
                    giftBalance={giftBalance}
                    usdtBalance={usdtBalance}
                    solBalance={solBalance}
                    isBalanceVisible={isBalanceVisible}
                    onToggleBalanceVisibility={() => {
                      const newValue = !isBalanceVisible;
                      setIsBalanceVisible(newValue);
                      localStorage.setItem('balance_visible', String(newValue));
                    }}
                    onConnectWallet={handleConnectWallet}
                    onBuyTicket={handleBuyTicket}
                    loading={loading}
                  />
                </div>
              )}
              {currentScreen === 'about' && (
                <div className="absolute inset-0 w-full h-full">
                  <AboutScreen />
                </div>
              )}
            </div>
          </div>

          {/* Bottom Navigation �+��T� �-�-�-����Ț-T�T� */}
          <footer className="fixed bottom-0 left-0 right-0 border-t border-white/20 backdrop-blur-xl bg-background/50 z-50 rounded-t-2xl" style={{ marginBottom: `${16 + Math.max(safeAreaBottom, 0)}px` }}>
            <div className="grid grid-cols-3 items-center px-4 h-[66px]">
              {/* About Button (Left) */}
              <Button
                variant="ghost"
                size="lg"
                className={`flex flex-col items-center justify-center gap-1 h-full hover:bg-transparent hover:text-inherit active:bg-transparent justify-self-center ml-4 ${isIOS ? 'pt-1' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerHaptic();
                  setCurrentScreen('about');
                }}
              >
                <Info className={`w-5 h-5 ${currentScreen === 'about' ? 'text-white' : 'text-muted-foreground'}`} />
                <span className={`text-xs ${currentScreen === 'about' ? 'text-white font-semibold' : 'text-muted-foreground'}`}>
                  About
                </span>
              </Button>

              {/* Draw Button (Center) - Fixed position */}
              <Button
                variant="ghost"
                size="lg"
                className={`flex flex-col items-center justify-center gap-1 h-full hover:bg-transparent hover:text-inherit active:bg-transparent justify-self-center ${isIOS ? 'pt-1' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerHaptic();
                  handleNavigateToHome();
                }}
              >
                <Wand2 className={`w-5 h-5 ${currentScreen === 'home' ? 'text-white' : 'text-muted-foreground'}`} />
                <span className={`text-xs ${currentScreen === 'home' ? 'text-white font-semibold' : 'text-muted-foreground'}`}>
                  Draw
                </span>
              </Button>

              {/* Tickets Button (Right) */}
              <Button
                variant="ghost"
                size="lg"
                className={`flex flex-col items-center justify-center gap-1 h-full hover:bg-transparent hover:text-inherit active:bg-transparent justify-self-center mr-4 ${isIOS ? 'pt-1' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  triggerHaptic();
                  handleNavigateToTicketsNoAnimation();
                }}
              >
                <Ticket className={`w-5 h-5 ${currentScreen === 'tickets' ? 'text-white' : 'text-muted-foreground'}`} />
                <span className={`text-xs ${currentScreen === 'tickets' ? 'text-white font-semibold' : 'text-muted-foreground'}`}>
                  Tickets
                </span>
              </Button>
            </div>
          </footer>
        </>
      )}
      <SolanaWalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </div>
  );
}



