import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Star, Zap, TrendingUp, Shield, BarChart3 } from 'lucide-react';

export const Services = () => {
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
      color: "border-border"
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
      color: "border-crypto-blue"
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
      color: "border-crypto-gold"
    }
  ];

  const services = [
    {
      icon: TrendingUp,
      title: "Smart Trading",
      description: "AI-powered algorithms execute trades 24/7 to maximize your returns"
    },
    {
      icon: BarChart3,
      title: "Portfolio Analytics",
      description: "Advanced analytics and insights to track and optimize your investments"
    },
    {
      icon: Shield,
      title: "Risk Management",
      description: "Sophisticated risk controls to protect your capital in volatile markets"
    },
    {
      icon: Zap,
      title: "Instant Execution",
      description: "Lightning-fast order execution with minimal slippage and fees"
    }
  ];

  return (
    <section id="services" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Services Grid */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="bg-crypto-gradient bg-clip-text text-transparent">
              Our Services
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Professional-grade trading tools and services designed to maximize your crypto investment returns
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {services.map((service, index) => (
            <Card key={index} className="bg-background/50 backdrop-blur-sm border border-border/50 hover:border-crypto-blue/50 transition-all duration-300 group">
              <CardContent className="p-6 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-crypto-gradient rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <service.icon className="h-8 w-8 text-background" />
                </div>
                <h3 className="text-lg font-semibold">{service.title}</h3>
                <p className="text-sm text-muted-foreground">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pricing Plans */}
        <div className="text-center mb-16">
          <h3 className="text-3xl lg:text-4xl font-bold mb-4">Investment Plans</h3>
          <p className="text-lg text-muted-foreground">Choose the plan that fits your investment goals</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative ${plan.color} ${plan.popular ? 'ring-2 ring-crypto-blue scale-105' : ''} transition-all duration-300 hover:scale-105`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-crypto-gradient px-4 py-1 rounded-full text-sm font-medium text-background flex items-center space-x-1">
                    <Star className="h-4 w-4" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-center space-x-1">
                    <span className="text-4xl font-bold bg-crypto-gradient bg-clip-text text-transparent">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <Check className="h-5 w-5 text-crypto-green flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button className={`w-full ${plan.popular ? 'bg-crypto-gradient hover:opacity-90' : 'bg-muted hover:bg-muted/80'} text-background`}>
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            * Returns are not guaranteed and past performance does not indicate future results. 
            Cryptocurrency investments carry significant risk.
          </p>
        </div>
      </div>
    </section>
  );
};