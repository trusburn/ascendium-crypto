import { motion } from 'framer-motion';
import { memo, ReactNode } from 'react';

interface TextRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  variant?: 'slide-up' | 'letter-fade' | 'shimmer' | 'glow-in';
}

export const TextReveal = memo(({ children, delay = 0, className = '', variant = 'slide-up' }: TextRevealProps) => {
  if (variant === 'shimmer') {
    return (
      <motion.div
        className={`animate-text-shimmer bg-clip-text ${className}`}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay }}
      >
        {children}
      </motion.div>
    );
  }

  if (variant === 'glow-in') {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0, filter: 'blur(10px)' }}
        whileInView={{ opacity: 1, filter: 'blur(0px)' }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    );
  }

  if (variant === 'letter-fade' && typeof children === 'string') {
    return (
      <motion.span
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {children.split('').map((char, i) => (
          <motion.span
            key={i}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.04, delay: delay + i * 0.03 }}
          >
            {char}
          </motion.span>
        ))}
      </motion.span>
    );
  }

  // Default: slide-up
  return (
    <motion.div
      className={`overflow-hidden ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
    >
      <motion.div
        variants={{
          hidden: { y: '100%', opacity: 0 },
          visible: { y: '0%', opacity: 1 },
        }}
        transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
});

TextReveal.displayName = 'TextReveal';
