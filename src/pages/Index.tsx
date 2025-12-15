import { useState } from 'react';
import { Sparkles, Trophy, Users, Zap, Ticket, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from '@/components/CountdownTimer';
import { WalletButton } from '@/components/WalletButton';
import { PriceChart } from '@/components/PriceChart';

// Mock data - replace with real data from Supabase/wagmi
const mockDraw = {
  id: 42,
  prizePoolUsdt: 15420,
  jackpotUsdt: 5000,
  participants: 892,
  cltPrice: 0.87, // 1 CLT = $0.87 USDT
};

const mockTickets = [
  { id: 'T-001', type: 'golden', status: 'in_draw', image: '' },
  { id: 'T-002', type: 'silver', status: 'available', image: '' },
  { id: 'T-003', type: 'bronze', status: 'available', image: '' },
];

export default function Index() {
  const [isConnected, setIsConnected] = useState(false);
  const [userBalance] = useState(156.42); // CLT balance
  const [tickets] = useState(mockTickets);
  const [loading, setLoading] = useState(false);

  // Convert USDT to CLT
  const usdtToClt = (usdt: number) => (usdt / mockDraw.cltPrice).toFixed(0);

  const handleConnect = () => setIsConnected(true);
  const handleDisconnect = () => setIsConnected(false);

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
    return status;
  };

  const getStatusColor = (status: string) => {
    if (status === 'in_draw') return 'bg-neon-green/20 text-neon-green border-neon-green/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getTicketTypeColor = (type: string) => {
    switch (type) {
      case 'golden': return 'text-neon-gold';
      case 'silver': return 'text-foreground/80';
      case 'bronze': return 'text-orange-400';
      default: return 'text-foreground';
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
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl bg-gradient-to-r from-neon-gold via-neon-pink to-neon-cyan bg-clip-text text-transparent">
                  CryptoLottery.today
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Decentralized NFT Lottery</p>
              </div>
            </div>

            <WalletButton
              isConnected={isConnected}
              address="0x742d35Cc6634C0532925a3b844Bc9e7595f8dE7a"
              balance={userBalance}
              cltPrice={mockDraw.cltPrice}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-12">
          {/* Hero Stats */}
          <section className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-gold/10 border border-neon-gold/30">
              <Trophy className="w-4 h-4 text-neon-gold" />
              <span className="text-sm font-medium text-neon-gold">Draw #{mockDraw.id} is LIVE</span>
            </div>

            <h2 className="text-4xl md:text-6xl font-display font-bold">
              <span className="bg-gradient-to-r from-neon-gold via-neon-pink to-neon-purple bg-clip-text text-transparent">
                Win Big Tonight!
              </span>
            </h2>

            <p className="text-muted-foreground max-w-xl mx-auto">
              Top 25% of participants win prizes. The earlier you enter, the higher your potential reward!
            </p>

            {/* Live Timer */}
            <div className="py-6">
              <p className="text-sm text-muted-foreground mb-4">Next draw in (23:59 GMT)</p>
              <CountdownTimer />
            </div>
          </section>

          {/* Stats Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-card p-4 md:p-6 text-center">
              <Trophy className="w-8 h-8 text-neon-gold mx-auto mb-2" />
              <div className="text-2xl md:text-3xl font-display font-bold text-neon-gold">
                ${mockDraw.jackpotUsdt.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                ≈ {usdtToClt(mockDraw.jackpotUsdt)} CLT
              </div>
              <div className="text-sm text-muted-foreground mt-1">Jackpot</div>
            </Card>

            <Card className="glass-card p-4 md:p-6 text-center">
              <Zap className="w-8 h-8 text-neon-cyan mx-auto mb-2" />
              <div className="text-2xl md:text-3xl font-display font-bold text-neon-cyan">
                ${mockDraw.prizePoolUsdt.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                ≈ {usdtToClt(mockDraw.prizePoolUsdt)} CLT
              </div>
              <div className="text-sm text-muted-foreground mt-1">Prize Pool</div>
            </Card>

            <Card className="glass-card p-4 md:p-6 text-center">
              <Users className="w-8 h-8 text-neon-pink mx-auto mb-2" />
              <div className="text-2xl md:text-3xl font-display font-bold text-neon-pink">
                {mockDraw.participants}
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.floor(mockDraw.participants * 0.25)} winners
              </div>
              <div className="text-sm text-muted-foreground mt-1">Participants</div>
            </Card>

            <Card className="glass-card p-4 md:p-6 text-center">
              <TrendingUp className="w-8 h-8 text-neon-green mx-auto mb-2" />
              <div className="text-2xl md:text-3xl font-display font-bold text-neon-green">
                ${mockDraw.cltPrice}
              </div>
              <div className="text-xs text-muted-foreground">
                1 CLT = 1 Ticket
              </div>
              <div className="text-sm text-muted-foreground mt-1">CLT Price</div>
            </Card>
          </section>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Current Draw */}
            <Card className="glass-card neon-border p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl md:text-2xl font-display font-bold text-foreground">
                  Current Draw
                </h3>
                <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30 animate-pulse">
                  LIVE
                </Badge>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                  <span className="text-muted-foreground">Prize Pool</span>
                  <div className="text-right">
                    <span className="font-bold text-neon-cyan">${mockDraw.prizePoolUsdt.toLocaleString()} USDT</span>
                    <div className="text-xs text-muted-foreground">≈ {usdtToClt(mockDraw.prizePoolUsdt)} CLT</div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                  <span className="text-muted-foreground">Jackpot</span>
                  <div className="text-right">
                    <span className="font-bold text-neon-gold">${mockDraw.jackpotUsdt.toLocaleString()} USDT</span>
                    <div className="text-xs text-muted-foreground">≈ {usdtToClt(mockDraw.jackpotUsdt)} CLT</div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                  <span className="text-muted-foreground">Ticket Price</span>
                  <div className="text-right">
                    <span className="font-bold text-foreground">1 USDT</span>
                    <div className="text-xs text-muted-foreground">≈ {(1 / mockDraw.cltPrice).toFixed(2)} CLT</div>
                  </div>
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
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          ticket.type === 'golden' ? 'bg-gradient-to-br from-yellow-400 to-amber-600' :
                          ticket.type === 'silver' ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                          'bg-gradient-to-br from-amber-600 to-amber-800'
                        }`}>
                          <Ticket className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-foreground">{ticket.id}</div>
                          <div className={`text-sm capitalize ${getTicketTypeColor(ticket.type)}`}>{ticket.type} NFT</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {ticket.status === 'in_draw' && (
                          <div className="flex items-center gap-2 text-sm">
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
          </div>

          {/* How It Works */}
          <Card className="glass-card p-6 md:p-8">
            <h3 className="text-2xl md:text-3xl font-display font-bold text-center mb-8">
              How It Works
            </h3>

            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: 1, title: 'Buy CLT Tokens', desc: 'Get CLT tokens from exchange. 1 ticket costs 1 USDT worth of CLT.' },
                { step: 2, title: 'Mint NFT Ticket', desc: 'Each ticket is a unique NFT with its own attributes and design.' },
                { step: 3, title: 'Enter the Draw', desc: 'Submit your ticket to the daily draw at 23:59 GMT.' },
                { step: 4, title: 'Win Prizes', desc: 'Top 25% of participants win! First place gets the jackpot.' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center mx-auto mb-4 text-xl font-bold text-white">
                    {item.step}
                  </div>
                  <h4 className="font-bold text-foreground mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Price Chart */}
          <PriceChart />
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 mt-12">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-neon-purple" />
                <span className="font-display font-bold">CryptoLottery.today</span>
              </div>
              <p className="text-sm text-muted-foreground">
                © 2024 CryptoLottery.today — Decentralized NFT Lottery
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
