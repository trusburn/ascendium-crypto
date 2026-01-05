import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Bitcoin3D } from './Bitcoin3D';
import { FluidBackground, ScrollReveal } from './animations';
import { ArrowRight, TrendingUp, Shield, Zap, Play } from 'lucide-react';
import { useAdminContent } from '@/hooks/useAdminContent';

export const Hero = () => {
  const { content } = useAdminContent();
  
  return (
    <section id="home" className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
      {/* Fluid Background */}
      <FluidBackground variant="hero" />
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left space-y-8">
            <ScrollReveal>
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-crypto-blue/10 border border-crypto-blue/30 text-crypto-blue"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-2 h-2 rounded-full bg-crypto-green animate-pulse" />
                <span className="text-sm font-medium">Live Trading Active</span>
              </motion.div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                <span className="bg-crypto-gradient bg-clip-text text-transparent">
                  {content.heroTitle}
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <p className="text-xl text-muted-foreground max-w-2xl">
                {content.heroSubtitle}
              </p>
            </ScrollReveal>

            {/* Stats */}
            <ScrollReveal delay={0.3}>
              <div className="grid grid-cols-3 gap-6 py-8">
                <motion.div 
                  className="text-center p-4 rounded-xl bg-background/30 backdrop-blur-sm border border-border/30"
                  whileHover={{ scale: 1.05, borderColor: 'hsl(var(--crypto-gold) / 0.5)' }}
                >
                  <div className="text-3xl font-bold text-crypto-gold">{content.statsTradingVolume || '$2.5B+'}</div>
                  <div className="text-sm text-muted-foreground">{content.tradingVolumeLabel}</div>
                </motion.div>
                <motion.div 
                  className="text-center p-4 rounded-xl bg-background/30 backdrop-blur-sm border border-border/30"
                  whileHover={{ scale: 1.05, borderColor: 'hsl(var(--crypto-blue) / 0.5)' }}
                >
                  <div className="text-3xl font-bold text-crypto-blue">{content.statsActiveTraders || '150K+'}</div>
                  <div className="text-sm text-muted-foreground">{content.activeUsersLabel}</div>
                </motion.div>
                <motion.div 
                  className="text-center p-4 rounded-xl bg-background/30 backdrop-blur-sm border border-border/30"
                  whileHover={{ scale: 1.05, borderColor: 'hsl(var(--crypto-green) / 0.5)' }}
                >
                  <div className="text-3xl font-bold text-crypto-green">{content.statsUptime || '99.9%'}</div>
                  <div className="text-sm text-muted-foreground">{content.uptimeLabel}</div>
                </motion.div>
              </div>
            </ScrollReveal>

            {/* CTA Buttons */}
            <ScrollReveal delay={0.4}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <a href="/auth">
                    <Button size="lg" className="bg-crypto-gradient hover:opacity-90 text-background group px-8">
                      Start Investing
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </a>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <a href="/dashboard">
                    <Button size="lg" variant="outline" className="border-crypto-blue text-crypto-blue hover:bg-crypto-blue hover:text-background group px-8">
                      <Play className="mr-2 h-4 w-4" />
                      View Dashboard
                    </Button>
                  </a>
                </motion.div>
              </div>
            </ScrollReveal>

            {/* Features */}
            <ScrollReveal delay={0.5}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
                {[
                  { icon: TrendingUp, text: 'High Returns', color: 'text-crypto-green' },
                  { icon: Shield, text: 'Secure Platform', color: 'text-crypto-blue' },
                  { icon: Zap, text: 'Instant Trading', color: 'text-crypto-gold' },
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center space-x-3 justify-center lg:justify-start"
                    whileHover={{ x: 5 }}
                  >
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    <span className="text-sm text-foreground">{feature.text}</span>
                  </motion.div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Right Content - 3D Bitcoin */}
          <ScrollReveal direction="right" className="flex justify-center lg:justify-end">
            <div className="relative">
              <Bitcoin3D />
              {/* Floating elements */}
              <motion.div 
                className="absolute -top-4 -right-4"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <div className="bg-crypto-green/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-crypto-green border border-crypto-green/30 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  +24.5%
                </div>
              </motion.div>
              <motion.div 
                className="absolute -bottom-4 -left-4"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
              >
                <div className="bg-crypto-blue/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-crypto-blue border border-crypto-blue/30">
                  ₿ BTC
                </div>
              </motion.div>
              <motion.div 
                className="absolute top-1/2 -right-8"
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 5, repeat: Infinity, delay: 2 }}
              >
                <div className="bg-crypto-purple/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-crypto-purple border border-crypto-purple/30">
                  Ξ ETH
                </div>
              </motion.div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-crypto-blue"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
};
