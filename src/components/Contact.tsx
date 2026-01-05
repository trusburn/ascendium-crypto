import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, Mail, Send, Loader2, MessageCircle } from 'lucide-react';
import { useContactContent } from '@/hooks/useContactContent';
import { ScrollReveal, GlassmorphicCard, FluidBackground } from './animations';

export const Contact = () => {
  const { content, isLoading } = useContactContent();

  if (isLoading) {
    return (
      <div className="py-12 sm:py-16 lg:py-20 bg-muted/50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      primary: content.support_email,
      secondary: '24/7 Support Available',
    },
    {
      icon: Phone,
      title: 'Phone',
      primary: content.support_phone,
      secondary: content.business_hours_weekday?.split(':')[0] || 'Mon-Fri: 9AM-6PM',
    },
    {
      icon: MapPin,
      title: 'Office',
      primary: content.office_address,
      secondary: `${content.office_city}, ${content.office_zip}`,
    },
  ];

  return (
    <section id="contact" className="py-12 sm:py-16 lg:py-20 relative overflow-hidden">
      <FluidBackground variant="section" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <ScrollReveal className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            <span className="bg-crypto-gradient bg-clip-text text-transparent">
              {content.hero_title}
            </span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            {content.hero_description}
          </p>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16">
          {/* Contact Form */}
          <ScrollReveal direction="left">
            <GlassmorphicCard glow="blue" className="p-4 sm:p-6 lg:p-8">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">{content.form_title}</h3>
              <form className="space-y-4 sm:space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">First Name</label>
                    <Input 
                      placeholder="Enter your first name" 
                      className="bg-background/50 border-border/50 focus:border-crypto-blue transition-colors" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Last Name</label>
                    <Input 
                      placeholder="Enter your last name" 
                      className="bg-background/50 border-border/50 focus:border-crypto-blue transition-colors" 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input 
                    type="email" 
                    placeholder="Enter your email" 
                    className="bg-background/50 border-border/50 focus:border-crypto-blue transition-colors" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Subject</label>
                  <Input 
                    placeholder="How can we help you?" 
                    className="bg-background/50 border-border/50 focus:border-crypto-blue transition-colors" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Message</label>
                  <Textarea 
                    placeholder="Tell us more about your inquiry..." 
                    rows={6}
                    className="bg-background/50 border-border/50 focus:border-crypto-blue resize-none transition-colors"
                  />
                </div>
                
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button className="w-full bg-crypto-gradient hover:opacity-90 text-background group">
                    <Send className="mr-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    {content.form_button_text}
                  </Button>
                </motion.div>
              </form>
            </GlassmorphicCard>
          </ScrollReveal>

          {/* Contact Information */}
          <div className="space-y-6 sm:space-y-8">
            <ScrollReveal direction="right">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">Contact Information</h3>
              <div className="space-y-4 sm:space-y-6">
                {contactInfo.map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start space-x-4"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 5 }}
                  >
                    <motion.div 
                      className="w-12 h-12 bg-crypto-gradient rounded-full flex items-center justify-center flex-shrink-0"
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <item.icon className="h-6 w-6 text-background" />
                    </motion.div>
                    <div>
                      <h4 className="text-lg font-semibold text-foreground">{item.title}</h4>
                      <p className="text-muted-foreground">{item.primary}</p>
                      <p className="text-sm text-crypto-blue">{item.secondary}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollReveal>

            {/* Quick Contact CTA */}
            <ScrollReveal delay={0.3}>
              <GlassmorphicCard glow="purple" className="overflow-hidden">
                <div className="bg-crypto-gradient p-6 text-center relative">
                  <motion.div
                    className="absolute inset-0 bg-white/10"
                    animate={{ 
                      backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                    }}
                    transition={{ duration: 5, repeat: Infinity }}
                  />
                  <div className="relative z-10">
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <MessageCircle className="h-10 w-10 mx-auto mb-3 text-background" />
                    </motion.div>
                    <h4 className="text-xl font-bold text-background mb-2">Need Immediate Help?</h4>
                    <p className="text-background/80 mb-4">
                      Join our live chat for instant support
                    </p>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" className="border-background text-background hover:bg-background hover:text-crypto-purple">
                        Start Live Chat
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </GlassmorphicCard>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
};
