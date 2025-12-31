// src/pages/MiniApp.tsx - New Mini App architecture
import { useState, useEffect, useCallback } from 'react';
import { Info, Sparkles, Ticket, X, Wand2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { supabase, type User, type Ticket as TicketType, type Draw } from '@/lib/supabase';
import { isInTelegramWebApp } from '@/lib/telegram';
import { initTonConnect, getWalletAddress, isWalletConnected, tonConnect } from '@/lib/tonconnect';
import HomeScreen from './miniapp/HomeScreen';
import TicketsScreen from './miniapp/TicketsScreen';
import ProfileScreen from './miniapp/ProfileScreen';
import AboutScreen from './miniapp/AboutScreen';

type Screen = 'home' | 'tickets' | 'profile' | 'about';

export default function MiniApp() {
  const [tonConnectUI] = useTonConnectUI();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevScreen, setPrevScreen] = useState<Screen | null>(null);
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [cltBalance, setCltBalance] = useState<number>(0);
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [tonBalance, setTonBalance] = useState<number>(0);
  const [isBalanceVisible, setIsBalanceVisible] = useState(() => {
    const saved = localStorage.getItem('balance_visible');
    return saved !== null ? saved === 'true' : true;
  });
  const [loading, setLoading] = useState(false);
  const [viewport, setViewport] = useState<{ height: number; width: number } | null>(null);
  // Initialize isMobile with smart default based on user agent
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  });
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
          balance: 0,
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
        setCltBalance(Number(userData.balance));
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
        // Если нет активного розыгрыша, устанавливаем null
        setCurrentDraw(null);
      }
    } catch (error) {
      console.error('Error in loadActiveDraw:', error);
    }
  };

  // Load wallet balances
  const loadWalletBalances = async () => {
    if (!walletAddress) return;

    try {
      // TODO: Implement actual balance fetching from TON blockchain
      // For now, using mock data
      // You'll need to use TON API or TON Connect to get balances
      setUsdtBalance(0);
      setTonBalance(0);
    } catch (error) {
      console.error('Error loading wallet balances:', error);
    }
  };

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

    // If wallet is not connected, connect it first using standard TON Connect UI
    if (!walletAddress || !tonConnectUI?.connected) {
      // Use standard TON Connect UI to open wallet selection modal
      if (!tonConnectUI) {
        setLoading(false);
        alert('Wallet connection is not available. Please refresh the page.');
        return;
      }
      tonConnectUI.openModal();
      
      // Track modal state to detect when it closes
      let connectionEstablished = false;
      let modalWasOpened = false;
      
      // Subscribe to connection status changes
      const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
        if (wallet && wallet.account) {
          connectionEstablished = true;
          const address = wallet.account.address;
          setWalletAddress(address);
          loadWalletBalances();
        }
      });
      
      // Wait for connection to be established or modal to close
      let attempts = 0;
      const maxAttempts = 600; // 30 seconds (600 * 50ms)
      
      while (!connectionEstablished && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
        
        // Check if modal was opened
        if (tonConnectUI?.modalState === 'opened') {
          modalWasOpened = true;
        }
        
        // Check if modal was closed without connection
        if (modalWasOpened && tonConnectUI?.modalState === 'closed' && !tonConnectUI?.connected) {
          unsubscribe();
          setLoading(false);
          alert('Connection not established. Please select a wallet in the popup window and confirm the connection.');
          return;
        }
        
        // Check if connection was established
        if (tonConnectUI?.connected && tonConnectUI?.wallet?.account?.address) {
          connectionEstablished = true;
          const address = tonConnectUI.wallet.account.address;
          setWalletAddress(address);
          await loadWalletBalances();
          unsubscribe();
          break;
        }
      }
      
      unsubscribe();
      
      // Check final connection status
      if (tonConnectUI?.connected && tonConnectUI?.wallet?.account?.address) {
        const address = tonConnectUI.wallet.account.address;
        setWalletAddress(address);
        await loadWalletBalances();
        // Continue with purchase
      } else {
        setLoading(false);
        alert('Connection not established. Please select a wallet in the popup window and confirm the connection.');
        return;
      }
    }

    try {
      const WebApp = (window as any).Telegram?.WebApp;
      if (!WebApp || !isInTelegramWebApp()) {
        setLoading(false);
        alert('Please open this site in Telegram to buy tickets.');
        return;
      }

      // Check TON balance
      if (tonBalance < 0.02) {
        // TODO: Show dialog to add 0.05 TON
        const addTon = confirm('Your TON balance is low. Add 0.05 TON (+$0.08 to price)?');
        if (!addTon) {
          setLoading(false);
          return;
        }
      }

      // TODO: Implement actual ticket purchase via Jetton transaction
      // For now, using mock payment
      const ticketCount = 1;
      const totalPriceCents = 100; // $1.00 = 100 cents

      // Create tickets after payment
      await createTicketsAfterPayment(ticketCount, telegramId);
      
      // Add minimum delay to show minting animation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Switch to tickets screen
      setCurrentScreen('tickets');
    } catch (error: any) {
      console.error('Error buying ticket:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, telegramId, tonBalance, loadWalletBalances]);

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
      alert(`✅ Successfully purchased ${count} ticket(s)!`);
    } catch (error) {
      console.error('Error in createTicketsAfterPayment:', error);
      alert('Payment successful, but failed to create tickets. Please contact support.');
    }
  };

  // Connect wallet
  const handleConnectWallet = useCallback(async () => {
    // If wallet is already connected, do nothing
    if (tonConnectUI?.connected && tonConnectUI?.wallet?.account?.address) {
      const address = tonConnectUI.wallet.account.address;
      setWalletAddress(address);
      await loadWalletBalances();
      return;
    }

    try {
      setLoading(true);
      
      // Use standard TON Connect UI to open wallet selection modal
      if (!tonConnectUI) {
        setLoading(false);
        alert('Wallet connection is not available. Please refresh the page.');
        return;
      }
      tonConnectUI.openModal();
      
      // Track modal state to detect when it closes
      let connectionEstablished = false;
      let modalWasOpened = false;
      
      // Subscribe to connection status changes
      if (!tonConnectUI.onStatusChange) {
        setLoading(false);
        return;
      }
      const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
        if (wallet && wallet.account) {
          connectionEstablished = true;
          const address = wallet.account.address;
          setWalletAddress(address);
          loadWalletBalances();
        }
      });
      
      // Wait for connection to be established or modal to close
      let attempts = 0;
      const maxAttempts = 600; // 30 seconds (600 * 50ms)
      
      while (!connectionEstablished && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
        
        // Check if modal was opened
        if (tonConnectUI?.modalState === 'opened') {
          modalWasOpened = true;
        }
        
        // Check if modal was closed without connection
        if (modalWasOpened && tonConnectUI?.modalState === 'closed' && !tonConnectUI?.connected) {
          unsubscribe();
          setLoading(false);
          alert('Connection not established. Please select a wallet in the popup window and confirm the connection.');
          return;
        }
        
        // Check if connection was established
        if (tonConnectUI?.connected && tonConnectUI?.wallet?.account?.address) {
          connectionEstablished = true;
          const address = tonConnectUI.wallet.account.address;
          setWalletAddress(address);
          await loadWalletBalances();
          unsubscribe();
          break;
        }
      }
      
      unsubscribe();
      
      // Check final connection status
      if (tonConnectUI?.connected && tonConnectUI?.wallet?.account?.address) {
        const address = tonConnectUI.wallet.account.address;
        setWalletAddress(address);
        await loadWalletBalances();
      } else if (!connectionEstablished) {
        setLoading(false);
        alert('Connection not established. Please select a wallet in the popup window and confirm the connection.');
        return;
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setLoading(false);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tonConnectUI, loadWalletBalances]);

  // Initialize Telegram WebApp
  useEffect(() => {
    // Fallback: detect mobile by user agent if not in Telegram
    const detectMobileFallback = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    };

    if (!isInTelegramWebApp()) {
      console.warn('MiniApp rendered outside Telegram — using fallback detection.');
      setIsMobile(detectMobileFallback());
      return;
    }

    const WebApp = (window as any).Telegram?.WebApp;
    if (!WebApp) {
      setIsMobile(detectMobileFallback());
      return;
    }

    try {
      WebApp.ready();

      // Определяем платформу
      const platform = WebApp.platform || '';
      const isMobilePlatform = platform === 'ios' || platform === 'android';
      const isDesktop = platform === 'desktop' || platform === 'web' || (!isMobilePlatform && platform !== '');
      setIsMobile(isMobilePlatform);

      // Получаем safe area insets для мобильных
      if (isMobilePlatform && WebApp.safeAreaInsets) {
        setSafeAreaTop(WebApp.safeAreaInsets.top || 0);
        setSafeAreaBottom(WebApp.safeAreaInsets.bottom || 0);
      }

      // Разворачиваем только на мобильных устройствах (не на десктопе)
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

    // Initialize TON Connect
    initTonConnect().then(() => {
      if (isWalletConnected()) {
        const address = getWalletAddress();
        if (address) {
          setWalletAddress(address);
          loadWalletBalances();
        }
      }
    });

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

  // Update balances every 30 seconds
  useEffect(() => {
    if (!walletAddress) return;

    const interval = setInterval(() => {
      loadWalletBalances();
      if (telegramId) {
        loadUserData(telegramId);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [walletAddress, telegramId]);

  // Handle navigation from buttons with animation (Enter Draw button)
  const handleNavigateToTickets = () => {
    setPrevScreen(currentScreen);
    // Сначала устанавливаем экран tickets с начальной позицией справа
    setCurrentScreen('tickets');
    setIsTransitioning(false);
    // Небольшая задержка для применения начального состояния (справа)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Запускаем анимацию - tickets сдвигается в центр, home уходит влево
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
          className="relative bg-background overflow-hidden"
          style={{
            width: '428px',
            height: '926px',
            maxWidth: '100%',
            maxHeight: '100%',
            boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)',
            borderRadius: '20px',
          }}
        >
          {/* Header - только на десктопе */}
          <header className="backdrop-blur-xl bg-background/50 z-50 sticky top-0">
            <div className="px-4 py-4 min-h-[60px] flex justify-start items-center gap-3">
              {telegramUser && (
                <>
                  <div
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      triggerHaptic();
                      handleNavigateToProfile();
                    }}
                  >
                    {telegramUser.photo_url && (
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={telegramUser.photo_url} alt={telegramUser.first_name || 'User'} />
                        <AvatarFallback className="text-sm">
                          {telegramUser.first_name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <div 
                    className="flex flex-col cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      triggerHaptic();
                      handleNavigateToProfile();
                    }}
                  >
                    <h2 className="text-base font-display font-bold">
                      {telegramUser?.first_name} {telegramUser?.last_name || ''}
                    </h2>
                    {user?.anon_id && (
                      <p className="text-xs text-muted-foreground font-mono">ID: {user.anon_id}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </header>

          {/* Screens Container для десктопа */}
          <div 
            className="relative w-full overflow-hidden"
            style={{
              height: 'calc(100% - 60px - 80px)', // Высота минус header и footer
              marginTop: '0',
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
                    cltBalance={cltBalance}
                    usdtBalance={usdtBalance}
                    tonBalance={tonBalance}
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

          {/* Bottom Navigation для десктопа */}
          <footer className="border-t border-white/20 backdrop-blur-xl bg-background/50 z-50 rounded-t-2xl" style={{ marginBottom: '16px' }}>
            <div className="flex items-center justify-around px-4 py-4 h-20">
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
          {/* Header - только на мобильных, с CryptoLottery.today и аватаром */}
          {isMobile && (
            <header 
              className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/50"
              style={{ 
                paddingTop: `${Math.max(safeAreaTop, 0)}px`
              }}
            >
              <div className="flex items-end gap-3 px-4 py-3 min-h-[160px]">
                {telegramUser && (
                  <>
                    <div
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        triggerHaptic();
                        handleNavigateToProfile();
                      }}
                    >
                      {telegramUser.photo_url && (
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={telegramUser.photo_url} alt={telegramUser.first_name || 'User'} />
                          <AvatarFallback className="text-sm">
                            {telegramUser.first_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                    <div 
                      className="flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        triggerHaptic();
                        handleNavigateToProfile();
                      }}
                    >
                      <h2 className="text-base font-display font-bold truncate">
                        {telegramUser?.first_name} {telegramUser?.last_name || ''}
                      </h2>
                      {user?.anon_id && (
                        <p className="text-xs text-muted-foreground font-mono">ID: {user.anon_id}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </header>
          )}

          {/* Screens Container для мобильных */}
          <div 
            className="relative w-full overflow-hidden"
            style={isMobile ? {
              height: viewport?.height 
                ? `${Math.max(viewport.height - 96 - 160 - Math.max(safeAreaTop, 0) - Math.max(safeAreaBottom, 0) - 16, 0)}px`
                : `calc(100dvh - ${96 + 160 + Math.max(safeAreaTop, 0) + Math.max(safeAreaBottom, 0) + 16}px)`,
              marginTop: `${160 + Math.max(safeAreaTop, 0)}px`,
              overflow: 'hidden',
              maxHeight: viewport?.height 
                ? `${Math.max(viewport.height - 96 - 160 - Math.max(safeAreaTop, 0) - Math.max(safeAreaBottom, 0) - 16, 0)}px`
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
                    cltBalance={cltBalance}
                    usdtBalance={usdtBalance}
                    tonBalance={tonBalance}
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

          {/* Bottom Navigation для мобильных */}
          <footer className="fixed bottom-0 left-0 right-0 border-t border-white/20 backdrop-blur-xl bg-background/50 z-50 rounded-t-2xl" style={{ marginBottom: `${16 + Math.max(safeAreaBottom, 0)}px` }}>
            <div className="flex items-center justify-around px-4 py-4 h-24">
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
        </>
      )}
    </div>
  );
}

