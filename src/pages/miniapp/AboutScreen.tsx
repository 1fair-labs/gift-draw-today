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
  useFastMode: boolean; // Показывать абзац целиком после первых абзацев
  onComplete?: () => void; // Callback при завершении печати
}

function Paragraph({ 
  text, 
  startDelay, 
  typingDelay = 8, 
  isHeading = false, 
  isList = false,
  isListItem = false,
  shouldAutoScroll,
  useFastMode,
  onComplete
}: ParagraphProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const paragraphRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, startDelay);

    return () => clearTimeout(timer);
  }, [startDelay]);

  useEffect(() => {
    if (!isVisible) return;

    // Если fast mode включен, показываем весь текст сразу
    if (useFastMode) {
      setDisplayedText(text);
      return;
    }

    // Иначе печатаем посимвольно
    if (displayedText.length < text.length) {
      const currentChar = text[displayedText.length];
      // Pause on punctuation: +30ms after ., !, ?
      const punctuationPause = ['.', '!', '?'].includes(currentChar) ? 30 : 0;
      // Randomized keystroke delay: ±2-3ms
      const randomDelay = Math.random() * 3 - 1.5;
      const adjustedDelay = typingDelay + punctuationPause + randomDelay;

      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, Math.max(5, adjustedDelay));

      return () => clearTimeout(timer);
    } else if (displayedText.length === text.length && onComplete && !completedRef.current) {
      // Вызываем callback при завершении печати (только один раз)
      completedRef.current = true;
      onComplete();
    }
  }, [displayedText, text, typingDelay, isVisible, useFastMode, onComplete]);

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
        {!isComplete && !useFastMode && <span className="inline-block w-0.5 h-4 bg-foreground ml-1 animate-pulse">|</span>}
      </h2>
    );
  }

  if (isList) {
    return (
      <p 
        ref={paragraphRef}
        className="text-sm text-muted-foreground mb-1 font-normal"
      >
        {displayedText}
        {!isComplete && !useFastMode && <span className="inline-block w-0.5 h-4 bg-foreground ml-1 animate-pulse">|</span>}
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
        <p className="text-base text-foreground font-normal mb-1">
          {useFastMode ? title : titleText}
          {!titleComplete && !useFastMode && <span className="inline-block w-0.5 h-4 bg-foreground ml-1 animate-pulse">|</span>}
        </p>
        {(titleComplete || useFastMode) && (
          <p className="text-sm text-muted-foreground ml-4 font-normal">
            {useFastMode ? description : descText}
            {descText.length < description.length && !useFastMode && <span className="inline-block w-0.5 h-4 bg-foreground ml-1 animate-pulse">|</span>}
          </p>
        )}
      </div>
    );
  }

  return (
    <p 
      ref={paragraphRef}
      className="text-base text-foreground leading-relaxed mb-4 font-normal"
    >
      {displayedText}
      {!isComplete && !useFastMode && <span className="inline-block w-0.5 h-4 bg-foreground ml-1 animate-pulse">|</span>}
    </p>
  );
}

export default function AboutScreen() {
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [useFastMode, setUseFastMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const lastScrollTop = useRef<number>(0);

  // Включаем fast mode сразу, но первый заголовок печатается посимвольно
  // Все остальные абзацы используют fast mode (появляются быстро)
  useEffect(() => {
    // Включаем fast mode сразу, кроме первого заголовка
    setUseFastMode(true);
  }, []);

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

  // Находим индекс первого заголовка (он будет печататься посимвольно)
  // Все остальные абзацы используют fast mode
  let firstHeadingIndex = -1;
  for (let i = 0; i < content.length; i++) {
    if (content[i].text !== '' && content[i].isHeading) {
      firstHeadingIndex = i;
      break;
    }
  }

  return (
    <div ref={containerRef} className="h-full w-full overflow-y-auto">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="space-y-1">
          {content.map((item, index) => {
            if (item.text === '') {
              return <div key={index} className="h-3" />;
            }

            // Определяем, должен ли этот абзац использовать fast mode
            // Только первый заголовок печатается посимвольно, все остальные - fast mode
            const isFirstHeading = index === firstHeadingIndex;
            const shouldUseFastMode = useFastMode && !isFirstHeading;
            
            // Вычисляем задержку для этого абзаца
            let paragraphDelay: number;
            
            if (shouldUseFastMode) {
              // В fast mode: абзацы появляются быстро
              if (isFirstHeading) {
                // Если это первый заголовок, считаем время его печати
                const headingItem = content[firstHeadingIndex];
                const typingSpeed = 5; // Для заголовка
                const textLength = headingItem.text.length;
                const baseTime = textLength * typingSpeed;
                const punctuationCount = (headingItem.text.match(/[.!?]/g) || []).length;
                const punctuationPause = punctuationCount * 30;
                const headingTime = baseTime + punctuationPause + 100;
                
                // Время появления этого абзаца = время печати заголовка + задержка
                const fastIndex = index - firstHeadingIndex - 1; // -1 потому что пропускаем пустую строку после заголовка
                paragraphDelay = 50 + headingTime + (Math.max(0, fastIndex) * 60); // 60ms между абзацами в fast mode
              } else {
                // Для остальных абзацев после первого заголовка
                // Вычисляем время печати первого заголовка
                const headingItem = content[firstHeadingIndex];
                const typingSpeed = 5;
                const textLength = headingItem.text.length;
                const baseTime = textLength * typingSpeed;
                const punctuationCount = (headingItem.text.match(/[.!?]/g) || []).length;
                const punctuationPause = punctuationCount * 30;
                const headingTime = baseTime + punctuationPause + 100;
                
                // Считаем количество абзацев до текущего (после заголовка)
                let fastIndex = 0;
                for (let i = firstHeadingIndex + 1; i < index; i++) {
                  if (content[i].text !== '') {
                    fastIndex++;
                  }
                }
                paragraphDelay = 50 + headingTime + (fastIndex * 60); // 60ms между абзацами в fast mode
              }
            } else {
              // В обычном режиме (только для первого заголовка): считаем время печати
              paragraphDelay = 50;
            }

            return (
              <Paragraph
                key={index}
                text={item.text}
                startDelay={paragraphDelay}
                typingDelay={8}
                isHeading={item.isHeading}
                isList={item.isList}
                isListItem={item.isListItem}
                shouldAutoScroll={shouldAutoScroll}
                useFastMode={shouldUseFastMode}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
