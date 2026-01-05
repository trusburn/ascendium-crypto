import { motion } from 'framer-motion';
import { ScrollReveal, GlassmorphicCard } from '@/components/animations';
import { Shield, Lock, Umbrella, Eye, CheckCircle } from 'lucide-react';
import { useAdminContent } from '@/hooks/useAdminContent';

export const SecuritySection = () => {
  const { content } = useAdminContent();

  const features = [
    {
      icon: Lock,
      title: content.securityFeature1,
      description: '98% of assets stored in offline cold wallets',
    },
    {
      icon: Shield,
      title: content.securityFeature2,
      description: 'Multi-layer authentication protects every account',
    },
    {
      icon: Umbrella,
      title: content.securityFeature3,
      description: 'Assets insured up to $250M by leading providers',
    },
    {
      icon: Eye,
      title: content.securityFeature4,
      description: '24/7 threat detection and prevention systems',
    },
  ];

  const certifications = [
    'SOC 2 Type II',
    'ISO 27001',
    'PCI DSS',
    'GDPR Compliant',
  ];

  return (
    <section className="py-20 relative overflow-hidden bg-muted/30">
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-20 left-10 w-96 h-96 bg-crypto-blue/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-80 h-80 bg-crypto-green/5 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <ScrollReveal className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-crypto-green/10 border border-crypto-green/30 text-crypto-green mb-6">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Enterprise Security</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="bg-crypto-gradient bg-clip-text text-transparent">
              {content.securityTitle}
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {content.securitySubtitle}
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <GlassmorphicCard glow="green" className="p-6 h-full">
                <div className="space-y-4">
                  <motion.div
                    className="w-14 h-14 rounded-xl bg-crypto-green/10 flex items-center justify-center"
                    whileHover={{ scale: 1.1 }}
                  >
                    <feature.icon className="h-7 w-7 text-crypto-green" />
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

        <ScrollReveal>
          <div className="flex flex-wrap justify-center gap-4">
            {certifications.map((cert, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 border border-border/50"
                whileHover={{ scale: 1.05 }}
              >
                <CheckCircle className="h-4 w-4 text-crypto-green" />
                <span className="text-sm font-medium">{cert}</span>
              </motion.div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
