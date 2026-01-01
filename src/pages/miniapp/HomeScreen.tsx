// src/pages/miniapp/HomeScreen.tsx
import { useState, useEffect, useRef } from 'react';
import { Wand2, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type Draw } from '@/lib/supabase';

interface HomeScreenProps {
  currentDraw: Draw | null;
  onEnterDraw: () => void;
  isVisible?: boolean;
}

export default function HomeScreen({ currentDraw, onEnterDraw, isVisible = true }: HomeScreenProps) {
  const [timeRemaining, setTimeRemaining] = useState({ hours: '00', minutes: '00', seconds: '00' });
  const [animatingValues, setAnimatingValues] = useState({
    jackpot: false,
    prizePool: false,
    participants: false,
    winners: false,
  });
  
  const prevValuesRef = useRef({
    jackpot: 0,
    prizePool: 0,
    participants: 0,
    winners: 0,
  });
  const hasAnimatedRef = useRef(false);
  const prevVisibleRef = useRef(false);
  
  const cltPrice = 0.0002; // CLT/USDT
  const hasDraw = currentDraw !== null;
  const jackpot = currentDraw?.jackpot ?? 0;
  const prizePool = currentDraw?.prize_pool ?? 0;
  const participants = currentDraw?.participants ?? 0;
  const winners = currentDraw?.winners ?? 0;
  const jackpotUsd = (jackpot * cltPrice).toFixed(2);
  const prizePoolUsd = (prizePool * cltPrice).toFixed(2);
  
  // Mock data for paid/free tickets (should be fetched from database later)
  const paidTickets = Math.floor(participants * 0.3); // 30% paid tickets
  const freeTickets = participants - paidTickets;
  const freeWinners = winners > 0 ? Math.floor(winners * 0.1) : 0; // 10% free winners

  // Sequential animation on page load or when entering the screen
  useEffect(() => {
    if (!hasDraw) return;

    const hasData = jackpot > 0 || prizePool > 0 || participants > 0 || winners > 0;
    const justBecameVisible = isVisible && !prevVisibleRef.current;
    
    // Animate when screen becomes visible and has data
    if (justBecameVisible && hasData) {
      // Sequential animation: jackpot -> prize pool -> participants -> winners
      // Jackpot
      setTimeout(() => {
        setAnimatingValues(prev => ({ ...prev, jackpot: true }));
        setTimeout(() => setAnimatingValues(prev => ({ ...prev, jackpot: false })), 1000);
      }, 0);

      // Prize Pool
      setTimeout(() => {
        setAnimatingValues(prev => ({ ...prev, prizePool: true }));
        setTimeout(() => setAnimatingValues(prev => ({ ...prev, prizePool: false })), 1000);
      }, 300);

      // Participants
      setTimeout(() => {
        setAnimatingValues(prev => ({ ...prev, participants: true }));
        setTimeout(() => setAnimatingValues(prev => ({ ...prev, participants: false })), 1000);
      }, 600);

      // Winners
      setTimeout(() => {
        setAnimatingValues(prev => ({ ...prev, winners: true }));
        setTimeout(() => setAnimatingValues(prev => ({ ...prev, winners: false })), 1000);
      }, 900);
    }

    prevVisibleRef.current = isVisible;
    prevValuesRef.current = { jackpot, prizePool, participants, winners };
  }, [hasDraw, isVisible, jackpot, prizePool, participants, winners]);

  // Track value changes and trigger animations (for updates after first load)
  useEffect(() => {
    if (!hasDraw) return;

    const prev = prevValuesRef.current;
    const isFirstLoad = prev.jackpot === 0 && prev.prizePool === 0 && prev.participants === 0 && prev.winners === 0;
    
    // Skip if it's first load (handled by previous useEffect)
    if (isFirstLoad) return;

    // Value change animation
    if (jackpot !== prev.jackpot && prev.jackpot !== 0) {
      setAnimatingValues(prev => ({ ...prev, jackpot: true }));
      setTimeout(() => setAnimatingValues(prev => ({ ...prev, jackpot: false })), 1000);
    }
    if (prizePool !== prev.prizePool && prev.prizePool !== 0) {
      setAnimatingValues(prev => ({ ...prev, prizePool: true }));
      setTimeout(() => setAnimatingValues(prev => ({ ...prev, prizePool: false })), 1000);
    }
    if (participants !== prev.participants && prev.participants !== 0) {
      setAnimatingValues(prev => ({ ...prev, participants: true }));
      setTimeout(() => setAnimatingValues(prev => ({ ...prev, participants: false })), 1000);
    }
    if (winners !== prev.winners && prev.winners !== 0) {
      setAnimatingValues(prev => ({ ...prev, winners: true }));
      setTimeout(() => setAnimatingValues(prev => ({ ...prev, winners: false })), 1000);
    }
  }, [jackpot, prizePool, participants, winners, hasDraw]);

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
      
      setTimeRemaining({
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0')
      });
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
              <span className="text-white font-display">Draw #{hasDraw ? currentDraw.draw_id : '••••••'}</span>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Jackpot Prize</p>
              <p className={`text-2xl md:text-3xl font-display font-black text-neon-gold transition-all duration-300 ${animatingValues.jackpot ? 'value-updated' : ''}`}>
                {jackpot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ')} CLT
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ≈ ${jackpotUsd} USDT
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm mb-6">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Prize Pool</p>
                <p className={`text-lg font-display font-bold text-neon-gold transition-all duration-300 ${animatingValues.prizePool ? 'value-updated' : ''}`}>{prizePool.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ')} CLT</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ ${prizePoolUsd} USDT
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Entries</p>
                <p className={`text-lg font-display font-bold text-neon-gold leading-tight transition-all duration-300 ${animatingValues.participants ? 'value-updated' : ''}`}>
                  {participants}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {paidTickets} paid, {freeTickets} free
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">Winners</p>
                <p className={`text-lg font-display font-bold text-neon-gold leading-tight transition-all duration-300 ${animatingValues.winners ? 'value-updated' : ''}`}>
                  {winners}
                </p>
                {freeWinners > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {freeWinners} free included
                  </p>
                )}
              </div>
            </div>

            <div className="text-center mb-4 -mt-2">
              <p className="text-sm text-muted-foreground mb-1">Ends in</p>
              <p className="text-xl font-display font-bold text-neon-pink tabular-nums">
                <span className="inline-block w-8 text-center">{timeRemaining.hours}</span>
                <span className="text-base mx-1">:</span>
                <span className="inline-block w-8 text-center">{timeRemaining.minutes}</span>
                <span className="text-base mx-1">:</span>
                <span className="inline-block w-8 text-center">{timeRemaining.seconds}</span>
              </p>
            </div>

            {/* Enter Draw Button */}
            <Button
              onClick={onEnterDraw}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground font-display font-bold text-base mb-4 enter-draw-gradient"
            >
              <span className="enter-draw-text">Enter Draw</span>
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>

            {/* Prize distribution hint */}
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                <Wand2 className="w-3 h-3 inline-block mr-1 text-neon-gold" />
                Poker-style payouts: Top 25% of paid tickets share the prize pool. First place takes the biggest share!
              </p>
            </div>
          </div>
        </Card>

        {/* How It Works */}
        <Card className="glass-card p-6">
          <h3 className="text-lg font-display font-bold mb-6 text-center text-white">How It Works</h3>
          <div className="space-y-4">
            {[
              { step: '01', title: 'Buy NFT Ticket', desc: 'Mint unique NFT tickets that give you entry to the everyday draws' },
              { step: '02', title: 'Enter the Draw', desc: 'Choose which draw to enter with your available tickets' },
              { step: '03', title: 'Win Prizes', desc: 'Top 25% of participants share the prize pool, poker-style!' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div className="w-10 h-10 rounded-full bg-neon-gold flex items-center justify-center font-display font-bold text-background group-hover:scale-110 transition-transform flex-shrink-0">
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

