import { motion } from 'framer-motion';

interface FluidBackgroundProps {
  variant?: 'hero' | 'section' | 'subtle';
}

export const FluidBackground = ({ variant = 'hero' }: FluidBackgroundProps) => {
  const getConfig = () => {
    switch (variant) {
      case 'hero':
        return {
          orbs: [
            { size: 600, x: '20%', y: '30%', color: 'hsl(var(--crypto-blue) / 0.15)', duration: 20 },
            { size: 500, x: '70%', y: '60%', color: 'hsl(var(--crypto-purple) / 0.12)', duration: 25 },
            { size: 400, x: '50%', y: '20%', color: 'hsl(var(--crypto-electric) / 0.1)', duration: 18 },
          ],
        };
      case 'section':
        return {
          orbs: [
            { size: 400, x: '10%', y: '50%', color: 'hsl(var(--crypto-blue) / 0.08)', duration: 22 },
            { size: 350, x: '80%', y: '30%', color: 'hsl(var(--crypto-purple) / 0.06)', duration: 28 },
          ],
        };
      case 'subtle':
        return {
          orbs: [
            { size: 300, x: '30%', y: '40%', color: 'hsl(var(--crypto-blue) / 0.05)', duration: 30 },
          ],
        };
    }
  };

  const config = getConfig();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {config.orbs.map((orb, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            scale: [1, 1.2, 1, 0.9, 1],
            x: [0, 50, 0, -50, 0],
            y: [0, -30, 0, 30, 0],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
    </div>
  );
};
