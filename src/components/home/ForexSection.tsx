import { motion } from 'framer-motion';
import { ScrollReveal, GlassmorphicCard } from '@/components/animations';
import { Globe, TrendingUp, Clock, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAdminContent } from '@/hooks/useAdminContent';

const forexPairs = [
  { pair: 'EUR/USD', price: '1.0892', change: '+0.32%', trend: 'up' },
  { pair: 'GBP/USD', price: '1.2654', change: '+0.18%', trend: 'up' },
  { pair: 'USD/JPY', price: '149.85', change: '-0.45%', trend: 'down' },
  { pair: 'AUD/USD', price: '0.6543', change: '+0.12%', trend: 'up' },
  { pair: 'USD/CHF', price: '0.8765', change: '-0.08%', trend: 'down' },
  { pair: 'USD/CAD', price: '1.3542', change: '+0.22%', trend: 'up' },
];

export const ForexSection = () => {
  const { content } = useAdminContent();

  const features = [
    {
      icon: Globe,
      title: 'Global Markets',
      description: 'Trade major, minor, and exotic currency pairs from markets worldwide',
    },
    {
      icon: Clock,
      title: '24/5 Trading',
      description: 'Access forex markets around the clock, 5 days a week',
    },
    {
      icon: TrendingUp,
      title: 'High Leverage',
      description: 'Maximize your trading potential with competitive leverage options',
    },
    {
      icon: DollarSign,
      title: 'Tight Spreads',
      description: 'Benefit from some of the tightest spreads in the industry',
    },
  ];

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-crypto-purple/5 to-background" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <ScrollReveal className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-crypto-gold/10 border border-crypto-gold/30 text-crypto-gold mb-6">
            <Globe className="h-4 w-4" />
            <span className="text-sm font-medium">Forex Trading</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="bg-crypto-gradient bg-clip-text text-transparent">
              Trade Global Currencies
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Access the world's largest financial market with over $6.6 trillion daily volume. 
            Trade forex alongside crypto for a diversified portfolio.
          </p>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Live Forex Rates */}
          <ScrollReveal direction="left">
            <GlassmorphicCard glow="gold" className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Live Forex Rates</h3>
                <div className="flex items-center gap-1 text-crypto-green text-sm">
                  <div className="w-2 h-2 rounded-full bg-crypto-green animate-pulse" />
                  <span>Live</span>
                </div>
              </div>
              
              <div className="space-y-3">
                {forexPairs.map((pair, index) => (
                  <motion.div
                    key={pair.pair}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-crypto-gradient flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-background" />
                      </div>
                      <span className="font-semibold">{pair.pair}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-semibold">{pair.price}</div>
                      <div className={`flex items-center gap-1 text-sm ${pair.trend === 'up' ? 'text-crypto-green' : 'text-red-500'}`}>
                        {pair.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {pair.change}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassmorphicCard>
          </ScrollReveal>

          {/* Features */}
          <ScrollReveal direction="right">
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="p-6 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50"
                  whileHover={{ y: -5, borderColor: 'hsl(var(--crypto-gold) / 0.5)' }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="w-12 h-12 rounded-lg bg-crypto-gold/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-crypto-gold" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '$6.6T', label: 'Daily Volume', color: 'text-crypto-gold' },
            { value: '50+', label: 'Currency Pairs', color: 'text-crypto-blue' },
            { value: '0.1', label: 'Pip Spreads', color: 'text-crypto-green' },
            { value: '500:1', label: 'Max Leverage', color: 'text-crypto-purple' },
          ].map((stat, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <motion.div
                className="text-center p-6 rounded-xl bg-background/30 backdrop-blur-sm border border-border/30"
                whileHover={{ scale: 1.05 }}
              >
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
