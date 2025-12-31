import { useMemo, useRef, useEffect } from 'react';
import { AnimatedDigit } from './animated-digit';

interface AnimatedNumberProps {
  value: number;
  previousValue: number | null;
  decimals?: number;
  className?: string;
  suffix?: string;
}

export function AnimatedNumber({ value, previousValue, decimals = 0, className = '', suffix = '' }: AnimatedNumberProps) {
  const currentDigits = useMemo(() => {
    const formatted = value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).replace(/,/g, '');
    return formatted.split('');
  }, [value, decimals]);

  const previousDigits = useMemo(() => {
    if (previousValue === null) return null;
    const formatted = previousValue.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).replace(/,/g, '');
    return formatted.split('');
  }, [previousValue, decimals]);

  // Разделяем на группы по 3 цифры (для разделителей тысяч)
  const formatWithSpaces = (digits: string[]) => {
    const result: (string | JSX.Element)[] = [];
    
    // Обрабатываем целую часть (до точки, если есть)
    const decimalIndex = digits.findIndex(d => d === '.');
    const integerDigits = decimalIndex >= 0 ? digits.slice(0, decimalIndex) : digits;
    const decimalDigits = decimalIndex >= 0 ? digits.slice(decimalIndex + 1) : [];
    
    // Находим соответствующие предыдущие цифры
    const prevDecimalIndex = previousDigits ? previousDigits.findIndex(d => d === '.') : -1;
    const prevIntegerDigits = previousDigits && prevDecimalIndex >= 0 
      ? previousDigits.slice(0, prevDecimalIndex) 
      : (previousDigits || []);
    const prevDecimalDigits = previousDigits && prevDecimalIndex >= 0 
      ? previousDigits.slice(prevDecimalIndex + 1) 
      : [];
    
    // Добавляем целую часть с пробелами (справа налево)
    for (let i = integerDigits.length - 1; i >= 0; i--) {
      const pos = integerDigits.length - 1 - i;
      if (pos > 0 && pos % 3 === 0) {
        result.unshift(' ');
      }
      const prevDigitIndex = prevIntegerDigits.length - integerDigits.length + i;
      const prevDigit = prevDigitIndex >= 0 && prevDigitIndex < prevIntegerDigits.length 
        ? prevIntegerDigits[prevDigitIndex] 
        : null;
      result.unshift(
        <AnimatedDigit
          key={`int-${i}`}
          digit={integerDigits[i]}
          previousDigit={prevDigit}
          className={className}
        />
      );
    }
    
    // Добавляем десятичную часть
    if (decimalDigits.length > 0) {
      result.push('.');
      decimalDigits.forEach((d, i) => {
        const prevDigit = i < prevDecimalDigits.length ? prevDecimalDigits[i] : null;
        result.push(
          <AnimatedDigit
            key={`dec-${i}`}
            digit={d}
            previousDigit={prevDigit}
            className={className}
          />
        );
      });
    }
    
    return result;
  };

  return (
    <span className={className}>
      {formatWithSpaces(currentDigits)}
      {suffix && <span className="ml-1">{suffix}</span>}
    </span>
  );
}
