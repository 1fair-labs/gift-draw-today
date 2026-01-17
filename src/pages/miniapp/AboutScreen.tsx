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
  useFastMode: boolean; // Показывать абзац целиком
}

function Paragraph({ 
  text, 
  startDelay, 
  typingDelay = 8, 
  isHeading = false, 
  isList = false,
  isListItem = false,
  shouldAutoScroll,
  useFastMode
}: ParagraphProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [opacity, setOpacity] = useState(0.3); // Начинаем с тусклого текста
  const paragraphRef = useRef<HTMLDivElement>(null);

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
      // Начинаем с тусклого текста и плавно увеличиваем opacity до 1
      setOpacity(0.3);
      const opacityTimer = setTimeout(() => {
        setOpacity(1);
      }, 200); // Плавный переход за 200ms
      return () => clearTimeout(opacityTimer);
    }

    // Иначе печатаем посимвольно
    if (displayedText.length < text.length) {
      const currentChar = text[displayedText.length];
      // Pause on punctuation: больше для заголовков
      const punctuationPause = ['.', '!', '?'].includes(currentChar) ? (isHeading ? 50 : 30) : 0;
      // Randomized keystroke delay: ±2-3ms
      const randomDelay = Math.random() * 3 - 1.5;
      const adjustedDelay = typingDelay + punctuationPause + randomDelay;

      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
        // Постепенно увеличиваем opacity по мере появления текста
        const progress = (displayedText.length + 1) / text.length;
        setOpacity(0.3 + (progress * 0.7)); // От 0.3 до 1.0
      }, Math.max(5, adjustedDelay));

      return () => clearTimeout(timer);
    } else {
      // Когда текст полностью напечатан, делаем его полностью видимым
      setOpacity(1);
    }
  }, [displayedText, text, typingDelay, isVisible, useFastMode, isHeading]);

  useEffect(() => {
    if (isVisible && paragraphRef.current && displayedText.length > 0 && shouldAutoScroll) {
      paragraphRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isVisible, displayedText, shouldAutoScroll]);

  if (!isVisible) return null;

  const isComplete = displayedText.length === text.length;

  if (isHeading) {
    // Определяем, это ли заголовок "Welcome, Lucky One!"
    const isWelcomeHeading = text.includes("Welcome, Lucky One!");
    
    return (
      <h2 
        ref={paragraphRef}
        className={`text-xl font-bold text-foreground mb-3 mt-6 first:mt-0 transition-opacity duration-300 ${isWelcomeHeading ? 'font-display' : 'font-sans'}`}
        style={{ opacity }}
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
        className="text-sm text-muted-foreground mb-1 transition-opacity duration-300"
        style={{ opacity }}
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
        className="ml-4 mb-3 transition-opacity duration-300"
        style={{ opacity }}
      >
        <p className="text-base text-foreground font-semibold mb-1">
          {useFastMode ? title : titleText}
          {!titleComplete && !useFastMode && <span className="inline-block w-0.5 h-4 bg-foreground ml-1 animate-pulse">|</span>}
        </p>
        {(titleComplete || useFastMode) && (
          <p className="text-sm text-muted-foreground ml-4">
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
      className="text-base text-foreground leading-relaxed mb-4 transition-opacity duration-300"
      style={{ opacity }}
    >
      {displayedText}
      {!isComplete && !useFastMode && <span className="inline-block w-0.5 h-4 bg-foreground ml-1 animate-pulse">|</span>}
    </p>
  );
}

export default function AboutScreen() {
  const [shouldAutoScroll] = useState(false); // Автоскролл отключен
  const containerRef = useRef<HTMLDivElement>(null);

  const content = [
    { text: "Welcome, Lucky One! 🍀", isHeading: true },
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

  // Вычисляем задержки для всех абзацев последовательно
  const WELCOME_HEADING_TEXT = "Welcome, Lucky One! 🍀";
  let currentDelay = 0;
  
  // Вычисляем задержку для каждого элемента
  const delays: number[] = [];
  for (let i = 0; i < content.length; i++) {
    if (content[i].text === '') {
      delays.push(currentDelay);
      currentDelay += 100; // Пауза для пустой строки
      continue;
    }
    
    delays.push(currentDelay);
    
    const item = content[i];
    const isWelcomeHeading = item.text === WELCOME_HEADING_TEXT;
    const typingSpeed = isWelcomeHeading ? 18 : (item.isHeading ? 12 : (item.isList ? 5 : 5));
    const textLength = item.text.length;
    const baseTime = textLength * typingSpeed;
    const punctuationCount = (item.text.match(/[.!?]/g) || []).length;
    const punctuationPause = punctuationCount * (isWelcomeHeading ? 50 : (item.isHeading ? 40 : 30));
    const afterPause = isWelcomeHeading ? 800 : (item.isHeading ? 200 : 100);
    
    currentDelay += baseTime + punctuationPause + afterPause;
  }

  return (
    <div ref={containerRef} className="h-full w-full overflow-y-auto">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="space-y-1">
          {content.map((item, index) => {
            if (item.text === '') {
              return <div key={index} className="h-3" />;
            }

            // Определяем, это ли заголовок "Welcome, Lucky One!"
            const isWelcomeHeading = item.text === WELCOME_HEADING_TEXT;
            
            // Все абзацы печатаются посимвольно (без fast mode)
            const shouldUseFastMode = false;
            
            // Используем вычисленную задержку
            const paragraphDelay = delays[index];
            
            // Определяем скорость печати
            const typingSpeed = isWelcomeHeading ? 18 : (item.isHeading ? 12 : (item.isList ? 5 : 5));

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
                useFastMode={shouldUseFastMode}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
