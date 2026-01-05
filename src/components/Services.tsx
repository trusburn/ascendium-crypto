import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Star, Zap, TrendingUp, Shield, BarChart3 } from 'lucide-react';
import { useAdminContent } from '@/hooks/useAdminContent';
import { ScrollReveal, GlassmorphicCard, FluidBackground } from './animations';

export const Services = () => {
  const { content } = useAdminContent();
  const plans = [
    {
      name: "Starter",
      price: "$99",
      period: "/month",
      description: "Perfect for crypto beginners",
      features: [
        "Basic trading signals",
        "5% monthly returns*",
        "Email support",
        "Mobile app access",
        "Educational resources"
      ],
      popular: false,
      glow: 'blue' as const,
    },
    {
      name: "Professional", 
      price: "$299",
      period: "/month",
      description: "For serious investors",
      features: [
        "Advanced AI signals",
        "12% monthly returns*",
        "Priority support",
        "Advanced analytics",
        "Portfolio management",
        "DeFi opportunities"
      ],
      popular: true,
      glow: 'purple' as const,
    },
    {
      name: "Elite",
      price: "$799", 
      period: "/month",
      description: "Maximum profit potential",
      features: [
        "Premium AI algorithms",
        "25% monthly returns*",
        "Dedicated account manager",
        "Custom strategies",
        "Institutional tools",
        "Early access features",
        "VIP community access"
      ],
      popular: false,
      glow: 'gold' as const,
    }
  ];

  const services = [
    {
      icon: TrendingUp,
      title: "Smart Trading",
      description: "AI-powered algorithms execute trades 24/7 to maximize your returns",
      color: 'green',
    },
    {
      icon: BarChart3,
      title: "Portfolio Analytics",
      description: "Advanced analytics and insights to track and optimize your investments",
      color: 'blue',
    },
    {
      icon: Shield,
      title: "Risk Management",
      description: "Sophisticated risk controls to protect your capital in volatile markets",
      color: 'purple',
    },
    {
      icon: Zap,
      title: "Instant Execution",
      description: "Lightning-fast order execution with minimal slippage and fees",
      color: 'gold',
    }
  ];

  return (
    <section id="services" className="py-20 relative overflow-hidden">
      <FluidBackground variant="subtle" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Services Grid */}
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="bg-crypto-gradient bg-clip-text text-transparent">
              {content.servicesTitle}
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Professional-grade trading tools and services designed to maximize your crypto investment returns
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {services.map((service, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <GlassmorphicCard 
                glow={service.color as 'blue' | 'gold' | 'purple' | 'green'}
                className="p-6 h-full"
              >
                <div className="text-center space-y-4">
                  <motion.div 
                    className="mx-auto w-16 h-16 bg-crypto-gradient rounded-full flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <service.icon className="h-8 w-8 text-background" />
                  </motion.div>
                  <h3 className="text-lg font-semibold">{service.title}</h3>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </div>
              </GlassmorphicCard>
            </ScrollReveal>
          ))}
        </div>

        {/* Pricing Plans */}
        <ScrollReveal className="text-center mb-16">
          <h3 className="text-3xl lg:text-4xl font-bold mb-4">Investment Plans</h3>
          <p className="text-lg text-muted-foreground">Choose the plan that fits your investment goals</p>
        </ScrollReveal>

        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <ScrollReveal key={index} delay={index * 0.15}>
              <motion.div
                className={`relative ${plan.popular ? 'lg:-mt-4 lg:mb-4' : ''}`}
                whileHover={{ y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {plan.popular && (
                  <motion.div 
                    className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="bg-crypto-gradient px-4 py-1 rounded-full text-sm font-medium text-background flex items-center space-x-1">
                      <Star className="h-4 w-4" />
                      <span>Most Popular</span>
                    </div>
                  </motion.div>
                )}
                
                <GlassmorphicCard 
                  glow={plan.glow}
                  className={`p-8 h-full ${plan.popular ? 'ring-2 ring-crypto-purple/50' : ''}`}
                >
                  <div className="text-center pb-6 border-b border-border/50">
                    <h4 className="text-2xl font-bold mb-2">{plan.name}</h4>
                    <div className="flex items-baseline justify-center space-x-1 mb-2">
                      <span className="text-4xl font-bold bg-crypto-gradient bg-clip-text text-transparent">
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="py-6 space-y-4">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.div 
                        key={featureIndex} 
                        className="flex items-center space-x-3"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: featureIndex * 0.1 }}
                      >
                        <div className="w-5 h-5 rounded-full bg-crypto-green/20 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-crypto-green" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-crypto-gradient hover:opacity-90' : 'bg-muted hover:bg-muted/80'} text-foreground`}
                    >
                      Get Started
                    </Button>
                  </motion.div>
                </GlassmorphicCard>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            * Returns are not guaranteed and past performance does not indicate future results. 
            Cryptocurrency investments carry significant risk.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
};
