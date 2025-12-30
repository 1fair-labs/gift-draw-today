// src/pages/miniapp/HomeScreen.tsx
import { useState, useEffect } from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface HomeScreenProps {
  currentDraw: {
    id: number;
    prize_pool: number;
    jackpot: number;
    participants: number;
    end_at: string;
  };
  onEnterDraw: () => void;
}

export default function HomeScreen({ currentDraw, onEnterDraw }: HomeScreenProps) {
  const [timeRemaining, setTimeRemaining] = useState('00:00:00');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      
      // Получаем следующую полуночь UTC
      const nextMidnight = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0
      ));
      
      const diff = nextMidnight.getTime() - now.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeRemaining(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    // Обновляем сразу
    updateTimer();
    
    // Обновляем каждую секунду
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="p-4 pt-2 space-y-6">
        {/* Current Draw Card */}
        <Card className="glass-card overflow-hidden relative">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="outline" className="bg-neon-green/20 text-neon-green border-neon-green/30 animate-pulse">
                LIVE
              </Badge>
              <span className="text-muted-foreground font-display">Draw #{currentDraw.id}</span>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Jackpot Prize</p>
              <p className="text-4xl md:text-5xl font-display font-black gradient-jackpot animate-pulse-glow">
                {currentDraw.jackpot.toLocaleString('en-US').replace(/,/g, ' ')} CLT
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm mb-6">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Prize Pool</p>
                <p className="text-lg font-display font-bold text-neon-gold">${currentDraw.prize_pool.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Participants</p>
                <p className="text-lg font-display font-bold text-neon-cyan">{currentDraw.participants}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Winners (Top 25%)</p>
                <p className="text-lg font-display font-bold text-neon-purple">{Math.floor(currentDraw.participants * 0.25)}</p>
              </div>
            </div>

            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground mb-1">Ends in</p>
              <p className="text-2xl font-display font-bold text-neon-pink">
                {timeRemaining}
              </p>
            </div>

            {/* Enter Draw Button */}
            <Button
              onClick={onEnterDraw}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-display font-bold mb-4"
            >
              Enter Draw
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>

            {/* Prize distribution hint */}
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                <Sparkles className="w-3 h-3 inline-block mr-1 text-neon-gold" />
                Poker-style payouts: Top 25% share the prize pool. First place takes the biggest share!
              </p>
            </div>
          </div>
        </Card>

        {/* How It Works */}
        <Card className="glass-card p-6">
          <h3 className="text-lg font-display font-bold mb-6 text-center gradient-text">How It Works</h3>
          <div className="space-y-4">
            {[
              { step: '01', title: 'Buy NFT Ticket', desc: 'Mint unique NFT tickets that give you entry to the lottery draws' },
              { step: '02', title: 'Enter the Draw', desc: 'Choose which draw to enter with your available tickets' },
              { step: '03', title: 'Win Prizes', desc: 'Top 25% of participants share the prize pool, poker-style!' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-display font-bold text-background group-hover:scale-110 transition-transform flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-display font-bold mb-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

