import { useState, useEffect } from 'react';
import { Ticket, Sparkles, ChevronRight, Copy, LogOut, Eye, EyeOff } from 'lucide-react';
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

// Mock data for demonstration
const mockDraw = {
  id: 42,
  prize_pool: 125000,
  jackpot: 50000,
  participants: 847,
  end_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
};

const cltPrice = 0.041; // CLT/USDT

export default function MiniApp() {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [currentDraw] = useState(mockDraw);
  const [loading, setLoading] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(() => {
    const saved = localStorage.getItem('balance_visible');
    return saved !== null ? saved === 'true' : true;
  });
  const [cltBalance, setCltBalance] = useState<number>(0);
  const [telegramUser, setTelegramUser] = useState<any>(null);

  const wasDisconnected = () => {
    return localStorage.getItem('wallet_disconnected') === 'true';
  };

  const setDisconnected = (value: boolean) => {
    if (value) {
      localStorage.setItem('wallet_disconnected', 'true');
    } else {
      localStorage.removeItem('wallet_disconnected');
    }
  };

  const usdBalance = (cltBalance * cltPrice).toFixed(2);

  const getOrCreateUserByTelegramId = async (telegramId: number): Promise<User | null> => {
    if (!supabase) {
      const errorMsg = 'Supabase is not configured.';
      console.error(errorMsg);
      throw new Error(errorMsg);
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

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId,
          balance: 0,
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
        throw new Error(`Failed to create user: ${insertError.message}`);
      }

      return newUser as User;
    } catch (error: any) {
      console.error('Error in getOrCreateUserByTelegramId:', error);
      throw error;
    }
  };

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

  const loadUserData = async (telegramId: number) => {
    try {
      const user = await getOrCreateUserByTelegramId(telegramId);
      if (user) {
        setCltBalance(Number(user.balance));
      }
      await loadUserTickets(telegramId);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Автоматическое подключение при загрузке
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tg = (window as any).Telegram?.WebApp || window.telegram?.WebApp;
    if (!tg) return;

    try {
      tg.ready();
      
      const expandApp = () => {
        if (tg.expand) {
          try {
            tg.expand();
          } catch (e) {
            console.error('Error expanding:', e);
          }
        }
      };
      
      expandApp();
      setTimeout(expandApp, 100);
      setTimeout(expandApp, 300);
      setTimeout(expandApp, 500);
      setTimeout(expandApp, 1000);
      
      if (tg.disableVerticalSwipes) {
        try {
          tg.disableVerticalSwipes();
        } catch (e) {
          console.warn('disableVerticalSwipes not supported:', e);
        }
      }
      
      if (tg.setHeaderColor) {
        try {
          tg.setHeaderColor('transparent');
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
      
      const resizeHandler = () => {
        setTimeout(() => expandApp(), 100);
      };
      window.addEventListener('resize', resizeHandler);
      
      const focusHandler = () => {
        setTimeout(() => expandApp(), 200);
      };
      window.addEventListener('focus', focusHandler);
    } catch (error) {
      console.error('Error initializing Telegram WebApp:', error);
    }

    const connectUser = async () => {
      let user = tg.initDataUnsafe?.user;
      
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
                // Ignore
              }
            }
          }
        } catch (e) {
          // Ignore
        }
      }
      
      if (user && user.id) {
        setTelegramUser(user);
        setTelegramId(user.id);
        
        try {
          const savedUser = await getOrCreateUserByTelegramId(user.id);
          if (savedUser) {
            if (!wasDisconnected()) {
              setIsConnected(true);
              setDisconnected(false);
              await loadUserData(user.id);
            }
          }
        } catch (err: any) {
          console.error('Error saving user:', err);
        }
      }
    };

    connectUser();
  }, []);

  const handleDisconnect = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const idToSave = telegramId;
    if (idToSave) {
      setDisconnected(true);
    }
    
    setIsConnected(false);
    setWalletAddress('');
    setTelegramId(null);
    setTickets([]);
    setCltBalance(0);
  };

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleEnterDraw = () => {
    alert('Ticket selection modal will open here');
  };

  const handleBuyTicket = async () => {
    if (!isConnected || !telegramId) {
      alert('Please connect your wallet first.');
      return;
    }
    
    try {
      setLoading(true);
      const tg = window.telegram?.WebApp;
      if (!tg) {
        alert('Please open this site in Telegram to buy tickets.');
        setLoading(false);
        return;
      }
      
      const ticketCount = 1;
      const pricePerTicket = 1;
      const totalPrice = ticketCount * pricePerTicket;
      const lotteryWalletAddress = 'YOUR_LOTTERY_WALLET_ADDRESS';
      
      if (tg.platform === 'web' || tg.platform === 'ios' || tg.platform === 'android') {
        tg.openInvoice({
          url: `https://t.me/wallet?startattach=invoice&invoice=${encodeURIComponent(JSON.stringify({
            currency: 'USD',
            prices: [{
              label: `${ticketCount} Ticket(s)`,
              amount: (totalPrice * 100).toString()
            }],
            provider_token: '',
            payload: JSON.stringify({
              telegram_id: telegramId,
              ticket_count: ticketCount,
              lottery_address: lotteryWalletAddress
            })
          }))}`
        }, (status: string) => {
          if (status === 'paid') {
            createTicketsAfterPayment(ticketCount, telegramId);
          } else {
            setLoading(false);
          }
        });
      } else {
        alert('Telegram Wallet is not available. Please use Telegram app.');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error buying ticket:', error);
      alert('Failed to process payment. Please try again.');
      setLoading(false);
    }
  };
  
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

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <div className="min-h-screen">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10">
        {/* Header - только аватар и баланс слева */}
        <header className={`border-b border-border/50 backdrop-blur-xl bg-background/50 z-50 ${
          isMobile ? 'fixed top-0 left-0 right-0' : 'sticky top-0'
        }`}>
          <div className="container mx-auto px-4">
            <div className={`max-w-4xl mx-auto py-4 min-h-[60px] flex justify-start items-center gap-2`}>
              {isConnected && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="neon-border bg-card/50 hover:bg-card border border-primary/30 font-medium gap-1.5 sm:gap-2 px-2 sm:px-3 h-9 text-xs flex-shrink-0"
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {telegramUser?.photo_url && (
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={telegramUser.photo_url} alt={telegramUser.first_name || 'User'} />
                            <AvatarFallback className="text-xs">
                              {telegramUser.first_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="text-[10px] font-semibold text-neon-gold leading-tight whitespace-nowrap">
                          {isBalanceVisible 
                            ? `${cltBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CLT`
                            : '•••••• CLT'}
                        </div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 bg-card border-border/50">
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
                    {walletAddress && (
                      <DropdownMenuItem 
                        onClick={handleCopyAddress}
                        className="cursor-pointer"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Address
                      </DropdownMenuItem>
                    )}
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
              )}
            </div>
          </div>
        </header>

        {isMobile && <div className="h-[60px]" />}

        <main className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Current Draw Card */}
            {currentDraw && (
              <Card className="glass-card overflow-hidden relative group">
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
                  <p className="text-base md:text-lg font-display text-muted-foreground/80 mb-4">Connecting...</p>
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
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-lg font-bold">#{ticket.id}</span>
                            <Badge variant="outline" className={`capitalize ${getTicketTypeColor(ticket.type)} border-current/30`}>
                              {ticket.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">NFT Lottery Ticket</p>
                        </div>

                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(ticket.status)} font-medium hidden sm:flex`}
                        >
                          {getStatusLabel(ticket.status)}
                        </Badge>

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
          </div>
        </main>
      </div>
    </div>
  );
}

