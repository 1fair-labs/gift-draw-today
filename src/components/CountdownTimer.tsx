import { useCountdown } from '@/hooks/useCountdown';

interface CountdownTimerProps {
  variant?: 'large' | 'compact';
}

export const CountdownTimer = ({ variant = 'large' }: CountdownTimerProps) => {
  const { hours, minutes, seconds } = useCountdown();
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1 font-mono text-sm">
        <span className="text-neon-cyan font-bold">{pad(hours)}:{pad(minutes)}:{pad(seconds)}</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4">
      <div className="flex flex-col items-center">
        <div className="glass-card neon-border px-3 py-2 md:px-4 md:py-3 min-w-[60px] md:min-w-[80px]">
          <span className="text-2xl md:text-4xl font-display font-bold text-neon-cyan">
            {pad(hours)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground mt-1">HOURS</span>
      </div>
      
      <span className="text-2xl md:text-4xl font-bold text-neon-purple animate-pulse">:</span>
      
      <div className="flex flex-col items-center">
        <div className="glass-card neon-border px-3 py-2 md:px-4 md:py-3 min-w-[60px] md:min-w-[80px]">
          <span className="text-2xl md:text-4xl font-display font-bold text-neon-pink">
            {pad(minutes)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground mt-1">MINUTES</span>
      </div>
      
      <span className="text-2xl md:text-4xl font-bold text-neon-purple animate-pulse">:</span>
      
      <div className="flex flex-col items-center">
        <div className="glass-card neon-border px-3 py-2 md:px-4 md:py-3 min-w-[60px] md:min-w-[80px]">
          <span className="text-2xl md:text-4xl font-display font-bold text-neon-gold">
            {pad(seconds)}
          </span>
        </div>
        <span className="text-xs text-muted-foreground mt-1">SECONDS</span>
      </div>
    </div>
  );
};
