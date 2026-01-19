import { memo } from 'react';

interface FluidBackgroundProps {
  variant?: 'hero' | 'section' | 'subtle';
}

// Memoized fluid background with CSS animations instead of Framer Motion for performance
export const FluidBackground = memo(({ variant = 'hero' }: FluidBackgroundProps) => {
  const getConfig = () => {
    switch (variant) {
      case 'hero':
        return {
          orbs: [
            { size: 500, x: '20%', y: '30%', color: 'hsl(var(--crypto-blue) / 0.12)', duration: 25 },
            { size: 400, x: '70%', y: '60%', color: 'hsl(var(--crypto-purple) / 0.1)', duration: 30 },
            { size: 350, x: '50%', y: '20%', color: 'hsl(var(--crypto-electric) / 0.08)', duration: 35 },
          ],
        };
      case 'section':
        return {
          orbs: [
            { size: 350, x: '10%', y: '50%', color: 'hsl(var(--crypto-blue) / 0.06)', duration: 28 },
            { size: 300, x: '80%', y: '30%', color: 'hsl(var(--crypto-purple) / 0.05)', duration: 32 },
          ],
        };
      case 'subtle':
        return {
          orbs: [
            { size: 250, x: '30%', y: '40%', color: 'hsl(var(--crypto-blue) / 0.04)', duration: 35 },
          ],
        };
    }
  };

  const config = getConfig();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {config.orbs.map((orb, index) => (
        <div
          key={index}
          className="absolute rounded-full animate-orb-float"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(80px)',
            animationDuration: `${orb.duration}s`,
            animationDelay: `${index * 2}s`,
            willChange: 'transform',
          }}
        />
      ))}
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
    </div>
  );
});

FluidBackground.displayName = 'FluidBackground';
