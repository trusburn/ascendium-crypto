import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

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

const cryptoSymbols = ['₿', 'Ξ', '◈', '◆', '⟐', '$', '€', '£', '¥'];

export const FloatingCrypto = () => {
  const [symbols, setSymbols] = useState<CryptoSymbol[]>([]);

  useEffect(() => {
    const generateSymbols = () => {
      const newSymbols: CryptoSymbol[] = [];
      for (let i = 0; i < 15; i++) {
        newSymbols.push({
          id: i,
          symbol: cryptoSymbols[Math.floor(Math.random() * cryptoSymbols.length)],
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 24 + 16,
          duration: Math.random() * 10 + 15,
          delay: Math.random() * 5,
          opacity: Math.random() * 0.15 + 0.05,
        });
      }
      setSymbols(newSymbols);
    };

    generateSymbols();
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {symbols.map((item) => (
        <motion.div
          key={item.id}
          className="absolute text-crypto-blue select-none"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            fontSize: `${item.size}px`,
            opacity: item.opacity,
          }}
          animate={{
            y: [0, -30, 0, 30, 0],
            x: [0, 15, 0, -15, 0],
            rotate: [0, 10, 0, -10, 0],
          }}
          transition={{
            duration: item.duration,
            delay: item.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {item.symbol}
        </motion.div>
      ))}
    </div>
  );
};
