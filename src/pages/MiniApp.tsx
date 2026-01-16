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
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Address } from '@ton/core';
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
  const [giftBalance, setGiftBalance] = useState<number>(0);
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [tonBalance, setTonBalance] = useState<number>(0);
  const [isBalanceVisible, setIsBalanceVisible] = useState(() => {
    const saved = localStorage.getItem('balance_visible');
    return saved !== null ? saved === 'true' : true;
  });
  const [loading, setLoading] = useState(false);
  const [viewport, setViewport] = useState<{ height: number; width: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
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
        // Если нет активного розыгрыша, устанавливаем null
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
    if (!walletAddress) {
      addDebugLog('❌ No wallet address');
      return;
    }

    try {
      // TON API (tonapi.io/v2) accepts user-friendly addresses directly
      // No need to convert to RAW format
      const accountAddress = walletAddress;
      
      addDebugLog(`🔍 Loading balances for: ${accountAddress}`);
      
      // Get TON balance using TON API (tonapi.io/v2)
      const tonApiUrl = 'https://tonapi.io/v2';
      try {
        addDebugLog(`📡 Fetching TON balance...`);
        const tonBalanceResponse = await fetch(`${tonApiUrl}/accounts/${accountAddress}`);
        if (tonBalanceResponse.ok) {
          const tonData = await tonBalanceResponse.json();
          const balanceNano = BigInt(tonData.balance || '0');
          const balanceTon = Number(balanceNano) / 1_000_000_000;
          setTonBalance(balanceTon);
          addDebugLog(`✅ TON balance: ${balanceTon.toFixed(4)} TON`);
          addDebugLog(`💾 State updated: TON = ${balanceTon.toFixed(4)}`);
        } else {
          const errorText = await tonBalanceResponse.text();
          addDebugLog(`❌ Failed to get TON balance: ${tonBalanceResponse.status}`);
          console.error('Failed to get TON balance:', tonBalanceResponse.status, errorText);
        }
      } catch (tonError) {
        addDebugLog(`❌ Error getting TON balance`);
        console.error('Error getting TON balance:', tonError);
      }

      // Get USDT Jetton balance using TON API
      // USDT Jetton master address: EQCxE6mUtQJKFnGfaSdGGbKjgNkQ4mQX6W1n7b7q8j8j4y0r
      const usdtJettonMasterAddress = 'EQCxE6mUtQJKFnGfaSdGGbKjgNkQ4mQX6W1n7b7q8j8j4y0r';
      
      try {
        addDebugLog(`📡 Fetching jettons...`);
        // Get all jettons for this account
        const jettonsResponse = await fetch(
          `${tonApiUrl}/accounts/${accountAddress}/jettons`
        );
        
        if (jettonsResponse.ok) {
          const jettonsData = await jettonsResponse.json();
          const jettons = jettonsData.jettons || jettonsData || [];
          
          addDebugLog(`📦 Found ${jettons.length} jettons`);
          
          if (jettons.length === 0) {
            addDebugLog(`⚠️ No jettons found on this address`);
            addDebugLog(`💡 Check on tonviewer.com: ${accountAddress}`);
          } else {
            // Log all jettons for debugging
            jettons.forEach((j: any, idx: number) => {
              const symbol = j.jetton?.symbol || j.symbol || '?';
              const name = j.jetton?.name || j.name || '?';
              const addr = j.jetton?.address || j.master?.address || j.jetton?.master?.address || '?';
              const balance = j.balance || j.amount || j.quantity || j.jetton?.balance || '0';
              addDebugLog(`  Jetton ${idx + 1}: ${symbol} (${name})`);
              addDebugLog(`    Address: ${addr}`);
              addDebugLog(`    Balance: ${balance}`);
            });
          }
          
          // Find USDT jetton - check all possible fields and formats
          // Extended symbol list: USDT, USD₮, usdt, USDT.e, usdt.e
          const usdtSymbols = ['USDT', 'USD₮', 'usdt', 'USDT.e', 'usdt.e'];
          
          const usdtJetton = jettons.find((jetton: any) => {
            // Check by symbol (extended list)
            const symbol = jetton.jetton?.symbol || jetton.symbol || '';
            if (usdtSymbols.includes(symbol)) {
              addDebugLog(`✅ Found USDT by symbol: ${symbol}`);
              return true;
            }
            
            // Check by name
            const name = (jetton.jetton?.name || jetton.name || '').toLowerCase();
            if (name.includes('usdt') || name.includes('tether')) {
              addDebugLog(`✅ Found USDT by name: ${name}`);
              return true;
            }
            
            // Check by master address
            const masterAddress = jetton.jetton?.address || 
                                 jetton.master?.address || 
                                 jetton.jetton?.master?.address ||
                                 jetton.jetton?.master_address || '';
            
            if (masterAddress) {
              const masterLower = masterAddress.toLowerCase();
              const usdtMasterLower = usdtJettonMasterAddress.toLowerCase();
              
              // Check if addresses match (full or partial)
              if (masterLower === usdtMasterLower || 
                  masterLower.includes(usdtMasterLower.slice(-20)) ||
                  usdtMasterLower.includes(masterLower.slice(-20))) {
                addDebugLog(`✅ Found USDT by master address: ${masterAddress}`);
                return true;
              }
            }
            
            return false;
          });
          
          if (usdtJetton) {
            addDebugLog(`✅ USDT jetton found!`);
            
            // Balance can be in different fields - check all possibilities
            const balance = usdtJetton.balance || 
                           usdtJetton.amount || 
                           usdtJetton.quantity ||
                           usdtJetton.jetton?.balance ||
                           usdtJetton.jetton?.amount ||
                           '0';
            
            addDebugLog(`📊 Raw USDT balance: ${balance}`);
            
            // USDT has 6 decimals (1 USDT = 1,000,000 units)
            const balanceUnits = BigInt(balance.toString());
            const balanceUsdt = Number(balanceUnits) / 1_000_000;
            addDebugLog(`✅ USDT balance: ${balanceUsdt.toFixed(6)} USDT`);
            setUsdtBalance(balanceUsdt);
            addDebugLog(`💾 State updated: USDT = ${balanceUsdt.toFixed(6)}`);
          } else {
            addDebugLog(`❌ USDT jetton not found in ${jettons.length} jettons`);
            setUsdtBalance(0);
          }
        } else {
          const errorText = await jettonsResponse.text();
          addDebugLog(`❌ Failed to get jettons: ${jettonsResponse.status}`);
          console.error('Failed to get jettons:', jettonsResponse.status, errorText);
          setUsdtBalance(0);
        }
      } catch (jettonError) {
        addDebugLog(`❌ Error loading USDT balance`);
        console.error('Error loading USDT balance:', jettonError);
        // Don't reset to 0 on error, keep previous value
      }
    } catch (error) {
      addDebugLog(`❌ Error loading wallet balances`);
      console.error('Error loading wallet balances:', error);
      // Don't reset balances on error, keep previous values
    }
  }, [walletAddress, addDebugLog]);

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
    // Check both walletAddress state and tonConnectUI.connected to ensure consistency
    if (!walletAddress || (!tonConnectUI.connected && !tonConnectUI.wallet?.account?.address)) {
      // Use standard TON Connect UI to open wallet selection modal
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
      const maxAttempts = 100; // 5 seconds (100 * 50ms)
      
      while (!connectionEstablished && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
        
        // Check if modal was opened
        if (tonConnectUI.modalState === 'opened') {
          modalWasOpened = true;
        }
        
        // Check if connection was established
        if (tonConnectUI.connected && tonConnectUI.wallet?.account?.address) {
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
      if (tonConnectUI.connected && tonConnectUI.wallet?.account?.address) {
        const address = tonConnectUI.wallet.account.address;
        setWalletAddress(address);
        await loadWalletBalances();
        
        // After successful connection from Buy Ticket, check USDT balance
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
        addDebugLog(`💰 Checking USDT balance: ${currentUsdtBalance.toFixed(6)} USDT (min: ${minUsdtBalance})`);
        
        // Check USDT balance
        if (currentUsdtBalance < minUsdtBalance) {
          addDebugLog(`❌ Insufficient balance: ${currentUsdtBalance.toFixed(6)} < ${minUsdtBalance}`);
          setLoading(false);
          const openPurchase = confirm(
            `Insufficient USDT balance. You need at least ${minUsdtBalance} USDT to buy a ticket.\n\nYour current balance: ${currentUsdtBalance.toFixed(6)} USDT\n\nWould you like to open the USDT purchase page?`
          );
          
          if (openPurchase && WebApp) {
            // Open wallet app with top up button
            // Using TON wallet deep link to open wallet with top up
            const walletUrl = 'ton://transfer'; // Opens wallet with transfer/top up
            
            // Try to open via Telegram Wallet or deep link
            if (WebApp.openTelegramLink) {
              // Use Telegram Wallet link
              WebApp.openTelegramLink('https://t.me/wallet?startattach=topup');
            } else if (WebApp.openLink) {
              // Try deep link first, fallback to web
              try {
                window.location.href = walletUrl;
                // Fallback after timeout
                setTimeout(() => {
                  WebApp.openLink('https://wallet.ton.org/');
                }, 1000);
              } catch (e) {
                WebApp.openLink('https://wallet.ton.org/');
              }
            } else {
              // Fallback
              window.open('https://wallet.ton.org/', '_blank');
            }
          }
          return;
        }
        
        // Continue with purchase
      } else {
        setLoading(false);
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

      // Check USDT balance (if wallet was already connected)
      const minUsdtBalance = 1.1;
      addDebugLog(`💰 Checking USDT balance: ${usdtBalance.toFixed(6)} USDT (min: ${minUsdtBalance})`);
      
      // Reload balances before check
      if (walletAddress) {
        await loadWalletBalances();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const currentUsdtBalance = usdtBalance;
      addDebugLog(`💰 Current USDT balance after reload: ${currentUsdtBalance.toFixed(6)} USDT`);
      
      if (currentUsdtBalance < minUsdtBalance) {
        addDebugLog(`❌ Insufficient balance: ${currentUsdtBalance.toFixed(6)} < ${minUsdtBalance}`);
        setLoading(false);
        const openPurchase = confirm(
          `Insufficient USDT balance. You need at least ${minUsdtBalance} USDT to buy a ticket.\n\nYour current balance: ${currentUsdtBalance.toFixed(6)} USDT\n\nWould you like to open the USDT purchase page?`
        );
        
        if (openPurchase) {
          // Open wallet app with top up button
          const walletUrl = 'ton://transfer';
          
          if (WebApp.openTelegramLink) {
            WebApp.openTelegramLink('https://t.me/wallet?startattach=topup');
          } else if (WebApp.openLink) {
            try {
              window.location.href = walletUrl;
              setTimeout(() => {
                WebApp.openLink('https://wallet.ton.org/');
              }, 1000);
            } catch (e) {
              WebApp.openLink('https://wallet.ton.org/');
            }
          } else {
            window.open('https://wallet.ton.org/', '_blank');
          }
        }
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
  }, [walletAddress, telegramId, tonBalance, usdtBalance, loadWalletBalances]);

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
    if (tonConnectUI.connected && tonConnectUI.wallet?.account?.address) {
      const address = tonConnectUI.wallet.account.address;
      setWalletAddress(address);
      await loadWalletBalances();
      return;
    }

    try {
      setLoading(true);
      
      // Use standard TON Connect UI to open wallet selection modal
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
      const maxAttempts = 100; // 5 seconds (100 * 50ms)
      
      while (!connectionEstablished && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
        
        // Check if modal was opened
        if (tonConnectUI.modalState === 'opened') {
          modalWasOpened = true;
        }
        
        // Check if connection was established
        if (tonConnectUI.connected && tonConnectUI.wallet?.account?.address) {
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
      if (tonConnectUI.connected && tonConnectUI.wallet?.account?.address) {
        const address = tonConnectUI.wallet.account.address;
        setWalletAddress(address);
        await loadWalletBalances();
        // Force re-render by updating state
        setLoading(false);
        // Small delay to ensure state updates propagate
        await new Promise(resolve => setTimeout(resolve, 100));
      } else if (!connectionEstablished) {
        setLoading(false);
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
    const isInTelegram = isInTelegramWebApp();
    const WebApp = (window as any).Telegram?.WebApp;
    
    // Если не в Telegram, устанавливаем десктопный режим
    if (!isInTelegram || !WebApp) {
      // Определяем, мобильное ли устройство по размеру экрана
      const isMobileDevice = window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
      
      // Устанавливаем viewport для десктопа
      if (!isMobileDevice) {
        setViewport({ height: window.innerHeight, width: window.innerWidth });
      }
      
      // Загружаем активный розыгрыш даже вне Telegram
      loadActiveDraw();
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

  // Sync wallet connection state with tonConnectUI
  useEffect(() => {
    const checkConnection = () => {
      if (tonConnectUI.connected && tonConnectUI.wallet?.account?.address) {
        const address = tonConnectUI.wallet.account.address;
        if (address !== walletAddress) {
          setWalletAddress(address);
          loadWalletBalances();
        }
      } else if (!tonConnectUI.connected && walletAddress) {
        // Wallet disconnected
        setWalletAddress(null);
        setGiftBalance(0);
        setUsdtBalance(0);
        setTonBalance(0);
      }
    };

    // Check immediately
    checkConnection();

    // Subscribe to connection status changes
    const unsubscribe = tonConnectUI.onStatusChange((wallet) => {
      checkConnection();
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI.connected, tonConnectUI.wallet, walletAddress, loadWalletBalances]);

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
        
        // Если пользователь не начал диалог с ботом, показываем подсказку
        if (responseData.details?.error_code === 403 || 
            responseData.details?.description?.includes('bot was blocked') ||
            responseData.details?.description?.includes('chat not found')) {
          console.warn('User needs to start a conversation with the bot first. Please send /start to @giftdrawtoday_bot');
          // Можно показать уведомление пользователю
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
      
      // Отключаем кошелек если подключен
      if (tonConnectUI.connected) {
        try {
          await tonConnectUI.disconnect();
        } catch (error) {
          console.error('Error disconnecting wallet:', error);
        }
      }
      
      // Очищаем cookie сессии через API
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Error clearing session:', error);
      }
      
      // Очищаем localStorage
      localStorage.removeItem('balance_visible');
      
      // Устанавливаем флаг, что пользователь только что разлогинился
      // Это предотвратит проверку сессии при следующей загрузке
      localStorage.setItem('just_logged_out', 'true');
      
      // Немедленно перезагружаем страницу без изменения состояния
      // Состояние очистится при перезагрузке
      window.location.replace('/');
    } catch (error) {
      console.error('Error during logout:', error);
      // В случае ошибки все равно перезагружаем страницу
      window.location.replace('/');
    }
  }, [tonConnectUI]);

  // Handle authorization through bot
  const handleConnectViaBot = useCallback(async () => {
    // Генерируем длинный числовой идентификатор для отслеживания запроса авторизации
    // Это не токен, а просто маркер того, что запрос пришел с сайта
    // Используем timestamp + случайные цифры для уникальности
    const timestamp = Date.now().toString();
    const randomDigits = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    const authId = timestamp + randomDigits;
    
    // В новой системе открываем бота с параметром auth, логин произойдет при /start
    const botUrl = `https://t.me/giftdrawtoday_bot?start=${authId}`;
    
    // Используем прямой переход - это гарантирует автоматическую отправку /start
    // При первом открытии бота Telegram автоматически отправляет команду /start с параметром из URL
    // Не устанавливаем loading, так как переход происходит мгновенно
    window.location.href = botUrl;
  }, []);

  // Initialize user from Telegram WebApp (if in Telegram)
  useEffect(() => {
    // Если пользователь уже авторизован, не делаем ничего
    if (telegramUser) return;

    // Если уже в Telegram WebApp, используем существующие данные напрямую
    if (isInTelegramWebApp()) {
      const WebApp = (window as any).Telegram?.WebApp;
      if (WebApp?.initDataUnsafe?.user) {
        const user = WebApp.initDataUnsafe.user;
        setTelegramUser(user);
        if (user.id) {
          setTelegramId(user.id);
          loadUserData(user.id);
          
          // Запрашиваем разрешение на отправку сообщений
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

    // Проверяем сессию из cookie (для авторизации через бота)
    let lastSessionCheck = 0;
    const SESSION_CHECK_COOLDOWN = 3000; // Минимум 3 секунды между проверками
    
    const checkSession = async () => {
      // Не проверяем сессию если пользователь только что разлогинился
      const justLoggedOut = localStorage.getItem('just_logged_out');
      if (justLoggedOut === 'true') {
        localStorage.removeItem('just_logged_out');
        return false;
      }
      
      // Ограничиваем частоту проверок
      const now = Date.now();
      if (now - lastSessionCheck < SESSION_CHECK_COOLDOWN) {
        return false;
      }
      lastSessionCheck = now;
      
      try {
        // Проверяем cookie через API endpoint
        const response = await fetch('/api/auth/check-session', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.authenticated && data.userId) {
            // Восстанавливаем данные пользователя из сессии
            setTelegramUser({
              id: data.userId,
              first_name: data.firstName || '',
              last_name: data.lastName || '',
              username: data.username || '',
              photo_url: data.avatarUrl || undefined,
            });
            setTelegramId(data.userId);
            await loadUserData(data.userId);
            return true; // Сессия найдена
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
      return false; // Сессия не найдена
    };

    // Проверяем сессию сразу при загрузке (только один раз)
    checkSession();
      
    // Проверяем сессию при видимости страницы (когда пользователь возвращается на вкладку)
    // Используем только visibilitychange, так как focus может срабатывать слишком часто
    const handleVisibilityChange = async () => {
      // Не проверяем сессию если пользователь только что разлогинился
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
            <div className="px-4 py-4 min-h-[60px] flex justify-between items-center gap-3">
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
              
              {/* Кнопка подключения через бота или иконка выхода */}
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
                    giftBalance={giftBalance}
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
          {/* Header - только на мобильных, с логотипом и кнопкой подключения */}
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
                
                {/* Кнопка подключения через бота или иконка выхода */}
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

          {/* Screens Container для мобильных */}
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
            <div className="flex items-center justify-around px-4 h-[66px]">
              {/* About Button (Left) */}
              <Button
                variant="ghost"
                size="lg"
                className="flex flex-col items-center justify-center gap-1 h-full hover:bg-transparent hover:text-inherit active:bg-transparent"
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
                className="flex flex-col items-center justify-center gap-1 h-full hover:bg-transparent hover:text-inherit active:bg-transparent"
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
                className="flex flex-col items-center justify-center gap-1 h-full hover:bg-transparent hover:text-inherit active:bg-transparent"
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

