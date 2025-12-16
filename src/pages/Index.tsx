import { useState } from 'react';
import { Sparkles, Trophy, Users, Zap, Ticket, Clock, TrendingUp, ChevronRight, Shield, Send, Gift, Star, Heart, Crown, Gem } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from '@/components/CountdownTimer';
import { WalletButton } from '@/components/WalletButton';
import { PriceChart } from '@/components/PriceChart';

// Mock data - replace with real data from Supabase/wagmi
const CLT_USDT_RATE = 0.002; // 1 CLT = 0.002 USDT

const mockDraw = {
  id: 42,
  prizePoolClt: 7710000, // in CLT
  jackpotClt: 2500000, // in CLT
  participants: 892,
};

// Convert CLT to USDT
const cltToUsdt = (clt: number) => (clt * CLT_USDT_RATE).toFixed(0);

const mockTickets = [
  { id: 'T-001', type: 'legendary', status: 'in_draw', image: '' },
  { id: 'T-002', type: 'event', status: 'available', image: '' },
  { id: 'T-003', type: 'common', status: 'available', image: '' },
];

export default function Index() {
  const [isConnected, setIsConnected] = useState(false);
  const [userBalance] = useState(78500); // CLT balance
  const [tickets] = useState(mockTickets);
  const [loading, setLoading] = useState(false);
  const [telegramConnected, setTelegramConnected] = useState(false);

  const handleConnect = () => setIsConnected(true);
  const handleDisconnect = () => setIsConnected(false);

  const handleEnterDraw = () => {
    alert('Ticket selection modal will open here');
  };

  const handleBuyTicket = async () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const handleConnectTelegram = () => {
    setTelegramConnected(true);
  };

  const handleShareTelegram = () => {
    const refLink = `https://cryptolottery.today/ref/abc123`;
    const text = encodeURIComponent(`🎰 Join CryptoLottery.today and get a FREE GIFT ticket! Top 25% win prizes daily!\n\n${refLink}`);
    window.open(`https://t.me/share/url?url=${refLink}&text=${text}`, '_blank');
  };

  const getStatusLabel = (status: string) => {
    if (status === 'available') return 'Available';
    if (status === 'in_draw') return 'In Draw';
    return status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'in_draw') return 'bg-neon-green/20 text-neon-green border-neon-green/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getTicketTypeColor = (type: string) => {
    switch (type) {
      case 'legendary': return 'text-neon-gold';
      case 'event': return 'text-neon-purple';
      case 'common': return 'text-foreground/80';
      case 'ref': return 'text-neon-cyan';
      case 'gift': return 'text-neon-pink';
      default: return 'text-foreground';
    }
  };

  const getTicketGradient = (type: string) => {
    switch (type) {
      case 'legendary': return 'bg-gradient-to-br from-yellow-400 to-amber-600';
      case 'event': return 'bg-gradient-to-br from-purple-500 to-pink-500';
      case 'common': return 'bg-gradient-to-br from-gray-400 to-gray-600';
      case 'ref': return 'bg-gradient-to-br from-cyan-400 to-blue-500';
      case 'gift': return 'bg-gradient-to-br from-pink-400 to-rose-500';
      default: return 'bg-gradient-to-br from-gray-400 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-neon-purple/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-neon-cyan/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-md bg-background/80 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center animate-spin-slow">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="font-display font-bold text-xl bg-gradient-to-r from-neon-gold via-neon-pink to-neon-cyan bg-clip-text text-transparent">
                CryptoLottery.today
              </h1>
            </div>

            <WalletButton
              isConnected={isConnected}
              address="0x742d35Cc6634C0532925a3b844Bc9e7595f8dE7a"
              balance={userBalance}
              cltPrice={CLT_USDT_RATE}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          {/* Stats Grid - 4 blocks */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="glass-card p-4 text-center">
              <Zap className="w-6 h-6 text-neon-cyan mx-auto mb-2" />
              <div className="text-lg md:text-xl font-display font-bold text-neon-cyan">
                {mockDraw.prizePoolClt.toLocaleString()} CLT
              </div>
              <div className="text-xs text-muted-foreground">
                ≈ ${cltToUsdt(mockDraw.prizePoolClt)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Total Pool</div>
            </Card>

            <Card className="glass-card p-4 text-center">
              <Users className="w-6 h-6 text-neon-pink mx-auto mb-2" />
              <div className="text-lg md:text-xl font-display font-bold text-neon-pink">
                {mockDraw.participants}
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.floor(mockDraw.participants * 0.25)} winners
              </div>
              <div className="text-xs text-muted-foreground mt-1">Players</div>
            </Card>

            <Card className="glass-card p-4 text-center">
              <Shield className="w-6 h-6 text-neon-green mx-auto mb-2" />
              <div className="text-sm md:text-base font-display font-bold text-neon-green">
                Chainlink VRF
              </div>
              <div className="text-xs text-muted-foreground">
                Verified Random
              </div>
              <div className="text-xs text-muted-foreground mt-1">Fair Lottery</div>
            </Card>

            <Card className="glass-card p-4 text-center">
              <TrendingUp className="w-6 h-6 text-neon-gold mx-auto mb-2" />
              <div className="text-lg md:text-xl font-display font-bold text-neon-gold">
                ${CLT_USDT_RATE}
              </div>
              <div className="text-xs text-muted-foreground">
                1 CLT = ${CLT_USDT_RATE}
              </div>
              <div className="text-xs text-muted-foreground mt-1">CLT Price</div>
            </Card>
          </section>

          {/* Current Draw */}
          <Card className="glass-card neon-border p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-display font-bold text-foreground">
                Draw #{mockDraw.id}
              </h3>
              <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30 animate-pulse">
                LIVE
              </Badge>
            </div>

            {/* Timer inside draw block */}
            <div className="mb-6 p-4 rounded-xl bg-background/50 border border-border/50">
              <p className="text-sm text-muted-foreground mb-3 text-center">Next draw at 23:59 GMT</p>
              <CountdownTimer />
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-background/50 text-center">
                <span className="text-sm text-muted-foreground block mb-1">Prize Pool</span>
                <span className="font-bold text-lg text-neon-cyan">{mockDraw.prizePoolClt.toLocaleString()} CLT</span>
                <div className="text-xs text-muted-foreground">≈ ${cltToUsdt(mockDraw.prizePoolClt)}</div>
              </div>

              <div className="p-4 rounded-lg bg-background/50 text-center">
                <span className="text-sm text-muted-foreground block mb-1">Jackpot</span>
                <span className="font-bold text-lg text-neon-gold">{mockDraw.jackpotClt.toLocaleString()} CLT</span>
                <div className="text-xs text-muted-foreground">≈ ${cltToUsdt(mockDraw.jackpotClt)}</div>
              </div>

              <div className="p-4 rounded-lg bg-background/50 text-center">
                <span className="text-sm text-muted-foreground block mb-1">Ticket Price</span>
                <span className="font-bold text-lg text-foreground">{(1 / CLT_USDT_RATE).toLocaleString()} CLT</span>
                <div className="text-xs text-muted-foreground">= $1 USDT</div>
              </div>
            </div>

            <Button 
              onClick={handleEnterDraw}
              className="w-full py-6 text-lg font-bold bg-gradient-to-r from-neon-purple via-neon-pink to-neon-cyan hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={!isConnected}
            >
              <Ticket className="w-5 h-5 mr-2" />
              Enter Draw Now
            </Button>

            {!isConnected && (
              <p className="text-center text-sm text-muted-foreground mt-3">
                Connect wallet to participate
              </p>
            )}
          </Card>

          {/* Your Tickets */}
          <Card className="glass-card p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Ticket className="w-6 h-6 text-neon-purple" />
                <h3 className="text-xl md:text-2xl font-display font-bold text-foreground">
                  Your Tickets
                </h3>
                <Badge variant="secondary" className="font-mono">{tickets.length}</Badge>
              </div>
              <Button 
                onClick={handleBuyTicket}
                disabled={loading || !isConnected}
                className="bg-gradient-to-r from-neon-gold to-orange-500 hover:opacity-90 text-background font-bold"
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
              <div className="text-center py-12 text-muted-foreground">
                <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Connect your wallet to view tickets</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tickets yet. Buy your first one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:border-neon-purple/50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getTicketGradient(ticket.type)}`}>
                        <Ticket className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-mono font-bold text-foreground">{ticket.id}</div>
                        <div className={`text-sm capitalize ${getTicketTypeColor(ticket.type)}`}>{ticket.type} NFT</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {ticket.status === 'in_draw' && (
                        <div className="hidden sm:flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-neon-cyan" />
                          <CountdownTimer variant="compact" />
                        </div>
                      )}
                      <Badge 
                        variant="outline"
                        className={`${getStatusColor(ticket.status)} font-medium`}
                      >
                        {getStatusLabel(ticket.status)}
                      </Badge>
                      {ticket.status === 'available' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-neon-purple hover:text-neon-purple hover:bg-neon-purple/10"
                        >
                          Enter
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* How It Works - 3 steps */}
          <Card className="glass-card p-6 md:p-8">
            <h3 className="text-2xl md:text-3xl font-display font-bold text-center mb-8">
              How It Works
            </h3>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: 1, title: 'Buy Ticket', desc: 'Purchase CLT tokens and mint your unique NFT lottery ticket. Each ticket costs 1 USDT equivalent.' },
                { step: 2, title: 'Enter Draw', desc: 'Submit your ticket to the daily draw. Draws happen every day at 23:59 GMT.' },
                { step: 3, title: 'Win Prizes', desc: 'Top 25% of participants win! Distribution follows poker tournament style - first place wins the jackpot.' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                    {item.step}
                  </div>
                  <h4 className="font-bold text-lg text-foreground mb-2">{item.title}</h4>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Price Chart */}
          <PriceChart />

          {/* Referral Program */}
          <Card className="glass-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Gift className="w-8 h-8 text-neon-pink" />
              <h3 className="text-2xl md:text-3xl font-display font-bold">
                Referral Program
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-foreground text-lg">
                  The more players participate, the bigger the prizes! You can directly influence this.
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-neon-pink/20 flex items-center justify-center flex-shrink-0">
                      <Gift className="w-4 h-4 text-neon-pink" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Your friend gets a GIFT ticket</p>
                      <p className="text-sm text-muted-foreground">Free ticket to participate in the lottery</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center flex-shrink-0">
                      <Star className="w-4 h-4 text-neon-cyan" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">You get a REF ticket</p>
                      <p className="text-sm text-muted-foreground">When your friend activates their GIFT ticket in a draw, you receive a REF ticket</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                {!telegramConnected ? (
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">Connect Telegram bot to get your referral link</p>
                    <Button 
                      onClick={handleConnectTelegram}
                      className="bg-[#0088cc] hover:bg-[#0077b5] text-white"
                    >
                      <Send className="w-5 h-5 mr-2" />
                      Connect Telegram Bot
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="p-4 rounded-xl bg-background/50 border border-neon-green/30">
                      <p className="text-sm text-neon-green mb-2">✓ Telegram connected</p>
                      <code className="text-xs text-muted-foreground break-all">
                        https://cryptolottery.today/ref/abc123
                      </code>
                    </div>
                    <Button 
                      onClick={handleShareTelegram}
                      className="bg-[#0088cc] hover:bg-[#0077b5] text-white"
                    >
                      <Send className="w-5 h-5 mr-2" />
                      Share via Telegram
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Ticket Types */}
          <Card className="glass-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <Ticket className="w-8 h-8 text-neon-purple" />
              <h3 className="text-2xl md:text-3xl font-display font-bold">
                Ticket Types
              </h3>
            </div>

            <p className="text-muted-foreground mb-8">
              When you buy a ticket, a random NFT is minted from the following types:
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { 
                  type: 'Common', 
                  icon: Ticket, 
                  color: 'text-foreground/80',
                  gradient: 'from-gray-400 to-gray-600',
                  desc: 'Standard ticket with base winning chances'
                },
                { 
                  type: 'Event', 
                  icon: Star, 
                  color: 'text-neon-purple',
                  gradient: 'from-purple-500 to-pink-500',
                  desc: 'Special event ticket with higher winning chances'
                },
                { 
                  type: 'Legendary', 
                  icon: Crown, 
                  color: 'text-neon-gold',
                  gradient: 'from-yellow-400 to-amber-600',
                  desc: 'Guaranteed prize placement with highest chances'
                },
                { 
                  type: 'GIFT', 
                  icon: Gift, 
                  color: 'text-neon-pink',
                  gradient: 'from-pink-400 to-rose-500',
                  desc: 'Free ticket from referral link'
                },
                { 
                  type: 'REF', 
                  icon: Gem, 
                  color: 'text-neon-cyan',
                  gradient: 'from-cyan-400 to-blue-500',
                  desc: 'Reward for successful referral'
                },
              ].map((ticket) => (
                <div 
                  key={ticket.type}
                  className="p-4 rounded-xl bg-background/50 border border-border/50 hover:border-neon-purple/30 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${ticket.gradient} flex items-center justify-center`}>
                      <ticket.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className={`font-bold ${ticket.color}`}>{ticket.type}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{ticket.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Charity Block */}
          <Card className="glass-card p-6 md:p-8 border-neon-pink/30">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-neon-pink to-red-500 flex items-center justify-center flex-shrink-0">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-display font-bold mb-2">
                  10% for Charity
                </h3>
                <p className="text-muted-foreground text-lg">
                  10% of every draw's revenue goes to charity organizations around the world. 
                  By playing CryptoLottery.today, you're not just winning prizes — you're making a difference.
                </p>
              </div>
            </div>
          </Card>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 mt-12">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-neon-purple animate-spin-slow" />
                <span className="font-display font-bold">CryptoLottery.today</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © 2024 CryptoLottery.today
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
