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

const cltPrice = 0.041; // CLT/USDT

export default function Landing() {
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
  
  // TON Connect instance
  const [tonConnect] = useState(() => {
    if (typeof window === 'undefined') return null;
    const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;
    try {
      return new TonConnect({ manifestUrl });
    } catch (error) {
      console.error('Error creating TON Connect instance:', error);
      return null;
    }
  });
  
  const [tonConnectUI] = useState(() => {
    if (typeof window === 'undefined') return null;
    const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;
    try {
      return new TonConnectUI({
        manifestUrl,
        actionsConfiguration: {
          twaReturnUrl: window.location.href
        }
      });
    } catch (error) {
      console.error('Error creating TON Connect UI instance:', error);
      return null;
    }
  });
  
  const [tonWallet, setTonWallet] = useState<any>(null);
  const [telegramUser, setTelegramUser] = useState<any>(null);

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

  const usdBalance = (cltBalance * cltPrice).toFixed(2);

  const getOrCreateUser = async (address: string): Promise<User | null> => {
    if (!supabase) return null;
    
    try {
      const normalizedAddress = address.toLowerCase();
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .ilike('wallet_address', normalizedAddress)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching user:', fetchError);
      }

      if (existingUser) {
        return existingUser as User;
      }

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          wallet_address: normalizedAddress,
          balance: 0,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          const { data: foundUser } = await supabase
            .from('users')
            .select('*')
            .ilike('wallet_address', normalizedAddress)
            .maybeSingle();
          if (foundUser) return foundUser as User;
        }
        return null;
      }

      return newUser as User;
    } catch (error) {
      console.error('Error in getOrCreateUser:', error);
      return null;
    }
  };

  const loadUserTickets = async (address: string) => {
    if (!supabase) return;
    
    try {
      const ownerId = address.toLowerCase();
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

  // Восстановление подключения при загрузке
  useEffect(() => {
    if (!tonConnect) return;

    const restoreConnection = async () => {
      try {
        const wallet = tonConnect.wallet;
        if (wallet) {
          const address = wallet.account.address;
          setTonWallet(wallet);
          setDisconnected(false);
          setWalletAddress(address);
          setIsConnected(true);
          await loadUserData(address);
        }
      } catch (error) {
        console.error('Error restoring connection:', error);
      }
    };

    restoreConnection();

    const unsubscribe = tonConnect.onStatusChange((walletInfo) => {
      if (walletInfo) {
        const address = walletInfo.account.address;
        setTonWallet(walletInfo);
        setDisconnected(false);
        setWalletAddress(address);
        setIsConnected(true);
        setLoading(false);
        loadUserData(address);
      } else {
        setTonWallet(null);
        setWalletAddress('');
        setIsConnected(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnect]);

  const handleConnectWallet = async () => {
    setLoading(true);
    const miniAppUrl = 'https://t.me/cryptolotterytoday_bot/enjoy';
    window.location.href = miniAppUrl;
  };

  const handleDisconnect = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (tonConnect) {
      try {
        await tonConnect.disconnect();
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
    
    const addressToSave = walletAddress;
    if (addressToSave) {
      setDisconnected(true, addressToSave);
    }
    
    setIsConnected(false);
    setWalletAddress('');
    setTelegramId(null);
    setTickets([]);
    setCltBalance(0);
    setTonWallet(null);
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
    if (!isConnected) {
      alert('Please connect your wallet first.');
      return;
    }
    alert('Buy ticket functionality will be implemented here');
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
        {/* Header - логотип слева, кнопка/аватар справа */}
        <header className="sticky top-0 border-b border-border/50 backdrop-blur-xl bg-background/50 z-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto py-2 sm:py-4 flex justify-between items-center gap-2">
              {/* Логотип */}
              <div className="flex items-center gap-2 sm:gap-2 md:gap-3 min-w-0 flex-shrink">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center animate-spin-slow">
                    <Sparkles className="w-5 h-5 sm:w-5 sm:h-5 md:w-5 md:h-5 text-background" />
                  </div>
                </div>
                <h1 className="text-base sm:text-base md:text-lg lg:text-xl font-display font-bold gradient-text leading-tight truncate">
                  <span>CryptoLottery.today</span>
                </h1>
              </div>
              
              {/* Аватар и баланс справа, если подключен */}
              {isConnected ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="neon-border bg-card/50 hover:bg-card border border-primary/30 font-medium gap-1.5 sm:gap-2 px-2 sm:px-3 h-10 sm:h-10 flex-shrink-0"
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {telegramUser?.photo_url && (
                          <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                            <AvatarImage src={telegramUser.photo_url} alt={telegramUser.first_name || 'User'} />
                            <AvatarFallback className="text-xs">
                              {telegramUser.first_name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="text-xs sm:text-xs font-semibold text-neon-gold leading-tight whitespace-nowrap">
                          {isBalanceVisible 
                            ? `${cltBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CLT`
                            : '•••••• CLT'}
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-1.5 pl-1.5 sm:pl-2 border-l border-border/50">
                          <div className="w-2 h-2 sm:w-2 sm:h-2 rounded-full bg-neon-green animate-blink"></div>
                          <span className="text-xs sm:text-xs font-mono hidden sm:inline">{walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : ''}</span>
                        </div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 bg-card border-border/50">
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
                /* Кнопка подключения */
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
                  <p className="text-base md:text-lg font-display text-muted-foreground/80 mb-4">Connect via Telegram to view tickets</p>
                  <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg text-left">
                    <p className="text-sm font-semibold text-primary mb-2">
                      🔗 Connect via Telegram:
                    </p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Tap "Connect via Telegram" button</li>
                      <li>You will be redirected to Telegram mini app</li>
                      <li>Your account will be connected automatically</li>
                      <li>View your tickets and balance</li>
                    </ol>
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
