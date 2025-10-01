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
  uptimeLabel: 'Uptime'
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
