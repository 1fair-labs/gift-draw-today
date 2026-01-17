// src/pages/miniapp/AboutScreen.tsx
import { useState, useEffect } from 'react';

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
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, delay);

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
}

function Paragraph({ text, startDelay, typingDelay = 20, isHeading = false, isList = false }: ParagraphProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, startDelay);

    return () => clearTimeout(timer);
  }, [startDelay]);

  if (!isVisible) return null;

  if (isHeading) {
    return (
      <h2 className="text-xl font-bold text-foreground mb-3 mt-6 first:mt-0">
        <TypingText text={text} delay={typingDelay} />
      </h2>
    );
  }

  if (isList) {
    return (
      <p className="text-sm text-muted-foreground ml-4 mb-2">
        <TypingText text={text} delay={typingDelay} />
      </p>
    );
  }

  return (
    <p className="text-base text-foreground leading-relaxed mb-4">
      <TypingText text={text} delay={typingDelay} />
    </p>
  );
}

export default function AboutScreen() {
  const content = [
    { text: "Welcome, Lucky One! 🍀", isHeading: true },
    { text: "" },
    { text: "The GiftDraw.today team is thrilled to welcome you to a unique Web3 project unlike anything else in the world! GiftDraw.today ≠ lottery. This is a New Paradigm." },
    { text: "" },
    { text: "We stand against gambling and shattered lives! We believe that collective consciousness can achieve incredible things: simply purchase an NFT ticket for just $1 and participate in the global redistribution of funds every single day! GiftDraw.today makes people wealthy daily. 💰" },
    { text: "" },
    { text: "Honesty & Decentralization - Results cannot be faked - the blockchain guarantees it. Every draw is verifiable and immutable." },
    { text: "" },
    { text: "Complete Transparency - You see full information about all participants, the prize pool amount, and the number of winners. You can verify every draw through a unique hash." },
    { text: "" },
    { text: "High Winning Probability - 25% of participants become winners! 🎉 Poker-style tournaments + a jackpot that rolls over to the next draw if not won. The excitement never ends!" },
    { text: "" },
    { text: "Different Ticket Types:", isHeading: true },
    { text: "" },
    { text: "Legendary - 1:10,000 chance when minting. Ultra-rare tickets with extraordinary rewards!" },
    { text: "" },
    { text: "Event - 1:1,000 chance when minting. Special event tickets with enhanced prizes!" },
    { text: "" },
    { text: "Common - Standard ticket with 25% winning chance. Your everyday path to victory!" },
    { text: "" },
    { text: "Airdrop:", isHeading: true },
    { text: "" },
    { text: "$GIFT utility token created on Solana." },
    { text: "" },
    { text: "Total Supply: 100,000,000 GIFT", isList: true },
    { text: "DEX Liquidity (50%): 50,000,000 GIFT", isList: true },
    { text: "Airdrop (25%): 25,000,000 GIFT", isList: true },
    { text: "Presale, CEX, Team (25%): 25,000,000 GIFT", isList: true },
    { text: "" },
    { text: "Ready to Change Your Life? 🚀 Join thousands of winners who are already part of the GiftDraw.today revolution!" },
  ];

  let currentDelay = 0;

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="space-y-1">
          {content.map((item, index) => {
            if (item.text === '') {
              currentDelay += 300; // Пауза между абзацами
              return <div key={index} className="h-3" />;
            }

            const paragraphDelay = currentDelay;
            const typingSpeed = item.isHeading ? 15 : item.isList ? 25 : 20;
            
            // Вычисляем задержку для следующего элемента
            const textLength = item.text.length;
            currentDelay += textLength * typingSpeed + 500; // Время на печать + пауза

            return (
              <Paragraph
                key={index}
                text={item.text}
                startDelay={paragraphDelay}
                typingDelay={typingSpeed}
                isHeading={item.isHeading}
                isList={item.isList}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
