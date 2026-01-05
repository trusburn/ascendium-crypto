import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, TrendingUp, Shield, Users } from 'lucide-react';
import { useAdminContent } from '@/hooks/useAdminContent';
import { ScrollReveal, GlassmorphicCard, FluidBackground, AnimatedCounter } from './animations';

export const About = () => {
  const { content } = useAdminContent();
  const features = [
    {
      icon: Coins,
      title: "Multi-Asset Trading",
      description: "Trade Bitcoin, Ethereum, and 100+ cryptocurrencies with our advanced platform.",
      color: 'gold',
    },
    {
      icon: TrendingUp,
      title: "AI-Powered Signals",
      description: "Get expert trading signals powered by machine learning and market analysis.",
      color: 'blue',
    },
    {
      icon: Shield,
      title: "Bank-Grade Security",
      description: "Your funds are protected with military-grade encryption and cold storage.",
      color: 'green',
    },
    {
      icon: Users,
      title: "Expert Support",
      description: "24/7 customer support from crypto experts and financial advisors.",
      color: 'purple',
    }
  ];

  const stats = [
    { value: 50, suffix: 'B+', prefix: '$', label: 'Assets Under Management', color: 'bg-crypto-gradient' },
    { value: 98.7, suffix: '%', label: 'Success Rate', color: 'text-crypto-green' },
    { value: 150, suffix: '+', label: 'Countries Served', color: 'text-crypto-blue' },
    { value: 24, suffix: '/7', label: 'Market Access', color: 'text-crypto-blue' },
  ];

  return (
    <section id="about" className="py-20 relative overflow-hidden">
      <FluidBackground variant="section" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="bg-crypto-gradient bg-clip-text text-transparent">
              {content.aboutTitle}
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Founded in 2019, CryptoVault has become the leading platform for cryptocurrency investment. 
            Our mission is to democratize access to digital assets and empower everyone to participate 
            in the future of finance.
          </p>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
          <ScrollReveal direction="left">
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-foreground">
                The Future of Digital Investment
              </h3>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Cryptocurrency represents the biggest financial revolution since the invention of banking. 
                  Bitcoin, launched in 2009, introduced the concept of decentralized digital money, 
                  freeing transactions from traditional banking systems.
                </p>
                <p>
                  Since then, the crypto market has exploded to over $2 trillion in total value, 
                  creating unprecedented opportunities for investors worldwide. From Ethereum's smart contracts 
                  to DeFi protocols, blockchain technology is reshaping every aspect of finance.
                </p>
                <p>
                  At CryptoVault, we believe everyone deserves access to these opportunities. 
                  Our platform combines cutting-edge technology with intuitive design, 
                  making crypto investment accessible to both beginners and experienced traders.
                </p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right">
            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  className={`p-6 rounded-xl ${index === 0 ? 'bg-crypto-gradient' : 'bg-background/50 backdrop-blur-sm border border-border/50'} text-center`}
                  whileHover={{ scale: 1.05, y: -5 }}
                  transition={{ duration: 0.3 }}
                  style={{ marginTop: index % 2 === 1 ? '2rem' : 0 }}
                >
                  <div className={`text-3xl font-bold ${index === 0 ? 'text-background' : stat.color}`}>
                    <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                  </div>
                  <div className={`text-sm ${index === 0 ? 'text-background/80' : 'text-muted-foreground'}`}>
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <GlassmorphicCard 
                glow={feature.color as 'blue' | 'gold' | 'purple' | 'green'}
                className="p-6 h-full"
              >
                <div className="text-center space-y-4">
                  <motion.div 
                    className="mx-auto w-16 h-16 bg-crypto-gradient rounded-full flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <feature.icon className="h-8 w-8 text-background" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
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
