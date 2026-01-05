import { Navigation } from '@/components/Navigation';
import { Hero } from '@/components/Hero';
import { About } from '@/components/About';
import { Services } from '@/components/Services';
import { Contact } from '@/components/Contact';
import { FloatingCrypto } from '@/components/animations';
import {
  StatsSection,
  SecuritySection,
  TradingEngineSection,
  SignalsSection,
  TrustSection,
  CTASection,
} from '@/components/home';

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Global floating crypto elements */}
      <FloatingCrypto />
      
      <Navigation />
      <Hero />
      <StatsSection />
      <About />
      <SecuritySection />
      <TradingEngineSection />
      <Services />
      <SignalsSection />
      <TrustSection />
      <CTASection />
      <Contact />
    </div>
  );
};

export default Index;
