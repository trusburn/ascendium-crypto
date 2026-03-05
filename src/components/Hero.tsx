import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Bitcoin3D } from './Bitcoin3D';
import { FluidBackground, ScrollReveal, TextReveal } from './animations';
import { ArrowRight, TrendingUp, Shield, Zap, Play } from 'lucide-react';
import { useAdminContent } from '@/hooks/useAdminContent';
import { memo } from 'react';

const StatCard = memo(({ value, label, color }: { value: string; label: string; color: string }) => (
  <motion.div 
    className={`text-center p-4 rounded-xl bg-background/30 backdrop-blur-sm border border-border/30`}
    whileHover={{ scale: 1.05, borderColor: `hsl(var(--${color}) / 0.5)` }}
    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
  >
    <div className={`text-3xl font-bold text-${color}`}>{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </motion.div>
));

StatCard.displayName = 'StatCard';

const FeatureItem = memo(({ icon: Icon, text, color, delay }: { icon: typeof TrendingUp; text: string; color: string; delay: number }) => (
  <motion.div 
    className="flex items-center space-x-3 justify-center lg:justify-start"
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ x: 6 }}
  >
    <motion.div
      animate={{ rotate: [0, 10, -10, 0] }}
      transition={{ duration: 3, repeat: Infinity, delay: delay * 2 }}
    >
      <Icon className={`h-6 w-6 ${color}`} />
    </motion.div>
    <span className="text-sm text-foreground">{text}</span>
  </motion.div>
));

FeatureItem.displayName = 'FeatureItem';

export const Hero = memo(() => {
  const { content } = useAdminContent();
  
  return (
    <section id="home" className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
      <FluidBackground variant="hero" />
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-crypto-blue/10 border border-crypto-blue/30 text-crypto-blue">
                <div className="w-2 h-2 rounded-full bg-crypto-green animate-pulse" />
                <span className="text-sm font-medium">Live Trading Active</span>
              </div>
            </motion.div>

            <TextReveal delay={0.15} variant="slide-up">
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                <span className="animate-text-shimmer bg-clip-text inline-block" style={{ backgroundSize: '200% auto', backgroundImage: 'linear-gradient(90deg, hsl(var(--crypto-blue)), hsl(var(--crypto-purple)), hsl(var(--crypto-electric)), hsl(var(--crypto-blue)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'text-shimmer 5s linear infinite' }}>
                  {content.heroTitle || 'Trade Crypto & Forex'}
                </span>
              </h1>
            </TextReveal>

            <TextReveal delay={0.3} variant="glow-in">
              <p className="text-xl text-muted-foreground max-w-2xl">
                {content.heroSubtitle || 'Your gateway to global markets. Trade cryptocurrencies and forex with AI-powered signals and professional tools.'}
              </p>
            </TextReveal>

            {/* Stats */}
            <ScrollReveal delay={0.4}>
              <div className="grid grid-cols-3 gap-6 py-8">
                <StatCard 
                  value={content.statsTradingVolume || '$2.5B+'} 
                  label={content.tradingVolumeLabel || 'Trading Volume'} 
                  color="crypto-gold" 
                />
                <StatCard 
                  value={content.statsActiveTraders || '150K+'} 
                  label={content.activeUsersLabel || 'Active Traders'} 
                  color="crypto-blue" 
                />
                <StatCard 
                  value={content.statsUptime || '99.9%'} 
                  label={content.uptimeLabel || 'Uptime'} 
                  color="crypto-green" 
                />
              </div>
            </ScrollReveal>

            {/* CTA Buttons */}
            <ScrollReveal delay={0.5}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a href="/auth">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                    <Button size="lg" className="bg-crypto-gradient hover:opacity-90 text-background group px-8">
                      Start Investing
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </motion.div>
                </a>
                <a href="/dashboard">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                    <Button size="lg" variant="outline" className="border-crypto-blue text-crypto-blue hover:bg-crypto-blue hover:text-background group px-8">
                      <Play className="mr-2 h-4 w-4" />
                      View Dashboard
                    </Button>
                  </motion.div>
                </a>
              </div>
            </ScrollReveal>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
              <FeatureItem icon={TrendingUp} text="High Returns" color="text-crypto-green" delay={0.6} />
              <FeatureItem icon={Shield} text="Secure Platform" color="text-crypto-blue" delay={0.7} />
              <FeatureItem icon={Zap} text="Instant Trading" color="text-crypto-gold" delay={0.8} />
            </div>
          </div>

          {/* Right Content - 3D Bitcoin */}
          <motion.div 
            className="flex justify-center lg:justify-end"
            initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
          >
            <div className="relative">
              <Bitcoin3D />
              <div className="absolute -top-4 -right-4 animate-float-drift-1" style={{ animationDuration: '6s' }}>
                <div className="bg-crypto-green/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-crypto-green border border-crypto-green/30 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  +24.5%
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 animate-float-drift-2" style={{ animationDuration: '8s' }}>
                <div className="bg-crypto-blue/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-crypto-blue border border-crypto-blue/30">
                  € EUR/USD
                </div>
              </div>
              <div className="absolute top-1/2 -right-8 animate-float-sway" style={{ animationDuration: '7s' }}>
                <div className="bg-crypto-purple/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-crypto-purple border border-crypto-purple/30">
                  £ GBP/USD
                </div>
              </div>
              <div className="absolute bottom-1/3 -right-12 animate-float-rise" style={{ animationDuration: '9s' }}>
                <div className="bg-crypto-gold/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-crypto-gold border border-crypto-gold/30">
                  ₿ BTC
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float-smooth" style={{ animationDuration: '3s' }}>
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-crypto-blue animate-bounce" />
        </div>
      </div>
    </section>
  );
});

Hero.displayName = 'Hero';
