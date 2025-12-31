// src/components/AnimatedCounter.tsx
import { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number | null;
  formatValue?: (val: number) => string;
  className?: string;
  minHeight?: string;
}

export default function AnimatedCounter({ 
  value, 
  formatValue,
  className = '',
  minHeight = 'auto'
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState<string>('••••••');
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null) {
      setDisplayValue('••••••');
      prevValueRef.current = null;
      return;
    }

    const prevValue = prevValueRef.current;
    
    if (prevValue === null) {
      // First render - no animation
      prevValueRef.current = value;
      setDisplayValue(formatValue ? formatValue(value) : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      return;
    }

    if (prevValue === value) {
      // No change - no animation
      return;
    }

    prevValueRef.current = value;

    // Animate from prevValue to value
    setIsAnimating(true);
    const startTime = Date.now();
    const duration = 500; // 500ms animation
    const startValue = prevValue;
    const endValue = value;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOut);
      setDisplayValue(formatValue ? formatValue(currentValue) : currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setDisplayValue(formatValue ? formatValue(value) : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, formatValue]);

  return (
    <span 
      className={className}
      style={{ 
        minHeight,
        display: 'inline-block',
        transition: isAnimating ? 'none' : 'none'
      }}
    >
      {displayValue}
    </span>
  );
}

