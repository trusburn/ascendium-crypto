import { motion } from 'framer-motion';
import { ReactNode, memo } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade';
  delay?: number;
  duration?: number;
  className?: string;
}

// Memoized ScrollReveal for better performance
export const ScrollReveal = memo(({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.5,
  className = '',
}: ScrollRevealProps) => {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { opacity: 0, y: 30 }; // Reduced from 60 for smoother animation
      case 'down':
        return { opacity: 0, y: -30 };
      case 'left':
        return { opacity: 0, x: 30 };
      case 'right':
        return { opacity: 0, x: -30 };
      case 'fade':
        return { opacity: 0 };
      default:
        return { opacity: 0, y: 30 };
    }
  };

  const getFinalPosition = () => {
    switch (direction) {
      case 'up':
      case 'down':
        return { opacity: 1, y: 0 };
      case 'left':
      case 'right':
        return { opacity: 1, x: 0 };
      case 'fade':
        return { opacity: 1 };
      default:
        return { opacity: 1, y: 0 };
    }
  };

  return (
    <motion.div
      className={className}
      initial={getInitialPosition()}
      whileInView={getFinalPosition()}
      viewport={{ once: true, margin: '-50px', amount: 0.1 }}
      transition={{
        duration,
        delay,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
});

ScrollReveal.displayName = 'ScrollReveal';
