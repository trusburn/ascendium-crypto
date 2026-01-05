import { motion } from 'framer-motion';
import { ScrollReveal } from '@/components/animations';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAdminContent } from '@/hooks/useAdminContent';

export const CTASection = () => {
  const { content } = useAdminContent();

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0 bg-crypto-gradient opacity-10"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <ScrollReveal>
          <div className="text-center space-y-8">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-crypto-gold/10 border border-crypto-gold/30 text-crypto-gold"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Start Your Journey Today</span>
            </motion.div>

            <h2 className="text-4xl lg:text-6xl font-bold">
              <span className="bg-crypto-gradient bg-clip-text text-transparent">
                {content.ctaTitle}
              </span>
            </h2>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {content.ctaSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <a href="/auth">
                  <Button size="lg" className="bg-crypto-gradient hover:opacity-90 text-lg px-8 py-6 h-auto group">
                    {content.ctaButton}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <a href="/dashboard">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto border-crypto-blue text-crypto-blue hover:bg-crypto-blue hover:text-background">
                    View Dashboard
                  </Button>
                </a>
              </motion.div>
            </div>

            <div className="flex items-center justify-center gap-8 pt-8 text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-crypto-green animate-pulse" />
                <span className="text-sm">No hidden fees</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-crypto-green animate-pulse" />
                <span className="text-sm">Instant withdrawals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-crypto-green animate-pulse" />
                <span className="text-sm">24/7 support</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
