import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminContent {
  siteTitle: string;
  heroTitle: string;
  heroSubtitle: string;
  footerCopyright: string;
  contactEmail: string;
  contactPhone: string;
  aboutTitle: string;
  servicesTitle: string;
  tradingVolumeLabel: string;
  activeUsersLabel: string;
  uptimeLabel: string;
  // New premium section content
  statsTitle: string;
  statsSubtitle: string;
  statsTradingVolume: string;
  statsActiveTraders: string;
  statsCountries: string;
  statsUptime: string;
  securityTitle: string;
  securitySubtitle: string;
  securityFeature1: string;
  securityFeature2: string;
  securityFeature3: string;
  securityFeature4: string;
  tradingEngineTitle: string;
  tradingEngineSubtitle: string;
  tradingEngineFeature1: string;
  tradingEngineFeature2: string;
  tradingEngineFeature3: string;
  signalsTitle: string;
  signalsSubtitle: string;
  signalsAccuracy: string;
  signalsProfit: string;
  trustTitle: string;
  trustSubtitle: string;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButton: string;
  [key: string]: any;
}

const defaultContent: AdminContent = {
  siteTitle: 'CryptoVault',
  heroTitle: 'Invest in Crypto Future',
  heroSubtitle: 'Join the revolution of digital finance. Grow your wealth with our advanced trading algorithms, expert signals, and secure investment platform designed for the crypto era.',
  footerCopyright: '© 2024 CryptoVault. All rights reserved.',
  contactEmail: 'support@cryptovault.com',
  contactPhone: '+1 (555) 123-4567',
  aboutTitle: 'About CryptoVault',
  servicesTitle: 'Our Services',
  tradingVolumeLabel: 'Trading Volume',
  activeUsersLabel: 'Active Users',
  uptimeLabel: 'Uptime',
  // Premium sections
  statsTitle: 'Trusted by Traders Worldwide',
  statsSubtitle: 'Join thousands of successful traders who trust our platform',
  statsTradingVolume: '$2.5B+',
  statsActiveTraders: '150K+',
  statsCountries: '150+',
  statsUptime: '99.9%',
  securityTitle: 'Bank-Grade Security',
  securitySubtitle: 'Your funds are protected by multiple layers of enterprise security',
  securityFeature1: 'Cold Storage Protection',
  securityFeature2: 'Two-Factor Authentication',
  securityFeature3: 'Insurance Coverage',
  securityFeature4: 'Real-time Monitoring',
  tradingEngineTitle: 'AI-Powered Trading Engine',
  tradingEngineSubtitle: 'Our advanced algorithms analyze markets 24/7 to maximize your returns',
  tradingEngineFeature1: 'Machine Learning Signals',
  tradingEngineFeature2: 'Real-time Market Analysis',
  tradingEngineFeature3: 'Automated Profit Taking',
  signalsTitle: 'Premium Trading Signals',
  signalsSubtitle: 'Get expert-curated signals with proven track records',
  signalsAccuracy: '94.7%',
  signalsProfit: '+847%',
  trustTitle: 'Why Traders Choose Us',
  trustSubtitle: 'A platform built on trust, transparency, and performance',
  ctaTitle: 'Ready to Start Your Journey?',
  ctaSubtitle: 'Join thousands of successful investors and start growing your wealth today',
  ctaButton: 'Get Started Now',
};

export const useAdminContent = () => {
  const [content, setContent] = useState<AdminContent>(defaultContent);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('*')
          .like('key', 'content_%');

        if (error) {
          console.error('Error loading admin content:', error);
          setContent(defaultContent);
          return;
        }

        const contentData: AdminContent = { ...defaultContent };

        data?.forEach((item) => {
          if (item.key.startsWith('content_')) {
            const key = item.key.replace('content_', '');
            contentData[key] = typeof item.value === 'string' ? item.value : JSON.stringify(item.value);
          }
        });

        setContent(contentData);
      } catch (error) {
        console.error('Error loading admin content:', error);
        setContent(defaultContent);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();

    // Subscribe to changes
    const channel = supabase
      .channel('admin-content-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
          filter: 'key=like.content_%'
        },
        () => {
          loadContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { content, isLoading };
};
