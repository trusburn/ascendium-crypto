import { Card, CardContent } from '@/components/ui/card';
import { Coins, TrendingUp, Shield, Users } from 'lucide-react';
import { useAdminContent } from '@/hooks/useAdminContent';

export const About = () => {
  const { content } = useAdminContent();
  const features = [
    {
      icon: Coins,
      title: "Multi-Asset Trading",
      description: "Trade Bitcoin, Ethereum, and 100+ cryptocurrencies with our advanced platform."
    },
    {
      icon: TrendingUp,
      title: "AI-Powered Signals",
      description: "Get expert trading signals powered by machine learning and market analysis."
    },
    {
      icon: Shield,
      title: "Bank-Grade Security",
      description: "Your funds are protected with military-grade encryption and cold storage."
    },
    {
      icon: Users,
      title: "Expert Support",
      description: "24/7 customer support from crypto experts and financial advisors."
    }
  ];

  return (
    <section id="about" className="py-20 bg-muted/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
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
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center mb-16">
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

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-crypto-gradient p-6 rounded-lg text-center">
                <div className="text-3xl font-bold text-background">$50B+</div>
                <div className="text-sm text-background/80">Assets Under Management</div>
              </div>
              <div className="bg-background border border-border p-6 rounded-lg text-center">
                <div className="text-3xl font-bold text-crypto-green">98.7%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
            <div className="space-y-4 mt-8">
              <div className="bg-background border border-border p-6 rounded-lg text-center">
                <div className="text-3xl font-bold text-crypto-blue">150+</div>
                <div className="text-sm text-muted-foreground">Countries Served</div>
              </div>
              <div className="bg-crypto-blue/10 border border-crypto-blue/30 p-6 rounded-lg text-center">
                <div className="text-3xl font-bold text-crypto-blue">24/7</div>
                <div className="text-sm text-crypto-blue/80">Market Access</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="bg-background/50 backdrop-blur-sm border border-border/50 hover:border-crypto-blue/50 transition-all duration-300 group">
              <CardContent className="p-6 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-crypto-gradient rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-8 w-8 text-background" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};