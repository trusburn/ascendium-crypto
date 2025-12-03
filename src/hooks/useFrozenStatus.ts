import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useFrozenStatus = () => {
  const { user } = useAuth();
  const [isFrozen, setIsFrozen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFrozenStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_frozen')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking frozen status:', error);
        } else {
          setIsFrozen(data?.is_frozen || false);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkFrozenStatus();

    // Subscribe to profile changes
    const channel = supabase
      .channel('frozen-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user?.id}`
        },
        (payload) => {
          setIsFrozen((payload.new as any)?.is_frozen || false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { isFrozen, loading };
};
