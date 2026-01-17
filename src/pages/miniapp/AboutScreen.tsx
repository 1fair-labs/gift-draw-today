// src/pages/miniapp/AboutScreen.tsx
import { useState, useEffect, useRef } from 'react';

interface ParagraphProps {
  text: string;
  startDelay: number;
  typingDelay?: number;
  isHeading?: boolean;
  isList?: boolean;
  isListItem?: boolean;
  shouldAutoScroll: boolean;
}

function Paragraph({ 
  text, 
  startDelay, 
  typingDelay = 8, 
  isHeading = false, 
  isList = false,
  isListItem = false,
  shouldAutoScroll
}: ParagraphProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const paragraphRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, startDelay);

    return () => clearTimeout(timer);
  }, [startDelay]);

  useEffect(() => {
    if (!isVisible) return;

    if (displayedText.length < text.length) {
      const currentChar = text[displayedText.length];
      // Pause on punctuation: +30ms after ., !, ? (очень минимальная пауза)
      const punctuationPause = ['.', '!', '?'].includes(currentChar) ? 30 : 0;
      // Randomized keystroke delay: ±2-3ms (очень минимальная вариация)
      const randomDelay = Math.random() * 3 - 1.5;
      const adjustedDelay = typingDelay + punctuationPause + randomDelay;

      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, Math.max(5, adjustedDelay));

      return () => clearTimeout(timer);
    }
  }, [displayedText, text, typingDelay, isVisible]);

  useEffect(() => {
    if (isVisible && paragraphRef.current && displayedText.length > 0 && shouldAutoScroll) {
      paragraphRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isVisible, displayedText, shouldAutoScroll]);

  if (!isVisible) return null;

  const isComplete = displayedText.length === text.length;

  if (isHeading) {
    return (
      <h2 
        ref={paragraphRef}
        className="text-xl font-bold text-foreground mb-3 mt-6 first:mt-0"
      >
        {displayedText}
        {!isComplete && <span className="inline-block w-0.5 h-4 bg-foreground ml-1 animate-pulse">|</span>}
      </h2>
    );
  }

  if (isList) {
    return (
      <p 
        ref={paragraphRef}
        className="text-sm text-muted-foreground mb-1"
      >
        {displayedText}
        {!isComplete && <span className="inline-block w-0.5 h-4 bg-foreground ml-1 animate-pulse">|</span>}
      </p>
    );
  }

  if (isListItem) {
    const lines = text.split('\n');
    const title = lines[0];
    const description = lines.slice(1).join('\n');
    const titleComplete = displayedText.length > title.length;
    const titleText = titleComplete ? title : displayedText;
    const descDisplayedLength = titleComplete ? displayedText.length - title.length - 1 : 0;
    const descText = titleComplete ? description.slice(0, Math.max(0, descDisplayedLength)) : '';

    return (
      <div 
        ref={paragraphRef}
        className="ml-4 mb-3"
      >
        <p className="text-base text-foreground font-semibold mb-1">
          {titleText}
          {!titleComplete && <span className="inline-block w-0.5 h-4 bg-foreground ml-1 animate-pulse">|</span>}
        </p>
        {titleComplete && (
          <p className="text-sm text-muted-foreground ml-4">
            {descText}
            {descText.length < description.length && <span className="inline-block w-0.5 h-4 bg-foreground ml-1 animate-pulse">|</span>}
          </p>
        )}
      </div>
    );
  }

  return (
    <p 
      ref={paragraphRef}
      className="text-base text-foreground leading-relaxed mb-4"
    >
      {displayedText}
      {!isComplete && <span className="inline-block w-0.5 h-4 bg-foreground ml-1 animate-pulse">|</span>}
    </p>
  );
}

