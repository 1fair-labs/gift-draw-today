import { useState, useEffect } from 'react';

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export const useCountdown = (): TimeLeft => {
  const calculateTimeLeft = (): TimeLeft => {
    const now = new Date();
    const utcNow = new Date(now.toUTCString());
    
    // Target: 23:59:00 UTC today or tomorrow
    let target = new Date(utcNow);
    target.setUTCHours(23, 59, 0, 0);
    
    // If we've passed today's draw time, target tomorrow
    if (utcNow >= target) {
      target.setUTCDate(target.getUTCDate() + 1);
    }
    
    const total = target.getTime() - utcNow.getTime();
    
    if (total <= 0) {
      return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    }
    
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / (1000 * 60)) % 60);
    const seconds = Math.floor((total / 1000) % 60);
    
    return { hours, minutes, seconds, total };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return timeLeft;
};
