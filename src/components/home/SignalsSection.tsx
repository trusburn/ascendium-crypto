import { motion } from 'framer-motion';
import { ScrollReveal, GlassmorphicCard, AnimatedCounter } from '@/components/animations';
import { Signal, TrendingUp, Target, Award } from 'lucide-react';
import { useAdminContent } from '@/hooks/useAdminContent';
import { Button } from '@/components/ui/button';

export const SignalsSection = () => {
  const { content } = useAdminContent();

  const signalStats = [
    { label: 'Accuracy Rate', value: 94.7, suffix: '%', color: 'text-crypto-green' },
    { label: 'Avg. Profit', value: 847, prefix: '+', suffix: '%', color: 'text-crypto-gold' },
    { label: 'Signals/Day', value: 15, suffix: '+', color: 'text-crypto-blue' },
  ];

  const recentSignals = [
    { pair: 'BTC/USDT', type: 'Long', profit: '+12.4%', status: 'Won' },
    { pair: 'ETH/USDT', type: 'Long', profit: '+8.7%', status: 'Won' },
    { pair: 'SOL/USDT', type: 'Short', profit: '+15.2%', status: 'Won' },
    { pair: 'BNB/USDT', type: 'Long', profit: '+6.1%', status: 'Won' },
  ];

  return (
    <section className="py-20 relative overflow-hidden bg-muted/30">
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-crypto-gold/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 30, repeat: Infinity }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <ScrollReveal className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-crypto-gold/10 border border-crypto-gold/30 text-crypto-gold mb-6">
            <Signal className="h-4 w-4" />
            <span className="text-sm font-medium">Premium Signals</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="bg-crypto-gradient bg-clip-text text-transparent">
              {content.signalsTitle}
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {content.signalsSubtitle}
          </p>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Stats */}
          <div className="space-y-6">
            <ScrollReveal>
              <div className="grid grid-cols-3 gap-4">
                {signalStats.map((stat, index) => (
                  <GlassmorphicCard key={index} glow="gold" className="p-6 text-center">
                    <div className={`text-3xl font-bold ${stat.color}`}>
                      <AnimatedCounter
                        value={stat.value}
                        prefix={stat.prefix}
                        suffix={stat.suffix}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">{stat.label}</div>
                  </GlassmorphicCard>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <GlassmorphicCard glow="gold" className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-crypto-gold" />
                  Recent Winning Signals
                </h3>
                <div className="space-y-3">
                  {recentSignals.map((signal, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-crypto-gold/10 flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-crypto-gold" />
                        </div>
                        <div>
                          <div className="font-medium">{signal.pair}</div>
                          <div className="text-xs text-muted-foreground">{signal.type}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-crypto-green">{signal.profit}</div>
                        <div className="text-xs text-crypto-green">{signal.status}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GlassmorphicCard>
            </ScrollReveal>
          </div>

          {/* CTA */}
          <ScrollReveal direction="right">
            <GlassmorphicCard glow="gold" className="p-8 text-center">
              <div className="space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-crypto-gradient flex items-center justify-center">
                  <Signal className="h-10 w-10 text-background" />
                </div>
                <h3 className="text-2xl font-bold">Start Trading with Premium Signals</h3>
                <p className="text-muted-foreground">
                  Get access to our expert-curated signals with proven track records. 
                  Join thousands of successful traders today.
                </p>
                <div className="flex flex-col gap-3">
                  <Button size="lg" className="w-full bg-crypto-gradient hover:opacity-90">
                    View All Signals
                  </Button>
                  <Button size="lg" variant="outline" className="w-full border-crypto-gold text-crypto-gold hover:bg-crypto-gold hover:text-background">
                    Learn More
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  *Past performance does not guarantee future results
                </p>
              </div>
            </GlassmorphicCard>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};
