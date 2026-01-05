import { motion } from 'framer-motion';
import { ScrollReveal, GlassmorphicCard } from '@/components/animations';
import { 
  Zap, 
  Shield, 
  Clock, 
  Headphones, 
  LineChart, 
  Wallet,
  ArrowRight
} from 'lucide-react';
import { useAdminContent } from '@/hooks/useAdminContent';

export const TrustSection = () => {
  const { content } = useAdminContent();

  const reasons = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Execute trades in milliseconds with our optimized infrastructure',
      color: 'text-crypto-electric',
    },
    {
      icon: Shield,
      title: 'Fully Secured',
      description: 'Bank-grade security with insurance protection for your assets',
      color: 'text-crypto-green',
    },
    {
      icon: Clock,
      title: '24/7 Trading',
      description: 'Markets never sleep, and neither does our platform',
      color: 'text-crypto-blue',
    },
    {
      icon: Headphones,
      title: 'Expert Support',
      description: 'Dedicated team of crypto experts available around the clock',
      color: 'text-crypto-purple',
    },
    {
      icon: LineChart,
      title: 'Advanced Analytics',
      description: 'Professional-grade tools for informed trading decisions',
      color: 'text-crypto-gold',
    },
    {
      icon: Wallet,
      title: 'Easy Withdrawals',
      description: 'Withdraw your funds anytime with minimal fees',
      color: 'text-crypto-green',
    },
  ];

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-crypto-purple/5 to-background" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="bg-crypto-gradient bg-clip-text text-transparent">
              {content.trustTitle}
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {content.trustSubtitle}
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((reason, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <GlassmorphicCard 
                glow={index % 3 === 0 ? 'blue' : index % 3 === 1 ? 'purple' : 'gold'}
                className="p-6 h-full group cursor-pointer"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <motion.div
                      className={`w-14 h-14 rounded-xl bg-current/10 flex items-center justify-center ${reason.color}`}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <reason.icon className="h-7 w-7" />
                    </motion.div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {reason.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {reason.description}
                  </p>
                </div>
              </GlassmorphicCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
