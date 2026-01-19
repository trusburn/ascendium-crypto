import { memo, useMemo } from 'react';

interface CryptoSymbol {
  id: number;
  symbol: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

const cryptoSymbols = ['₿', 'Ξ', '◈', '◆', '$', '€', '£', '¥'];

// Memoized floating crypto component for performance
export const FloatingCrypto = memo(() => {
  // Generate symbols only once with useMemo - reduced count for performance
  const symbols = useMemo<CryptoSymbol[]>(() => {
    const newSymbols: CryptoSymbol[] = [];
    // Reduced from 15 to 8 symbols for better performance
    for (let i = 0; i < 8; i++) {
      newSymbols.push({
        id: i,
        symbol: cryptoSymbols[i % cryptoSymbols.length],
        x: 10 + (i * 12) % 80, // Spread evenly
        y: 10 + (i * 15) % 80,
        size: 18 + (i % 3) * 6, // 18, 24, 30
        duration: 20 + i * 3, // Slower animations
        delay: i * 0.5,
        opacity: 0.06 + (i % 3) * 0.03,
      });
    }
    return newSymbols;
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {symbols.map((item) => (
        <div
          key={item.id}
          className="absolute text-crypto-blue select-none animate-float-smooth"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            fontSize: `${item.size}px`,
            opacity: item.opacity,
            animationDuration: `${item.duration}s`,
            animationDelay: `${item.delay}s`,
            willChange: 'transform',
          }}
        >
          {item.symbol}
        </div>
      ))}
    </div>
  );
});

FloatingCrypto.displayName = 'FloatingCrypto';
