import { useState } from 'react';
import { Sparkles, Gift, Zap, Shield, ChevronRight, TrendingUp, Users, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const cltPrice = 0.041; // CLT/USDT

export default function Landing() {
  const [loading, setLoading] = useState(false);

  const handlePlay = () => {
    setLoading(true);
    // Редирект в Telegram Mini App
    const miniAppUrl = 'https://t.me/cryptolotterytoday_bot/enjoy';
    window.location.href = miniAppUrl;
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
        <header className="sticky top-0 border-b border-border/50 backdrop-blur-xl bg-background/50 z-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto py-4 flex justify-between items-center gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-shrink">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center animate-spin-slow">
                    <Sparkles className="w-5 h-5 text-background" />
                  </div>
                </div>
                <h1 className="text-xl lg:text-2xl font-display font-bold gradient-text leading-tight truncate">
                  <span>CryptoLottery.today</span>
                </h1>
              </div>
              
              <Button 
                onClick={handlePlay}
                disabled={loading}
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-display font-semibold text-sm glow-purple px-6 h-10 flex-shrink-0"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Opening...</span>
                  </>
                ) : (
                  <>
                    <svg 
                      className="w-4 h-4 mr-2" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.193l-1.87 8.81c-.14.625-.5.78-1.016.485l-2.8-2.06-1.35 1.29c-.15.15-.276.276-.566.276l.2-2.84 5.183-4.68c.226-.2-.05-.312-.35-.11l-6.4 4.03-2.76-.86c-.6-.19-.614-.6.12-.9l10.75-4.15c.5-.18.94.13.78.68z"/>
                    </svg>
                    <span>Play Now</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-6xl mx-auto space-y-16">
            
            {/* Hero Section */}
            <section className="text-center space-y-8">
              <div className="space-y-4">
                <Badge variant="outline" className="bg-neon-green/20 text-neon-green border-neon-green/30 text-sm px-4 py-1">
                  🎁 AirDrop Live Now
                </Badge>
                <h2 className="text-5xl md:text-7xl font-display font-black gradient-text">
                  Win Big with
                  <br />
                  <span className="gradient-jackpot">Crypto Lottery</span>
                </h2>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                  Decentralized lottery powered by Chainlink VRF. Fair, transparent, and secure.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  onClick={handlePlay}
                  disabled={loading}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-display font-bold text-lg px-8 py-6 glow-purple group"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5 mr-2" />
                      Claim AirDrop & Play
                      <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </div>
            </section>

            {/* Stats Section */}
            <section>
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
                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </Card>
                ))}
              </div>
            </section>

            {/* How It Works Section */}
            <section>
              <Card className="glass-card p-6 md:p-8">
                <h3 className="text-3xl font-display font-bold mb-8 text-center gradient-text">How It Works</h3>
                <div className="grid md:grid-cols-3 gap-8">
                  {[
                    { step: '01', title: 'Buy NFT Ticket', desc: 'Mint unique NFT tickets that give you entry to the lottery draws' },
                    { step: '02', title: 'Enter the Draw', desc: 'Choose which draw to enter with your available tickets' },
                    { step: '03', title: 'Win Prizes', desc: 'Top 25% of participants share the prize pool, poker-style!' },
                  ].map((item, i) => (
                    <div key={i} className="text-center group">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-display font-bold text-background text-xl group-hover:scale-110 transition-transform">
                        {item.step}
                      </div>
                      <h4 className="text-xl font-display font-bold mb-2">{item.title}</h4>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            {/* Features Section */}
            <section>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { 
                    icon: Shield, 
                    title: 'Secure & Decentralized', 
                    desc: 'Built on blockchain with Chainlink VRF for provably fair randomness' 
                  },
                  { 
                    icon: Zap, 
                    title: 'Instant Payouts', 
                    desc: 'Winners receive their prizes immediately after each draw' 
                  },
                  { 
                    icon: Gift, 
                    title: 'AirDrop Rewards', 
                    desc: 'Join now and claim your free CLT tokens to get started' 
                  },
                ].map((feature, i) => (
                  <Card key={i} className="glass-card p-6 group hover:border-primary/50 transition-all">
                    <feature.icon className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                    <h4 className="text-xl font-display font-bold mb-2">{feature.title}</h4>
                    <p className="text-muted-foreground">{feature.desc}</p>
                  </Card>
                ))}
              </div>
            </section>

            {/* CTA Section */}
            <section className="text-center">
              <Card className="glass-card p-12 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-20 blur-xl group-hover:opacity-30 transition-opacity" />
                <div className="relative z-10 space-y-6">
                  <h3 className="text-4xl md:text-5xl font-display font-black gradient-text">
                    Ready to Win?
                  </h3>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Join thousands of players and start winning today. Claim your AirDrop and get started!
                  </p>
                  <Button 
                    onClick={handlePlay}
                    disabled={loading}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-display font-bold text-lg px-12 py-6 glow-purple group"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        <Gift className="w-5 h-5 mr-2" />
                        Play Now
                        <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </section>
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

