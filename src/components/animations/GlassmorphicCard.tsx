import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassmorphicCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'blue' | 'gold' | 'purple' | 'green' | 'none';
}

export const GlassmorphicCard = ({
  children,
  className = '',
  hover = true,
  glow = 'blue',
}: GlassmorphicCardProps) => {
  const glowColors = {
    blue: 'hover:shadow-[0_0_40px_hsl(var(--crypto-blue)/0.3)]',
    gold: 'hover:shadow-[0_0_40px_hsl(var(--crypto-gold)/0.3)]',
    purple: 'hover:shadow-[0_0_40px_hsl(var(--crypto-purple)/0.3)]',
    green: 'hover:shadow-[0_0_40px_hsl(var(--crypto-green)/0.3)]',
    none: '',
  };

  const borderColors = {
    blue: 'hover:border-crypto-blue/50',
    gold: 'hover:border-crypto-gold/50',
    purple: 'hover:border-crypto-purple/50',
    green: 'hover:border-crypto-green/50',
    none: '',
  };

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-xl
        bg-background/40 backdrop-blur-xl
        border border-border/50
        ${hover ? glowColors[glow] : ''}
        ${hover ? borderColors[glow] : ''}
        transition-all duration-500
        ${className}
      `}
      whileHover={hover ? { y: -5, scale: 1.02 } : undefined}
      transition={{ duration: 0.3 }}
    >
      {/* Inner glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
};
