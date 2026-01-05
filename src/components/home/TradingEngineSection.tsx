import { motion } from 'framer-motion';
import { ScrollReveal, GlassmorphicCard } from '@/components/animations';
import { Brain, BarChart3, Zap, Target, ArrowUpRight } from 'lucide-react';
import { useAdminContent } from '@/hooks/useAdminContent';

export const TradingEngineSection = () => {
  const { content } = useAdminContent();

  const features = [
    {
      icon: Brain,
      title: content.tradingEngineFeature1,
      description: 'Neural networks analyze market patterns in real-time',
    },
    {
      icon: BarChart3,
      title: content.tradingEngineFeature2,
      description: 'Process millions of data points per second',
    },
    {
      icon: Zap,
      title: content.tradingEngineFeature3,
      description: 'Smart algorithms lock in gains automatically',
    },
  ];

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-crypto-blue/5 to-background" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <ScrollReveal direction="left">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-crypto-blue/10 border border-crypto-blue/30 text-crypto-blue">
                <Brain className="h-4 w-4" />
                <span className="text-sm font-medium">Powered by AI</span>
              </div>
              
              <h2 className="text-4xl lg:text-5xl font-bold">
                <span className="bg-crypto-gradient bg-clip-text text-transparent">
                  {content.tradingEngineTitle}
                </span>
              </h2>
              
              <p className="text-xl text-muted-foreground">
                {content.tradingEngineSubtitle}
              </p>

              <div className="space-y-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-xl bg-background/50 border border-border/50"
                    whileHover={{ x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="w-12 h-12 rounded-lg bg-crypto-blue/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="h-6 w-6 text-crypto-blue" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right">
            <GlassmorphicCard glow="blue" className="p-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Live Performance</h3>
                  <div className="flex items-center gap-1 text-crypto-green text-sm">
                    <ArrowUpRight className="h-4 w-4" />
                    <span>+24.5%</span>
                  </div>
                </div>

                {/* Animated chart bars */}
                <div className="flex items-end gap-2 h-48">
                  {[65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 72].map((height, index) => (
                    <motion.div
                      key={index}
                      className="flex-1 bg-crypto-gradient rounded-t-sm"
                      initial={{ height: 0 }}
                      whileInView={{ height: `${height}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-crypto-green">94.7%</div>
                    <div className="text-xs text-muted-foreground">Win Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-crypto-blue">1.2ms</div>
                    <div className="text-xs text-muted-foreground">Execution</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-crypto-gold">24/7</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                </div>
              </div>
            </GlassmorphicCard>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};
