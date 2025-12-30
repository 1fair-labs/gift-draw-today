// src/pages/miniapp/HomeScreen.tsx
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
    <div className="h-full w-full overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Current Draw Card */}
        <Card className="glass-card overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-accent opacity-20 blur-xl group-hover:opacity-30 transition-opacity" />
          
          <div className="relative p-6">
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
                {formatTimeRemaining(currentDraw.end_at)}
              </p>
            </div>

            {/* Prize distribution hint */}
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                <Sparkles className="w-3 h-3 inline-block mr-1 text-neon-gold" />
                Poker-style payouts: Top 25% share the prize pool. First place takes the biggest share!
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

