import { useState } from 'react';
import { Ticket, Trophy, Users, Clock, Sparkles, Zap, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

export default function Index() {
  const [isConnected] = useState(true); // Mock connected state
  const [tickets] = useState(mockTickets);
  const [currentDraw] = useState(mockDraw);
  const [loading, setLoading] = useState(false);

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
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center animate-spin-slow">
                  <Sparkles className="w-5 h-5 text-background" />
                </div>
              </div>
              <h1 className="text-xl md:text-2xl font-display font-bold gradient-text">
                CryptoLottery
              </h1>
            </div>
            
            <Button 
              variant="outline" 
              className="neon-border bg-card/50 hover:bg-card border-0 font-medium"
            >
              <span className="hidden sm:inline">0x1234...5678</span>
              <span className="sm:hidden">Connected</span>
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 md:py-12">
          {isConnected ? (
            <div className="max-w-4xl mx-auto space-y-8">
              
              {/* Hero Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Pool', value: '$125K', icon: Trophy, color: 'text-neon-gold' },
                  { label: 'Players', value: '847', icon: Users, color: 'text-neon-cyan' },
                  { label: 'Top 25%', value: 'Win', icon: Zap, color: 'text-neon-purple' },
                  { label: 'Time Left', value: formatTimeRemaining(currentDraw.end_at), icon: Clock, color: 'text-neon-pink' },
                ].map((stat, i) => (
                  <Card key={i} className="glass-card p-4 text-center group hover:scale-105 transition-transform duration-300">
                    <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color} group-hover:scale-110 transition-transform`} />
                    <p className="text-2xl md:text-3xl font-display font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
                  </Card>
                ))}
              </div>

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
                            ${currentDraw.jackpot.toLocaleString()}
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
                    <Badge variant="secondary" className="font-mono">{tickets.length}</Badge>
                  </div>
                  
                  <Button 
                    onClick={handleBuyTicket}
                    disabled={loading}
                    className="bg-gradient-to-r from-neon-gold to-orange-500 hover:opacity-90 text-background font-display font-bold glow-gold"
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

                {tickets.length === 0 ? (
                  <Card className="glass-card p-12 text-center">
                    <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-lg text-muted-foreground mb-4">No tickets yet</p>
                    <p className="text-sm text-muted-foreground/70">Buy your first NFT ticket and enter the draw for a chance to win!</p>
                  </Card>
                ) : (
                  <div className="grid gap-3">
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
          ) : (
            <div className="max-w-md mx-auto text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-float">
                <Sparkles className="w-10 h-10 text-background" />
              </div>
              <h2 className="text-2xl font-display font-bold mb-4 gradient-text">Welcome to CryptoLottery</h2>
              <p className="text-muted-foreground mb-8">Connect your wallet to buy NFT tickets and enter decentralized lottery draws</p>
              <Button 
                size="lg"
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-display font-bold glow-purple"
              >
                Connect Wallet
              </Button>
            </div>
          )}
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
