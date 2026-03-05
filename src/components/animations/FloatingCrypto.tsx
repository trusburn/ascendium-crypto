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
  animClass: string;
}

const cryptoSymbols = ['₿', 'Ξ', '◈', '◆', '$', '€', '£', '¥', '₮', 'Ł', '◇', '⟐'];
const animClasses = [
  'animate-float-drift-1',
  'animate-float-drift-2',
  'animate-float-drift-3',
  'animate-float-rise',
  'animate-float-sway',
];

export const FloatingCrypto = memo(() => {
  const symbols = useMemo<CryptoSymbol[]>(() => {
    const newSymbols: CryptoSymbol[] = [];
    for (let i = 0; i < 20; i++) {
      newSymbols.push({
        id: i,
        symbol: cryptoSymbols[i % cryptoSymbols.length],
        x: (7 + (i * 17 + (i % 3) * 11) % 86),
        y: (5 + (i * 13 + (i % 4) * 7) % 90),
        size: 14 + (i % 5) * 5,
        duration: 18 + (i % 7) * 4,
        delay: i * 0.7,
        opacity: 0.04 + (i % 4) * 0.02,
        animClass: animClasses[i % animClasses.length],
      });
    }
    return newSymbols;
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {symbols.map((item) => (
        <div
          key={item.id}
          className={`absolute text-crypto-blue select-none ${item.animClass}`}
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            fontSize: `${item.size}px`,
            opacity: item.opacity,
            animationDuration: `${item.duration}s`,
            animationDelay: `${item.delay}s`,
            willChange: 'transform, opacity',
          }}
        >
          {item.symbol}
        </div>
      ))}
      
      {/* Coin circles with glow */}
      {[...Array(6)].map((_, i) => (
        <div
          key={`coin-${i}`}
          className="absolute animate-float-rise"
          style={{
            left: `${12 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            animationDuration: `${22 + i * 5}s`,
            animationDelay: `${i * 1.5}s`,
            willChange: 'transform, opacity',
          }}
        >
          <div
            className="rounded-full border border-crypto-blue/20"
            style={{
              width: `${30 + i * 8}px`,
              height: `${30 + i * 8}px`,
              background: `radial-gradient(circle, hsl(var(--crypto-blue) / 0.06), transparent 70%)`,
              boxShadow: `0 0 ${15 + i * 5}px hsl(var(--crypto-blue) / 0.08)`,
            }}
          />
        </div>
      ))}
    </div>
  );
});

FloatingCrypto.displayName = 'FloatingCrypto';