export default function AboutScreen() {
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const lastScrollTop = useRef<number>(0);

  // Отслеживание touch событий
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      setIsUserInteracting(true);
      setShouldAutoScroll(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = touchStartY.current - currentY;
      
      // Если пользователь прокручивает вверх (deltaY < 0), отключаем автоскролл
      if (deltaY < -10) {
        setShouldAutoScroll(false);
        setIsUserInteracting(true);
      }
    };

    const handleTouchEnd = () => {
      // Включаем автоскролл обратно через небольшую задержку, если пользователь не взаимодействует
      setTimeout(() => {
        if (!isUserInteracting) {
          setShouldAutoScroll(true);
        }
      }, 2000);
    };

    const handleWheel = (e: WheelEvent) => {
      // Отслеживание прокрутки колесиком мыши
      if (e.deltaY < 0) {
        // Прокрутка вверх
        setShouldAutoScroll(false);
        setIsUserInteracting(true);
      }
    };

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      if (currentScrollTop < lastScrollTop.current) {
        // Прокрутка вверх
        setShouldAutoScroll(false);
        setIsUserInteracting(true);
      }
      lastScrollTop.current = currentScrollTop;
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('wheel', handleWheel);
    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [isUserInteracting]);

  const content = [
    { text: "✨ Welcome, Lucky One! 🍀", isHeading: true },
    { text: "" },
    { text: "The GiftDraw.today team is thrilled to welcome you to a truly unique Web3 experience — unlike anything else on the planet." },
    { text: "" },
    { text: "🎯 GiftDraw.today ≠ lottery." },
    { text: "This is a New Paradigm." },
    { text: "" },
    { text: "🚫 We stand against gambling and broken dreams." },
    { text: "💚 We believe in collective generosity, shared fortune, and conscious participation." },
    { text: "" },
    { text: "Just mint an NFT ticket for ~$1 — not as a bet, but as a gift to the world — and join the daily global redistribution of value." },
    { text: "Yes — people become wealthier every single day with GiftDraw. 💰" },
    { text: "" },
    { text: "🔒 Honesty & Decentralization", isHeading: true },
    { text: "Results cannot be faked." },
    { text: "Every draw is on-chain, verifiable, and immutable — guaranteed by Solana blockchain." },
    { text: "" },
    { text: "🌐 Complete Transparency", isHeading: true },
    { text: "You see everything:" },
    { text: "" },
    { text: "• Total participants", isList: true },
    { text: "• Prize pool size", isList: true },
    { text: "• Number of winners", isList: true },
    { text: "• Unique draw hash for full verification", isList: true },
    { text: "" },
    { text: "No secrets. No manipulation. Just truth." },
    { text: "" },
    { text: "🎉 High Winning Probability", isHeading: true },
    { text: "✅ 25% of participants win every day — just like in a poker tournament!" },
    { text: "🔥 Plus: Jackpot rolls over if not claimed — growing bigger until someone wins it all." },
    { text: "The thrill? Never ends." },
    { text: "" },
    { text: "🎟️ Ticket Tiers", isHeading: true },
    { text: "Legendary ⚡\n1 in 10,000 chance — ultra-rare, life-changing rewards.", isListItem: true },
    { text: "Event 🌟\n1 in 1,000 chance — special editions with boosted prizes.", isListItem: true },
    { text: "Common ✅\nStandard ticket — still gives you that 25% daily win chance. Your everyday key to abundance.", isListItem: true },
    { text: "" },
    { text: "🪂 $GIFT Token Airdrop (SPL on Solana)", isHeading: true },
    { text: "Total Supply: 100,000,000 GIFT", isList: true },
    { text: "DEX Liquidity: 50,000,000 GIFT (50%)", isList: true },
    { text: "Airdrop: 25,000,000 GIFT (25%)", isList: true },
    { text: "Presale / CEX / Team: 25,000,000 GIFT (25%)", isList: true },
    { text: "" },
    { text: "🚀 Ready to change your life?", isHeading: true },
    { text: "Join thousands of early winners already shaping the future of fair, joyful, decentralized fortune." },
    { text: "" },
    { text: "You're not late. You're early." },
    { text: "Welcome to the revolution. 🌍✨" },
  ];

  let currentDelay = 50; // Start delay: очень минимальная задержка

  return (
    <div ref={containerRef} className="h-full w-full overflow-y-auto">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="space-y-1">
          {content.map((item, index) => {
            if (item.text === '') {
              currentDelay += 100; // Line break pause: очень минимальная пауза
              return <div key={index} className="h-3" />;
            }

            const paragraphDelay = currentDelay;
            // Максимально ускоренная скорость печати: 5-8ms на символ (125-200 символов/сек)
            const typingSpeed = item.isHeading ? 5 : item.isList ? 8 : 8;
            
            // Calculate delay for next element
            const textLength = item.text.length;
            const baseTime = textLength * typingSpeed;
            // Add punctuation pauses (очень минимальные)
            const punctuationCount = (item.text.match(/[.!?]/g) || []).length;
            const punctuationPause = punctuationCount * 30; // Очень минимальная пауза
            currentDelay += baseTime + punctuationPause + 100; // Base time + punctuation + очень минимальная пауза

            return (
              <Paragraph
                key={index}
                text={item.text}
                startDelay={paragraphDelay}
                typingDelay={typingSpeed}
                isHeading={item.isHeading}
                isList={item.isList}
                isListItem={item.isListItem}
                shouldAutoScroll={shouldAutoScroll}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
