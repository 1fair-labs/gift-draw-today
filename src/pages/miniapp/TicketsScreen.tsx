// src/pages/miniapp/TicketsScreen.tsx
import { useState, useRef, useEffect } from 'react';
import { Ticket, ChevronRight, Calendar as CalendarIcon, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import type { Ticket as TicketType } from '@/lib/supabase';

interface TicketsScreenProps {
  tickets: TicketType[];
  onEnterDraw: (ticketId: number, drawId: string) => void;
  onBuyTicket: () => void;
  loading?: boolean;
}

export default function TicketsScreen({ tickets, onEnterDraw, onBuyTicket, loading }: TicketsScreenProps) {
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtTopRef = useRef<boolean>(true);

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

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && selectedTicket) {
      // Format date as YYYYMMDD
      const drawId = format(date, 'yyyyMMdd');
      onEnterDraw(selectedTicket, drawId);
      setSelectedTicket(null);
      setSelectedDate(undefined);
      setShowCalendar(false);
    }
  };

  const handleEnterClick = (ticketId: number) => {
    setSelectedTicket(ticketId);
    setShowCalendar(true);
  };

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    const scrollTop = container.scrollTop;
    isAtTopRef.current = scrollTop <= 5; // Allow small tolerance
    
    if (isAtTopRef.current) {
      touchStartY.current = e.touches[0].clientY;
      touchCurrentY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Check if still at top
    const scrollTop = container.scrollTop;
    if (scrollTop > 5) {
      isAtTopRef.current = false;
      if (isPulling) {
        setPullDistance(0);
        setIsPulling(false);
      }
      return;
    }
    
    if (!isAtTopRef.current) return;
    
    touchCurrentY.current = e.touches[0].clientY;
    const distance = touchCurrentY.current - touchStartY.current;
    
    if (distance > 0) {
      // Pulling down
      setIsPulling(true);
      const maxPull = 120;
      const pullAmount = Math.min(distance * 0.6, maxPull);
      setPullDistance(pullAmount);
      e.preventDefault(); // Prevent default scroll
    } else if (isPulling) {
      // Pulling up while in pull state - reset
      setPullDistance(0);
      setIsPulling(false);
    }
  };

  const handleTouchEnd = () => {
    if (isPulling) {
      // Animate back to top
      setPullDistance(0);
      setIsPulling(false);
    }
    touchStartY.current = 0;
    touchCurrentY.current = 0;
  };

  // Check scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      isAtTopRef.current = scrollTop <= 5;
      
      if (!isAtTopRef.current && isPulling) {
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isPulling]);

  if (tickets.length === 0) {
    return (
      <div 
        ref={scrollContainerRef}
        className="h-full overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        <div className="p-4 pt-2 pb-10 md:pb-6">
          <Card className="glass-card p-6 text-center">
            <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground mb-4">No tickets yet</p>
            <p className="text-sm text-muted-foreground/70 mb-4">Mint your first NFT ticket and join the daily draw with a 25% chance to win!</p>
            <p className="text-sm text-muted-foreground/70 mb-4">1 NFT ticket ≈ 1 USDT</p>
            <Button 
              onClick={onBuyTicket}
              disabled={loading}
              className="w-full bg-gradient-to-r from-neon-gold to-orange-500 hover:opacity-90 text-background font-display font-bold text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Minting...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-1 animate-wand-shake" />
                  <span className="animate-button-text-pulse">Mint Ticket</span>
                </>
              )}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="h-full w-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateY(${pullDistance}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      <div className="p-4 pt-2 pb-10 md:pb-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Ticket className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-display font-bold">Your NFT Tickets</h2>
            <Badge variant="secondary" className="font-mono">{tickets.length}</Badge>
          </div>
        </div>

        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card 
              key={ticket.id} 
              className="glass-card p-4 group hover:border-primary/50 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                {/* Ticket Image/Placeholder */}
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20 flex-shrink-0">
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
                  className={`${getStatusColor(ticket.status)} font-medium`}
                >
                  {getStatusLabel(ticket.status)}
                </Badge>

                {/* Action */}
                {ticket.status === 'available' && (
                  <Popover open={showCalendar && selectedTicket === ticket.id} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => handleEnterClick(ticket.id)}
                      >
                        Enter
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="rounded-md border"
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </Card>
          ))}
        </div>

        <p className="text-sm text-muted-foreground/70 mt-4 mb-2">1 NFT ticket ≈ 1 USDT</p>
         <Button 
           onClick={onBuyTicket}
           disabled={loading}
           className="w-full bg-gradient-to-r from-neon-gold to-orange-500 hover:opacity-90 text-background font-display font-bold text-base"
         >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Minting...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-1 animate-wand-shake" />
              <span className="animate-button-text-pulse">Mint More Tickets</span>
            </>
          )}
        </Button>

        {/* How It Works */}
        <Card className="glass-card p-6 mt-6">
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