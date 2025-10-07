import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, Mail, Send, Loader2 } from 'lucide-react';
import { useContactContent } from '@/hooks/useContactContent';

export const Contact = () => {
  const { content, isLoading } = useContactContent();

  if (isLoading) {
    return (
      <div className="py-12 sm:py-16 lg:py-20 bg-muted/50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <section id="contact" className="py-12 sm:py-16 lg:py-20 bg-muted/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            <span className="bg-crypto-gradient bg-clip-text text-transparent">
              {content.hero_title}
            </span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            {content.hero_description}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16">
          {/* Contact Form */}
          <Card className="bg-background/50 backdrop-blur-sm border border-border/50">
            <CardContent className="p-4 sm:p-6 lg:p-8">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">{content.form_title}</h3>
              <form className="space-y-4 sm:space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">First Name</label>
                    <Input placeholder="Enter your first name" className="border-border/50 focus:border-crypto-blue" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Last Name</label>
                    <Input placeholder="Enter your last name" className="border-border/50 focus:border-crypto-blue" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input type="email" placeholder="Enter your email" className="border-border/50 focus:border-crypto-blue" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Subject</label>
                  <Input placeholder="How can we help you?" className="border-border/50 focus:border-crypto-blue" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Message</label>
                  <Textarea 
                    placeholder="Tell us more about your inquiry..." 
                    rows={6}
                    className="border-border/50 focus:border-crypto-blue resize-none"
                  />
                </div>
                
                <Button className="w-full bg-crypto-gradient hover:opacity-90 text-background">
                  <Send className="mr-2 h-4 w-4" />
                  {content.form_button_text}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6 sm:space-y-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">Contact Information</h3>
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-crypto-gradient rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-background" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">Email</h4>
                    <p className="text-muted-foreground">{content.support_email}</p>
                    <p className="text-sm text-crypto-blue">24/7 Support Available</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-crypto-gradient rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-background" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">Phone</h4>
                    <p className="text-muted-foreground">{content.support_phone}</p>
                    <p className="text-sm text-crypto-blue">{content.business_hours_weekday.split(':')[0]}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-crypto-gradient rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-background" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">Office</h4>
                    <p className="text-muted-foreground">{content.office_address}</p>
                    <p className="text-muted-foreground">{content.office_city}, {content.office_zip}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Contact */}
            <Card className="bg-crypto-gradient">
              <CardContent className="p-6 text-center">
                <h4 className="text-xl font-bold text-background mb-2">Need Immediate Help?</h4>
                <p className="text-background/80 mb-4">
                  Join our live chat for instant support
                </p>
                <Button variant="outline" className="border-background text-background hover:bg-background hover:text-crypto-blue">
                  Start Live Chat
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};