import { useState } from 'react';
import { motion } from 'framer-motion';
import { ScrollReveal, GlassmorphicCard } from '@/components/animations';
import { BarChart3, Bitcoin, DollarSign } from 'lucide-react';
import TradingViewChart from '@/components/TradingViewChart';
import ForexChart from '@/components/ForexChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const MarketChartsSection = () => {
  const [activeTab, setActiveTab] = useState('crypto');

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-crypto-green/5 to-background" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <ScrollReveal className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-crypto-green/10 border border-crypto-green/30 text-crypto-green mb-6">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">Live Market Data</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="bg-crypto-gradient bg-clip-text text-transparent">
              Real-Time Market Charts
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Monitor cryptocurrency and forex markets in real-time with professional-grade charting tools
          </p>
        </ScrollReveal>

        <ScrollReveal>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="bg-background/50 backdrop-blur-sm border border-border/50 p-1">
                <TabsTrigger 
                  value="crypto" 
                  className="data-[state=active]:bg-crypto-gradient data-[state=active]:text-background gap-2"
                >
                  <Bitcoin className="h-4 w-4" />
                  Crypto Markets
                </TabsTrigger>
                <TabsTrigger 
                  value="forex"
                  className="data-[state=active]:bg-crypto-gradient data-[state=active]:text-background gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  Forex Markets
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="crypto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <GlassmorphicCard glow="green" className="p-0 overflow-hidden">
                  <TradingViewChart />
                </GlassmorphicCard>
              </motion.div>
            </TabsContent>

            <TabsContent value="forex">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <GlassmorphicCard glow="gold" className="p-0 overflow-hidden">
                  <ForexChart />
                </GlassmorphicCard>
              </motion.div>
            </TabsContent>
          </Tabs>
        </ScrollReveal>

        {/* Market Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          {[
            { label: 'BTC Dominance', value: '52.4%', trend: '+0.8%', color: 'text-crypto-gold' },
            { label: 'Total Market Cap', value: '$2.1T', trend: '+2.3%', color: 'text-crypto-blue' },
            { label: 'USD Index', value: '104.25', trend: '-0.12%', color: 'text-crypto-green' },
            { label: 'Fear & Greed', value: '67', trend: 'Greed', color: 'text-crypto-purple' },
          ].map((indicator, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <motion.div
                className="p-4 rounded-xl bg-background/30 backdrop-blur-sm border border-border/30 text-center"
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-sm text-muted-foreground mb-1">{indicator.label}</div>
                <div className={`text-2xl font-bold ${indicator.color}`}>{indicator.value}</div>
                <div className="text-xs text-muted-foreground">{indicator.trend}</div>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};
