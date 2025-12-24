import { useState, useEffect } from 'react';
import { Ticket, Trophy, Users, Clock, Sparkles, Zap, ChevronRight, Wallet, Copy, LogOut, Eye, EyeOff, TrendingUp } from 'lucide-react';
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
  }
}

export default function Index() {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [currentDraw] = useState(mockDraw);
  const [loading, setLoading] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(() => {
    const saved = localStorage.getItem('balance_visible');
    return saved !== null ? saved === 'true' : true;
  });
  const [cltBalance, setCltBalance] = useState<number>(0);

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

  // Функция для получения или создания пользователя
  const getOrCreateUser = async (address: string): Promise<User | null> => {
    if (!supabase) {
      console.error('Supabase is not configured');
      return null;
    }
    
    try {
      const normalizedAddress = address.toLowerCase();
      
      // Проверяем, существует ли пользователь (триггер автоматически приведет к нижнему регистру)
      // Но для совместимости со старыми данными ищем без учета регистра
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .ilike('wallet_address', normalizedAddress)
        .maybeSingle();

      if (existingUser) {
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
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          wallet_address: normalizedAddress,
          balance: 0,
        })
        .select()
        .single();

      if (insertError) {
        // Если ошибка из-за дубликата (уникальное ограничение), пытаемся найти существующего
        if (insertError.code === '23505' || insertError.message?.includes('duplicate')) {
          const { data: foundUser } = await supabase
            .from('users')
            .select('*')
            .ilike('wallet_address', normalizedAddress)
            .maybeSingle();
          
          if (foundUser) {
            return foundUser as User;
          }
        }
        console.error('Error creating user:', insertError);
        return null;
      }

      return newUser as User;
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      return null;
    }
  };

  // Функция для загрузки билетов пользователя
  const loadUserTickets = async (address: string) => {
    if (!supabase) {
      console.error('Supabase is not configured');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('owner', address.toLowerCase())
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
      const user = await getOrCreateUser(address);
      if (user) {
        setCltBalance(Number(user.balance));
      }

      await loadUserTickets(address);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Проверка подключения при загрузке
  useEffect(() => {
    const checkConnection = async () => {
      // Если пользователь явно отключился, не подключаем автоматически
      if (wasDisconnected()) {
        return;
      }

      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
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
    if (window.ethereum) {
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

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

  const handleConnectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('MetaMask is not installed. Please install MetaMask to connect your wallet.');
      return;
    }

    try {
      setLoading(true);
      
      // Всегда используем wallet_requestPermissions для явного запроса разрешений
      // Это гарантирует показ диалога выбора аккаунта
      let accounts: string[] = [];
      
      try {
        // Сначала пытаемся запросить разрешения явно
        const permissions = await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
        
        if (permissions && permissions.length > 0) {
          accounts = await window.ethereum.request({
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
        
        accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
      }
      
      if (accounts.length > 0) {
        const address = accounts[0];
        
        // Подключаем кошелек (пользователь явно нажал Connect Wallet)
        setDisconnected(false);
        setWalletAddress(address);
        setIsConnected(true);
        
        // Загружаем данные пользователя из Supabase
        await loadUserData(address);
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

  const handleDisconnect = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Помечаем, что пользователь явно отключился, сохраняя адрес
    setDisconnected(true, walletAddress);
    setIsConnected(false);
    setWalletAddress('');
    setTickets([]);
    setCltBalance(0);
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

  const handleBuyTicket = async () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
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
        <header className="border-b border-border/50 backdrop-blur-xl bg-background/50 sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto py-2 sm:py-4 flex justify-between items-center gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-shrink">
              <div className="relative flex-shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center animate-spin-slow">
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-background" />
                </div>
              </div>
              <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-display font-bold gradient-text leading-tight truncate">
                <span>CryptoLottery.today</span>
              </h1>
            </div>
            
            {isConnected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="neon-border bg-card/50 hover:bg-card border border-primary/30 font-medium gap-1 sm:gap-2 px-2 sm:px-3 h-8 sm:h-10 flex-shrink-0"
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="text-[10px] sm:text-xs font-semibold text-neon-gold leading-tight whitespace-nowrap">
                        {isBalanceVisible 
                          ? `${cltBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CLT`
                          : '•••••• CLT'}
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 pl-1 sm:pl-2 border-l border-border/50">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-neon-green animate-blink"></div>
                        <span className="text-[10px] sm:text-xs font-mono hidden sm:inline">{walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : ''}</span>
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-card border-border/50">
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
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-display font-semibold text-[10px] sm:text-xs md:text-sm glow-purple px-2 sm:px-3 h-8 sm:h-10 flex-shrink-0"
              >
                {loading ? (
                  <>
                    <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span className="hidden sm:inline">Connecting...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
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
                <Card className="glass-card p-8 md:p-12 text-center border border-border/30 hover:border-primary/30 transition-all duration-300">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center mb-2">
                      <Wallet className="w-10 h-10 md:w-12 md:h-12 text-primary/60" />
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-medium text-foreground/90 mb-2">Connect your wallet to view tickets</p>
                      <p className="text-sm md:text-base text-muted-foreground/70">Connect MetaMask to see your NFT lottery tickets</p>
                    </div>
                  </div>
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
