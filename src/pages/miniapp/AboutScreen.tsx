// src/pages/miniapp/AboutScreen.tsx
import { useState, useEffect, useRef } from 'react';
import { Wand2 } from 'lucide-react';

interface ParagraphProps {
  text: string;
  startDelay: number;
  typingDelay?: number;
  isHeading?: boolean;
  isList?: boolean;
  isListItem?: boolean;
  isBold?: boolean;
  hasLeftBorder?: boolean;
  isInBlock?: boolean;
  isSmallText?: boolean;
  isExtraSmallText?: boolean;
  shouldAutoScroll: boolean;
  useFastMode: boolean; // Показывать абзац целиком
}

// Функция для выделения определенных слов жирным
function formatTextWithBold(text: string): (string | JSX.Element)[] {
  const wordsToBold = ['Web3', 'NFT', '~$1'];
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let keyCounter = 0;

  // Создаем регулярное выражение для поиска всех слов, которые нужно сделать жирными
  const regex = new RegExp(`(${wordsToBold.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Добавляем текст до совпадения
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Добавляем жирное слово
    parts.push(<strong key={`bold-${keyCounter++}`}>{match[0]}</strong>);
    lastIndex = match.index + match[0].length;
  }

  // Добавляем оставшийся текст
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function Paragraph({ 
  text, 
  startDelay, 
  typingDelay = 8, 
  isHeading = false, 
  isList = false,
  isListItem = false,
  isBold = false,
  hasLeftBorder = false,
  isInBlock = false,
  isSmallText = false,
  isExtraSmallText = false,
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

    // Если fast mode включен, показываем весь текст сразу без fade-in
    if (useFastMode) {
      setDisplayedText(text);
      setOpacity(1); // Сразу полная непрозрачность, без fade-in
      return;
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
        className={`${isSmallText ? 'text-lg' : 'text-xl'} font-bold text-foreground mb-3 mt-6 first:mt-0 transition-opacity duration-300 ${isWelcomeHeading ? 'font-display' : 'font-sans'}`}
        style={{ opacity }}
      >
        {displayedText}
      </h2>
    );
  }

  if (isList) {
    return (
      <p 
        ref={paragraphRef}
        className={`text-base text-foreground/90 mb-1 transition-opacity duration-300 ml-4 relative flex items-start gap-1.5 ${isBold ? 'font-bold' : ''}`}
        style={{ opacity }}
      >
        <Wand2 className="w-3 h-3 text-foreground/90 flex-shrink-0" />
        <span>{displayedText}</span>
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
        </p>
        {(titleComplete || useFastMode) && (
          <p className="text-sm text-muted-foreground ml-4">
            {useFastMode ? description : descText}
          </p>
        )}
      </div>
    );
  }

  // Применяем форматирование к отображаемому тексту
  const formattedText = formatTextWithBold(displayedText);

  // Определяем размер текста
  let textSize = 'text-base';
  if (isExtraSmallText) {
    textSize = 'text-[12px]';
  } else if (isSmallText) {
    textSize = 'text-sm';
  }

  return (
    <p 
      ref={paragraphRef}
      className={`${textSize} text-foreground/90 leading-relaxed ${isInBlock ? 'mb-1' : 'mb-4'} transition-opacity duration-300 ${isBold ? 'font-bold' : ''} ${hasLeftBorder ? 'pl-4 border-l-2 border-foreground/60' : ''}`}
      style={{ opacity }}
    >
      {formattedText}
    </p>
  );
}

export default function AboutScreen() {
  const [shouldAutoScroll] = useState(false); // Автоскролл отключен
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Проверяем, была ли уже показана анимация
  const hasSeenAnimation = localStorage.getItem('about_animation_seen') === 'true';
  
  // Если анимация уже была показана, используем fast mode для всех параграфов
  const shouldUseFastMode = hasSeenAnimation;

  const content = [
    { text: "Welcome, Lucky One! 🍀", isHeading: true },
    { text: "You've just stepped into a Web3 experience unlike any other on Earth." },
    { text: "" },
    { text: "GiftDraw.today ≠ lottery.", isBold: true, hasLeftBorder: true },
    { text: "This is a New Paradigm.", isBold: true, hasLeftBorder: true },
    { text: "" },
    { text: "We reject gambling and shattered hopes." },
    { text: "Instead, we believe in collective generosity, shared fortune, and mindful participation." },
    { text: "" },
    { text: "Mint an NFT ticket for ~$1 — not as a wager, but as a gift to the world — and join the daily global flow of redistributed value." },
    { text: "" },
    { text: "On-Chain Transparency 🔍", isHeading: true },
    { text: "" },
    { text: "All draws are executed on Solana: 100% on-chain, immutable, and publicly verifiable." },
    { text: "" },
    { text: "Real-time data includes: participant count, prize pool amount, winner count, and a unique draw hash." },
    { text: "" },
    { text: "Nothing is hidden. Nothing is editable. What's on-chain is final." },
    { text: "" },
    { text: "High Winning Probability 🎲", isHeading: true },
    { text: "" },
    { text: "25% of minted tickets win. Winners receive prizes from largest to smallest — just like in poker tournaments." },
    { text: "" },
    { text: "The Grand Prize is always distributed among the top 3 places: equally among all three, split between the top two, or awarded entirely to 1st place." },
    { text: "" },
    { text: "If the Grand Prize isn't won, it keeps growing until claimed." },
    { text: "" },
    { text: "Even with a free ticket, you can not only land a prize-winning place — you can win the entire Grand Prize!" },
    { text: "" },
    { text: "Ticket Types 🎟️", isHeading: true },
    { text: "" },
    { text: "Paid Tickets:", isExtraSmallText: true },
    { text: "Common", isList: true, isBold: true },
    { text: "Standard NFT ticket for ~$1. Weight: 1.0" },
    { text: "" },
    { text: "Event", isList: true, isBold: true },
    { text: "Collectible NFT ticket with a 1 in 1,000 mint chance. Features vibrant thematic design. Weight: 1.5" },
    { text: "" },
    { text: "Legendary", isList: true, isBold: true },
    { text: "Exclusive rare ticket with the highest win weight (2.0) and guaranteed prize. 1 in 10,000 mint chance." },
    { text: "" },
    { text: "Free Tickets:", isExtraSmallText: true },
    { text: "Welcome", isList: true, isBold: true },
    { text: "Free for users invited by friends. Weight: 0.5" },
    { text: "" },
    { text: "Referral", isList: true, isBold: true },
    { text: "Earned when your friend joins and activates their ticket. Weight: 0.8" },
    { text: "" },
    { text: "💡 How free tickets win:", hasLeftBorder: true, isSmallText: true },
    { text: "For every 10 winning paid tickets, 1 free ticket is randomly selected to win.", hasLeftBorder: true, isSmallText: true },
    { text: "" },
    { text: "Prize distribution among all winning tickets — paid and free — is then determined by their Weight.", isSmallText: true },
    { text: "" },
    { text: "🪂 $GIFT Token Airdrop (SPL on Solana)", isHeading: true },
    { text: "Total Supply: 100,000,000 GIFT", isList: true },
    { text: "" },
    { text: "DEX Liquidity: 50,000,000 GIFT (50%)", isList: true },
    { text: "" },
    { text: "Airdrop: 25,000,000 GIFT (25%)", isList: true },
    { text: "" },
    { text: "Presale / CEX / Team: 25,000,000 GIFT (25%)", isList: true },
    { text: "" },
    { text: "🚀 Ready to change your life?", isHeading: true },
    { text: "Join thousands of early winners already shaping the future of fair, joyful, decentralized fortune." },
    { text: "" },
    { text: "You're not late. You're early." },
    { text: "" },
    { text: "Welcome to the revolution. 🌍" },
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
    const typingSpeed = isWelcomeHeading ? 18 : (item.isHeading ? 12 : (item.isList ? 2 : 2));
    const textLength = item.text.length;
    const baseTime = textLength * typingSpeed;
    const punctuationCount = (item.text.match(/[.!?]/g) || []).length;
    const punctuationPause = punctuationCount * (isWelcomeHeading ? 50 : (item.isHeading ? 40 : 30));
    const afterPause = isWelcomeHeading ? 800 : (item.isHeading ? 200 : 100);
    
    currentDelay += baseTime + punctuationPause + afterPause;
  }
  
  // Вычисляем общее время анимации (время последнего параграфа + его задержка)
  const lastItem = content[content.length - 1];
  const lastItemDelay = delays[delays.length - 1];
  const lastItemTypingSpeed = lastItem.isHeading ? 12 : (lastItem.isList ? 2 : 2);
  const lastItemTime = lastItem.text.length * lastItemTypingSpeed;
  const totalAnimationTime = lastItemDelay + lastItemTime + 1000; // +1 секунда на всякий случай
  
  // Сохраняем флаг после завершения анимации (только если анимация была показана)
  useEffect(() => {
    if (!hasSeenAnimation && !shouldUseFastMode) {
      const timer = setTimeout(() => {
        localStorage.setItem('about_animation_seen', 'true');
      }, totalAnimationTime);
      
      return () => clearTimeout(timer);
    }
  }, [hasSeenAnimation, shouldUseFastMode, totalAnimationTime]);

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
            
            // Используем вычисленную задержку (в fast mode все показывается сразу)
            const paragraphDelay = shouldUseFastMode ? 0 : delays[index];
            
            // Определяем скорость печати
            const typingSpeed = isWelcomeHeading ? 18 : (item.isHeading ? 12 : (item.isList ? 2 : 2));

            // Проверяем, нужно ли обернуть в блок с границей
            const hasLeftBorder = item.hasLeftBorder;
            const prevItem = index > 0 ? content[index - 1] : null;
            const isBlockStart = hasLeftBorder && (!prevItem || !prevItem.hasLeftBorder);

            // Если это начало блока, оборачиваем в контейнер
            if (isBlockStart) {
              // Находим все элементы блока (последовательно идущие с hasLeftBorder)
              const blockItems: Array<{ item: typeof content[0], index: number }> = [];
              let blockIndex = index;
              while (blockIndex < content.length) {
                const currentItem = content[blockIndex];
                if (currentItem.text === '') {
                  // Пропускаем пустые строки внутри блока
                  blockIndex++;
                  continue;
                }
                if (currentItem.hasLeftBorder) {
                  blockItems.push({ item: currentItem, index: blockIndex });
                  blockIndex++;
                } else {
                  break;
                }
              }

              return (
                <div key={index} className="pl-4 border-l-2 border-foreground/60">
                  {blockItems.map(({ item: blockItem, index: blockItemIndex }) => {
                    const blockItemDelay = shouldUseFastMode ? 0 : delays[blockItemIndex];
                    const isBlockWelcomeHeading = blockItem.text === WELCOME_HEADING_TEXT;
                    const blockItemTypingSpeed = isBlockWelcomeHeading ? 18 : (blockItem.isHeading ? 12 : (blockItem.isList ? 2 : 2));
                    return (
                      <Paragraph
                        key={blockItemIndex}
                        text={blockItem.text}
                        startDelay={blockItemDelay}
                        typingDelay={blockItemTypingSpeed}
                        isHeading={blockItem.isHeading}
                        isList={blockItem.isList}
                        isListItem={blockItem.isListItem}
                        isBold={blockItem.isBold}
                        hasLeftBorder={false}
                        isInBlock={true}
                        isSmallText={blockItem.isSmallText}
                        isExtraSmallText={blockItem.isExtraSmallText}
                        shouldAutoScroll={shouldAutoScroll}
                        useFastMode={shouldUseFastMode}
                      />
                    );
                  })}
                </div>
              );
            }

            // Если элемент в блоке, но не начало - пропускаем (уже отрендерен в блоке)
            if (hasLeftBorder && !isBlockStart) {
              return null;
            }

            return (
              <Paragraph
                key={index}
                text={item.text}
                startDelay={paragraphDelay}
                typingDelay={typingSpeed}
                isHeading={item.isHeading}
                isList={item.isList}
                isListItem={item.isListItem}
                isBold={item.isBold}
                hasLeftBorder={item.hasLeftBorder}
                isSmallText={item.isSmallText}
                isExtraSmallText={item.isExtraSmallText}
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
