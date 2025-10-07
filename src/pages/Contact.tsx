import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, Mail, Clock, MessageCircle, Headphones, Loader2 } from 'lucide-react';
import { useContactContent } from '@/hooks/useContactContent';

const Contact = () => {
  const { content, isLoading } = useContactContent();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email",
      contact: content.support_email,
      availability: "24/7 Response"
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Speak with our experts",
      contact: content.support_phone,
      availability: content.business_hours_weekday.split(':')[0]
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Instant assistance",
      contact: "Available on dashboard",
      availability: "24/7 Available"
    },
    {
      icon: Headphones,
      title: "Priority Support",
      description: "VIP customer service",
      contact: content.support_email,
      availability: "24/7 Premium Support"
    }
  ];

  const offices = [
    {
      city: content.office_city,
      address: content.office_address,
      zipCode: content.office_zip,
      phone: content.support_phone
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
                {content.hero_title}
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {content.hero_description}
            </p>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-12">How Can We Help?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactMethods.map((method, index) => (
                <Card key={index} className="bg-background/50 backdrop-blur-sm border border-border/50 hover:border-crypto-blue/50 transition-all duration-300 group text-center">
                  <CardContent className="p-6 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-crypto-gradient rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <method.icon className="h-8 w-8 text-background" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {method.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {method.description}
                    </p>
                    <div className="space-y-1">
                      <p className="text-crypto-blue font-medium">{method.contact}</p>
                      <p className="text-xs text-muted-foreground">{method.availability}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form & Info */}
        <section className="py-20 bg-muted/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16">
              {/* Contact Form */}
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-8">{content.form_title}</h2>
                <Card className="bg-background/50 backdrop-blur-sm border border-border/50">
                  <CardContent className="p-8">
                    <form className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
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
                        {content.form_button_text}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Information */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-foreground mb-8">Our Offices</h2>
                  <div className="space-y-6">
                    {offices.map((office, index) => (
                      <Card key={index} className="bg-background/50 backdrop-blur-sm border border-border/50">
                        <CardContent className="p-6">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-crypto-gradient rounded-full flex items-center justify-center flex-shrink-0">
                              <MapPin className="h-6 w-6 text-background" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-lg font-semibold text-foreground">{office.city}</h3>
                              <p className="text-muted-foreground">{office.address}</p>
                              <p className="text-muted-foreground">{office.zipCode}</p>
                              <p className="text-crypto-blue font-medium">{office.phone}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Business Hours */}
                <Card className="bg-background/50 backdrop-blur-sm border border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-crypto-gradient rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="h-6 w-6 text-background" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-foreground">Business Hours</h3>
                        <div className="space-y-1 text-muted-foreground">
                          <p>{content.business_hours_weekday}</p>
                          <p>{content.business_hours_saturday}</p>
                          <p>{content.business_hours_sunday}</p>
                          <p className="text-crypto-green font-medium mt-2">24/7 Online Support Available</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Emergency Contact */}
                <Card className="bg-crypto-gradient">
                  <CardContent className="p-6 text-center">
                    <h3 className="text-xl font-bold text-background mb-2">Emergency Support</h3>
                    <p className="text-background/80 mb-4">
                      {content.emergency_description}
                    </p>
                    <p className="text-2xl font-bold text-background">{content.emergency_phone}</p>
                    <p className="text-sm text-background/80 mt-2">Available 24/7</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Preview */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground mb-8">
              Find quick answers to common questions about our platform and services.
            </p>
            <Button variant="outline" className="border-crypto-blue text-crypto-blue hover:bg-crypto-blue hover:text-background">
              View FAQ
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Contact;