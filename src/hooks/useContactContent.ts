import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContactContent {
  hero_title: string;
  hero_description: string;
  support_email: string;
  support_phone: string;
  office_address: string;
  office_city: string;
  office_zip: string;
  business_hours_weekday: string;
  business_hours_saturday: string;
  business_hours_sunday: string;
  emergency_phone: string;
  emergency_description: string;
  form_title: string;
  form_button_text: string;
}

const defaultContent: ContactContent = {
  hero_title: 'Get in Touch',
  hero_description: 'Have questions about crypto investing? Need help with your account? Our expert team is here to assist you 24/7 with all your investment needs.',
  support_email: 'support@cryptovault.com',
  support_phone: '+1 (555) 123-4567',
  office_address: '123 Wall Street, Suite 500',
  office_city: 'New York',
  office_zip: 'NY 10005',
  business_hours_weekday: 'Monday - Friday: 9:00 AM - 6:00 PM EST',
  business_hours_saturday: 'Saturday: 10:00 AM - 4:00 PM EST',
  business_hours_sunday: 'Sunday: Closed',
  emergency_phone: '+1 (555) 911-HELP',
  emergency_description: 'For urgent account or security issues',
  form_title: 'Send Us a Message',
  form_button_text: 'Send Message',
};

export const useContactContent = () => {
  const [content, setContent] = useState<ContactContent>(defaultContent);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('key, value')
          .like('key', 'contact_%');

        if (error) throw error;

        if (data && data.length > 0) {
          const settings: Partial<ContactContent> = {};
          data.forEach((item) => {
            const key = item.key.replace('contact_', '') as keyof ContactContent;
            // Parse JSON value from jsonb column
            settings[key] = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
          });
          setContent({ ...defaultContent, ...settings });
        }
      } catch (error) {
        console.error('Error fetching contact content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();

    // Subscribe to changes (realtime doesn't support 'like', so we listen to all admin_settings changes)
    const channel = supabase
      .channel('contact-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
        },
        (payload) => {
          // Only refetch if the change is related to contact settings
          if (payload.new && typeof payload.new === 'object' && 'key' in payload.new) {
            const key = payload.new.key as string;
            if (key.startsWith('contact_')) {
              fetchContent();
            }
          } else {
            // For delete events, just refetch to be safe
            fetchContent();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { content, isLoading };
};
