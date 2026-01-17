// src/pages/miniapp/AboutScreen.tsx
import { useState, useEffect, useRef } from 'react';

interface TypingTextProps {
  text: string;
  delay?: number;
  onComplete?: () => void;
  className?: string;
}

function TypingText({ text, delay = 30, onComplete, className = '' }: TypingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (displayedText.length < text.length) {
      const currentChar = text[displayedText.length];
      // Pause on punctuation: +200ms after ., !, ?
      const punctuationPause = ['.', '!', '?'].includes(currentChar) ? 200 : 0;
      // Randomized keystroke delay: ±10-20ms
      const randomDelay = Math.random() * 20 - 10;
      const adjustedDelay = delay + punctuationPause + randomDelay;

      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, Math.max(10, adjustedDelay));

      return () => clearTimeout(timer);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [displayedText, text, delay, isComplete, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && <span className="inline-block w-0.5 h-4 bg-foreground ml-1 animate-pulse">|</span>}
    </span>
  );
}

interface ParagraphProps {
  text: string;
  startDelay: number;
  typingDelay?: number;
  isHeading?: boolean;
  isList?: boolean;
  isListItem?: boolean;
  onComplete?: () => void;
}

function Paragraph({ 
  text, 
  startDelay, 
  typingDelay = 30, 
  isHeading = false, 
  isList = false,
  isListItem = false,
  onComplete 
}: ParagraphProps) {
  const [isVisible, setIsVisible] = useState(false);
  const paragraphRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, startDelay);

    return () => clearTimeout(timer);
  }, [startDelay]);

  useEffect(() => {
    if (isVisible && paragraphRef.current) {
      paragraphRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isVisible, displayedText]);

  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!isVisible) return;

    if (displayedText.length < text.length) {
      const currentChar = text[displayedText.length];
      const punctuationPause = ['.', '!', '?'].includes(currentChar) ? 200 : 0;
      const randomDelay = Math.random() * 20 - 10;
      const adjustedDelay = typingDelay + punctuationPause + randomDelay;

      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, Math.max(10, adjustedDelay));

      return () => clearTimeout(timer);
    } else if (displayedText.length === text.length && onComplete) {
      onComplete();
    }
  }, [displayedText, text, typingDelay, isVisible, onComplete]);

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
    return (
      <div 
        ref={paragraphRef}
        className="ml-4 mb-2"
      >
        <p className="text-base text-foreground font-semibold mb-1">
          {text.split('\n')[0]}
        </p>
        <p className="text-sm text-muted-foreground ml-4">
          {text.split('\n').slice(1).join('\n')}
        </p>
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
    { text: "You see everything:", isHeading: false },
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

  let currentDelay = 400; // Start delay: 300-500ms

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="space-y-1">
          {content.map((item, index) => {
            if (item.text === '') {
              currentDelay += 800; // Line break pause: 700-1000ms
              return <div key={index} className="h-3" />;
            }

            const paragraphDelay = currentDelay;
            const typingSpeed = item.isHeading ? 25 : item.isList ? 30 : 30; // 30ms per char (20-35 chars/sec)
            
            // Calculate delay for next element
            const textLength = item.text.length;
            const baseTime = textLength * typingSpeed;
            // Add punctuation pauses
            const punctuationCount = (item.text.match(/[.!?]/g) || []).length;
            const punctuationPause = punctuationCount * 200;
            currentDelay += baseTime + punctuationPause + 500; // Base time + punctuation + pause

            return (
              <Paragraph
                key={index}
                text={item.text}
                startDelay={paragraphDelay}
                typingDelay={typingSpeed}
                isHeading={item.isHeading}
                isList={item.isList}
                isListItem={item.isListItem}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
