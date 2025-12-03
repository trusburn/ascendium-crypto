import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useFrozenStatus = () => {
  const { user } = useAuth();
  const [isFrozen, setIsFrozen] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkFrozenStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_frozen')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking frozen status:', error);
        setIsFrozen(false);
      } else {
        console.log('Frozen status check:', data?.is_frozen);
        setIsFrozen(data?.is_frozen ?? false);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsFrozen(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkFrozenStatus();

    if (!user?.id) return;

    // Subscribe to profile changes for this user
    const channel = supabase
      .channel(`frozen-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('Frozen status update received:', payload);
          const newFrozenStatus = (payload.new as { is_frozen?: boolean })?.is_frozen ?? false;
          setIsFrozen(newFrozenStatus);
        }
      )
      .subscribe();

    // Also poll every 5 seconds as backup
    const interval = setInterval(checkFrozenStatus, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user?.id, checkFrozenStatus]);

  return { isFrozen, loading };
};
