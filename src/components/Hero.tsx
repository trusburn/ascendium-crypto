import { Button } from '@/components/ui/button';
import { Bitcoin3D } from './Bitcoin3D';
import { ArrowRight, TrendingUp, Shield, Zap } from 'lucide-react';

export const Hero = () => {
  return (
    <section id="home" className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-hero-gradient"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,hsl(var(--crypto-blue)/0.1)_0%,transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--crypto-purple)/0.1)_0%,transparent_50%)]"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-bold">
                <span className="bg-crypto-gradient bg-clip-text text-transparent">
                  Invest in
                </span>
                <br />
                <span className="text-foreground">
                  Crypto Future
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl">
                Join the revolution of digital finance. Grow your wealth with our advanced trading algorithms, 
                expert signals, and secure investment platform designed for the crypto era.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 py-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-crypto-gold">$2.5B+</div>
                <div className="text-sm text-muted-foreground">Trading Volume</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-crypto-blue">150K+</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-crypto-green">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="bg-crypto-gradient hover:opacity-90 text-background group">
                Start Investing
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="border-crypto-blue text-crypto-blue hover:bg-crypto-blue hover:text-background">
                View Dashboard
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8">
              <div className="flex items-center space-x-3 justify-center lg:justify-start">
                <TrendingUp className="h-6 w-6 text-crypto-green" />
                <span className="text-sm">High Returns</span>
              </div>
              <div className="flex items-center space-x-3 justify-center lg:justify-start">
                <Shield className="h-6 w-6 text-crypto-blue" />
                <span className="text-sm">Secure Platform</span>
              </div>
              <div className="flex items-center space-x-3 justify-center lg:justify-start">
                <Zap className="h-6 w-6 text-crypto-gold" />
                <span className="text-sm">Instant Trading</span>
              </div>
            </div>
          </div>

          {/* Right Content - 3D Bitcoin */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <Bitcoin3D />
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 animate-crypto-float">
                <div className="bg-crypto-green/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm text-crypto-green border border-crypto-green/30">
                  +24.5%
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 animate-crypto-float" style={{animationDelay: '2s'}}>
                <div className="bg-crypto-blue/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm text-crypto-blue border border-crypto-blue/30">
                  BTC
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};