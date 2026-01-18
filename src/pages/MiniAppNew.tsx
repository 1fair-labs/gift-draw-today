// src/pages/MiniAppNew.tsx - New Mini App architecture
import { useState, useEffect, useRef, useCallback } from 'react';
import { Wallet, Ticket, Sparkles, ChevronRight } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase, type User, type Ticket as TicketType } from '@/lib/supabase';
import { isInTelegramWebApp } from '@/lib/telegram';
import { initTonConnect, getWalletAddress, isWalletConnected, tonConnect } from '@/lib/tonconnect';
import HomeScreen from './miniapp/HomeScreen';
import TicketsScreen from './miniapp/TicketsScreen';
import ProfileScreen from './miniapp/ProfileScreen';

// Mock data for demonstration
const mockDraw = {
  id: 42,
  prize_pool: 125000,
  jackpot: 50000,
  participants: 847,
  end_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
};

type Screen = 'home' | 'tickets' | 'profile';

export default function MiniAppNew() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
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
  
  // Swipe handling
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Check and refresh avatar if needed
  const checkAndRefreshAvatar = async (telegramId: number, avatarUrl: string | null | undefined) => {
    if (!avatarUrl) return null;
    
    // Если это URL Supabase Storage, он всегда валиден
    if (avatarUrl.includes('supabase.co') || avatarUrl.includes('supabase.in')) {
      return avatarUrl;
    }
    
    // Если это URL Telegram API, проверяем валидность
    try {
      const response = await fetch(avatarUrl, { method: 'HEAD' });
      if (response.ok) {
        return avatarUrl;
      }
    } catch (error) {
      console.log('Avatar URL is invalid, refreshing...');
    }
    
    // URL невалиден, обновляем аватар
    try {
      const refreshResponse = await fetch('/api/auth/refresh-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegramId }),
      });
      
      if (refreshResponse.ok) {
        const { avatarUrl: newAvatarUrl } = await refreshResponse.json();
        return newAvatarUrl;
      }
    } catch (error) {
      console.error('Error refreshing avatar:', error);
    }
    
    return null;
  };

  // Load user data
  const loadUserData = async (telegramId: number) => {
    try {
      const userData = await getOrCreateUserByTelegramId(telegramId);
      if (userData) {
        // Проверяем и обновляем аватар если нужно
        const validAvatarUrl = await checkAndRefreshAvatar(telegramId, userData.avatar_url);
        
        // Обновляем userData с валидным аватаром если он был обновлен
        const updatedUserData = validAvatarUrl && validAvatarUrl !== userData.avatar_url
          ? { ...userData, avatar_url: validAvatarUrl }
          : userData;
        
        // Обновляем telegramUser с валидным аватаром
        if (validAvatarUrl) {
          setTelegramUser((prev: any) => ({
            ...prev,
            photo_url: validAvatarUrl,
          }));
        }
        
        setUser(updatedUserData);
        setCltBalance(Number(updatedUserData.balance));
      }
      await loadUserTickets(telegramId);
    } catch (error) {
      console.error('Error loading user data:', error);
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
    if (!walletAddress) {
      // Switch to profile screen to connect wallet
      setCurrentScreen('profile');
      return;
    }

    if (!telegramId) {
      alert('Please connect via Telegram first.');
      return;
    }

    try {
      setLoading(true);
      const WebApp = (window as any).Telegram?.WebApp;
      if (!WebApp || !isInTelegramWebApp()) {
        alert('Please open this site in Telegram to buy tickets.');
        setLoading(false);
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
      
      // Switch to tickets screen
      setCurrentScreen('tickets');
    } catch (error: any) {
      console.error('Error buying ticket:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, telegramId, tonBalance]);

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
    try {
      setLoading(true);
      await initTonConnect();
      
      // Request connection
      const walletsList = await tonConnect.getWallets();
      const wallet = walletsList.find(w => w.name.toLowerCase().includes('telegram'));
      
      if (!wallet) {
        alert('Telegram Wallet not found. Please install Telegram Wallet.');
        setLoading(false);
        return;
      }

      const connectionSource = {
        bridgeUrl: wallet.bridgeUrl,
        universalLink: wallet.universalLink,
      };

      await tonConnect.connect(connectionSource);
      
      const address = getWalletAddress();
      if (address) {
        setWalletAddress(address);
        await loadWalletBalances();
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swipe left - next screen
        if (currentScreen === 'home') setCurrentScreen('tickets');
        else if (currentScreen === 'tickets') setCurrentScreen('profile');
      } else {
        // Swipe right - previous screen
        if (currentScreen === 'profile') setCurrentScreen('tickets');
        else if (currentScreen === 'tickets') setCurrentScreen('home');
      }
    }
    
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Initialize Telegram WebApp
  useEffect(() => {
    if (!isInTelegramWebApp()) {
      console.warn('MiniApp rendered outside Telegram — this should not happen.');
      return;
    }

    const WebApp = (window as any).Telegram?.WebApp;
    if (!WebApp) return;

    try {
      WebApp.ready();

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

      if (WebApp.onEvent) {
        WebApp.onEvent('viewportChanged', () => {
          setTimeout(expandToFullscreen, 100);
          if (WebApp.viewportHeight) {
            setViewport({ height: WebApp.viewportHeight, width: WebApp.viewportWidth || window.innerWidth });
          }
        });
      }

      if (WebApp.viewportHeight) {
        setViewport({ height: WebApp.viewportHeight, width: WebApp.viewportWidth || window.innerWidth });
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

  // Handle navigation from buttons
  const handleNavigateToTickets = () => {
    setCurrentScreen('tickets');
    if (tickets.length === 0) {
      // Focus on buy ticket if no tickets
      setTimeout(() => {
        handleBuyTicket();
      }, 100);
    }
  };

  const handleNavigateToProfile = () => {
    setCurrentScreen('profile');
  };

  const handleNavigateToHome = () => {
    setCurrentScreen('home');
  };

  const screenHeight = viewport?.height || window.innerHeight;

  return (
    <div 
      className="h-screen w-full overflow-hidden bg-background"
      style={{ height: `${screenHeight}px` }}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-xl bg-background/50 z-50 fixed top-0 left-0 right-0">
        <div className="px-4 py-3 min-h-[60px] flex justify-start items-center gap-2">
          {telegramUser && (
            <div className="flex items-center gap-2">
              {telegramUser.photo_url && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={telegramUser.photo_url} alt={telegramUser.first_name || 'User'} />
                  <AvatarFallback className="text-xs">
                    {telegramUser.first_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="text-xs font-semibold text-neon-gold">
                {isBalanceVisible 
                  ? `${cltBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CLT`
                  : '•••••• CLT'}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Screens Container */}
      <div 
        className="relative flex transition-transform duration-300 ease-in-out"
        style={{
          transform: `translateX(-${currentScreen === 'home' ? 0 : currentScreen === 'tickets' ? 100 : 200}%)`,
          width: '300%',
          height: `calc(100% - 60px - 80px)`,
          marginTop: '60px',
        }}
      >
        <div className="w-1/3 flex-shrink-0">
          <HomeScreen 
            currentDraw={mockDraw}
            onEnterDraw={handleNavigateToTickets}
          />
        </div>
        <div className="w-1/3 flex-shrink-0">
          <TicketsScreen
            tickets={tickets}
            onEnterDraw={handleEnterDraw}
            onBuyTicket={handleBuyTicket}
            loading={loading}
          />
        </div>
        <div className="w-1/3 flex-shrink-0">
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
      </div>

      {/* Bottom Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-border/50 backdrop-blur-xl bg-background/50 z-50">
        <div className="flex items-center justify-around px-4 py-3 h-20">
          {/* Balance Button (Left) */}
          <Button
            variant="ghost"
            size="lg"
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={handleNavigateToProfile}
          >
            <Wallet className={`w-5 h-5 ${currentScreen === 'profile' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-xs ${currentScreen === 'profile' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
              Balance
            </span>
          </Button>

          {/* Enter Draw Button (Center - Large and Round) */}
          <Button
            size="lg"
            className="rounded-full w-16 h-16 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-display font-bold glow-purple shadow-lg"
            onClick={handleNavigateToTickets}
          >
            <Sparkles className="w-6 h-6" />
          </Button>

          {/* Buy Ticket Button (Right) */}
          <Button
            variant="ghost"
            size="lg"
            className="flex flex-col items-center gap-1 h-auto py-2"
            onClick={handleBuyTicket}
            disabled={loading}
          >
            <Ticket className={`w-5 h-5 ${loading ? 'text-muted-foreground' : 'text-muted-foreground'}`} />
            <span className="text-xs text-muted-foreground">Buy</span>
          </Button>
        </div>
      </footer>
    </div>
  );
}

