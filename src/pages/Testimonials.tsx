import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Quote } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Crypto Investor",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
      content: "CryptoVault has completely transformed my investment strategy. The AI-powered signals are incredibly accurate, and I've seen consistent 35% monthly returns.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Day Trader",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
      content: "The platform's security features and instant trading capabilities make it the best choice for serious crypto investors. Customer support is outstanding.",
      rating: 5
    },
    {
      name: "Emma Rodriguez",
      role: "Financial Advisor",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
      content: "I recommend CryptoVault to all my clients. The educational resources and expert guidance have helped many achieve their financial goals.",
      rating: 5
    },
    {
      name: "David Park",
      role: "Tech Entrepreneur",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
      content: "The advanced trading algorithms and real-time market analysis give me a significant edge. My portfolio has grown 400% in just 8 months.",
      rating: 5
    },
    {
      name: "Lisa Thompson",
      role: "Investment Manager",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face",
      content: "CryptoVault's institutional-grade security and professional tools make it perfect for managing large crypto portfolios. Highly recommended.",
      rating: 5
    },
    {
      name: "Alex Williams",
      role: "Blockchain Developer",
      avatar: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=100&h=100&fit=crop&crop=face",
      content: "As someone deep in the crypto space, I appreciate the technical excellence and innovative features. The profit tracking is incredibly detailed.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 bg-hero-gradient">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-crypto-gradient bg-clip-text text-transparent">
                What Our Clients Say
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join thousands of successful investors who trust CryptoVault for their cryptocurrency investments.
              Real stories from real people achieving extraordinary results.
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-muted/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2">
                <div className="text-4xl font-bold text-crypto-gold">15,000+</div>
                <div className="text-muted-foreground">Happy Clients</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-crypto-green">98.7%</div>
                <div className="text-muted-foreground">Satisfaction Rate</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-crypto-blue">$2.5B+</div>
                <div className="text-muted-foreground">Assets Managed</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl font-bold text-crypto-purple">150+</div>
                <div className="text-muted-foreground">Countries</div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Grid */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="bg-background/50 backdrop-blur-sm border border-border/50 hover:border-crypto-blue/50 transition-all duration-300 group">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center space-x-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-crypto-gold text-crypto-gold" />
                      ))}
                    </div>
                    
                    <div className="relative">
                      <Quote className="h-8 w-8 text-crypto-blue/30 absolute -top-2 -left-2" />
                      <p className="text-muted-foreground italic pl-6">
                        "{testimonial.content}"
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-4 pt-4 border-t border-border/50">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-crypto-blue/30"
                      />
                      <div>
                        <div className="font-semibold text-foreground">{testimonial.name}</div>
                        <div className="text-sm text-crypto-blue">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-crypto-gradient">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl lg:text-5xl font-bold text-background mb-6">
              Ready to Join Our Success Stories?
            </h2>
            <p className="text-xl text-background/80 mb-8">
              Start your crypto investment journey today and become our next success story.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-background text-crypto-blue px-8 py-4 rounded-lg font-semibold hover:bg-background/90 transition-colors">
                Start Investing Now
              </button>
              <button className="border border-background text-background px-8 py-4 rounded-lg font-semibold hover:bg-background/10 transition-colors">
                View Dashboard Demo
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Testimonials;