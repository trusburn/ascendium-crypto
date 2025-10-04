import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminSettings {
  maintenance_mode: boolean;
  registration_enabled: boolean;
  minimum_deposit: number;
  minimum_withdrawal: number;
  max_daily_withdrawal: number;
  platform_fee_percentage: number;
  notification_email: string;
  auto_approve_deposits: boolean;
  auto_approve_withdrawals: boolean;
}

const defaultSettings: AdminSettings = {
  maintenance_mode: false,
  registration_enabled: true,
  minimum_deposit: 100,
  minimum_withdrawal: 50,
  max_daily_withdrawal: 10000,
  platform_fee_percentage: 2.5,
  notification_email: '',
  auto_approve_deposits: false,
  auto_approve_withdrawals: false,
};

export const useAdminSettings = () => {
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('key, value');

        if (error) {
          console.error('Error loading admin settings:', error);
          setSettings(defaultSettings);
          return;
        }

        const settingsData: any = { ...defaultSettings };

        data?.forEach((item) => {
          if (item.key in defaultSettings) {
            settingsData[item.key] = item.value;
          }
        });

        setSettings(settingsData);
      } catch (error) {
        console.error('Error loading admin settings:', error);
        setSettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();

    // Subscribe to changes
    const channel = supabase
      .channel('admin-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_settings',
        },
        () => {
          loadSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { settings, isLoading };
};
