import { motion } from 'framer-motion';
import { ScrollReveal, GlassmorphicCard, AnimatedCounter } from '@/components/animations';
import { TrendingUp, Users, Globe, Clock } from 'lucide-react';
import { useAdminContent } from '@/hooks/useAdminContent';

export const StatsSection = () => {
  const { content } = useAdminContent();

  const stats = [
    {
      icon: TrendingUp,
      value: 2500000000,
      prefix: '$',
      suffix: '+',
      label: content.tradingVolumeLabel,
      color: 'text-crypto-gold',
    },
    {
      icon: Users,
      value: 150000,
      suffix: '+',
      label: content.activeUsersLabel,
      color: 'text-crypto-blue',
    },
    {
      icon: Globe,
      value: 150,
      suffix: '+',
      label: 'Countries',
      color: 'text-crypto-purple',
    },
    {
      icon: Clock,
      value: 99.9,
      suffix: '%',
      label: content.uptimeLabel,
      color: 'text-crypto-green',
    },
  ];

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="bg-crypto-gradient bg-clip-text text-transparent">
              {content.statsTitle}
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {content.statsSubtitle}
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <GlassmorphicCard 
                glow={index === 0 ? 'gold' : index === 1 ? 'blue' : index === 2 ? 'purple' : 'green'}
                className="p-8"
              >
                <div className="text-center space-y-4">
                  <motion.div
                    className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${stat.color} bg-current/10`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.8 }}
                  >
                    <stat.icon className="h-8 w-8" />
                  </motion.div>
                  <div className={`text-4xl font-bold ${stat.color}`}>
                    <AnimatedCounter
                      value={stat.value}
                      prefix={stat.prefix}
                      suffix={stat.suffix}
                    />
                  </div>
                  <div className="text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </div>
              </GlassmorphicCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
