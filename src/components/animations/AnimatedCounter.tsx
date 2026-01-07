import { motion, useSpring, useTransform, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  decimals?: number;
}

export const AnimatedCounter = ({
  value,
  prefix = '',
  suffix = '',
  duration = 1.2,
  className = '',
  decimals = 2,
}: AnimatedCounterProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [displayValue, setDisplayValue] = useState('0');

  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });

  // Format the number with proper commas and decimals
  const formatNumber = (num: number): string => {
    // Handle very small numbers
    if (Math.abs(num) < 0.01 && num !== 0) {
      return num.toFixed(decimals);
    }
    
    // Format with commas and appropriate decimals
    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: num % 1 !== 0 ? decimals : 0,
      maximumFractionDigits: decimals,
    });
    
    return formatted;
  };

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      setDisplayValue(formatNumber(latest));
    });
    
    return () => unsubscribe();
  }, [spring, decimals]);

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  // Set initial display value if value is already set
  useEffect(() => {
    if (!isInView) {
      setDisplayValue(formatNumber(0));
    }
  }, []);

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{displayValue}</motion.span>
      {suffix}
    </span>
  );
};
