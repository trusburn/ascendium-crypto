import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import CryptoTicker from "@/components/CryptoTicker";
import TradingChart from "@/components/TradingChart";
import { GlassmorphicCard, AnimatedCounter } from '@/components/animations';
import {
  Wallet, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  Plus,
  Minus,
  StopCircle,
  Sparkles
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ProfileData {
  net_balance: number;
  total_invested: number;
  interest_earned: number;
  commissions: number;
}

interface ActiveTrade {
  id: string;
  status: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [stoppingTrades, setStoppingTrades] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        // Sync trading profits to update net_balance with live P/L
        console.log('💰 Dashboard: Syncing trading profits...');
        await supabase.rpc('sync_trading_profits');

        const { data, error } = await supabase
          .from('profiles')
          .select('net_balance, total_invested, interest_earned, commissions, base_balance')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        console.log('💳 Dashboard profile data:', data);
        setProfile(data);

        const { data: tradesData } = await supabase
          .from('trades')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('status', 'active');
        
        setActiveTrades(tradesData || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    // Subscribe to real-time profile changes for live balance updates
    const profileChannel = supabase
      .channel(`dashboard-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const newData = payload.new as any;
          console.log('📊 Real-time profile update:', newData);
          setProfile({
            net_balance: Number(newData?.net_balance || 0),
            total_invested: Number(newData?.total_invested || 0),
            interest_earned: Number(newData?.interest_earned || 0),
            commissions: Number(newData?.commissions || 0),
          });
        }
      )
      .subscribe();

    // Subscribe to trade changes to update active trade count
    const tradesChannel = supabase
      .channel(`dashboard-trades-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`
        },
        async () => {
          const { data: tradesData } = await supabase
            .from('trades')
            .select('id, status')
            .eq('user_id', user.id)
            .eq('status', 'active');
          setActiveTrades(tradesData || []);
        }
      )
      .subscribe();

    // Sync profits every 3 seconds to keep balance live
    const interval = setInterval(async () => {
      await supabase.rpc('sync_trading_profits');
    }, 3000);

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(tradesChannel);
      clearInterval(interval);
    };
  }, [user]);

  const handleStopAllTrades = async () => {
    if (!user || activeTrades.length === 0) {
      toast({
        title: "No Active Trades",
        description: "You have no active trades to stop",
      });
      return;
    }

    setStoppingTrades(true);
    try {
      console.log('🛑 Stopping trades via database function...');
      const { data: result, error: rpcError } = await supabase.rpc('stop_all_user_trades', {
        p_user_id: user.id
      });

      if (rpcError) throw rpcError;

      const resultData = result as {
        success: boolean;
        message: string;
        trades_stopped: number;
        total_profit: number;
        trade_details: Array<{
          id: string;
          trade_type: string;
          initial_amount: number;
          profit: number;
          entry_price: number;
          exit_price: number;
          asset_symbol: string;
          asset_name: string;
          started_at: string;
          stopped_at: string;
        }>;
      };

      console.log('📊 Stop result:', resultData);

      if (!resultData.success) {
        toast({
          title: "No Active Trades",
          description: resultData.message,
        });
        return;
      }

      if (resultData.trade_details && resultData.trade_details.length > 0) {
        const transactionInserts = resultData.trade_details.map(trade => ({
          user_id: user.id,
          type: trade.profit >= 0 ? 'trade_profit' : 'trade_loss',
          amount: trade.profit,
          description: `${trade.trade_type.toUpperCase()} ${trade.asset_symbol} | Invested: $${trade.initial_amount.toFixed(2)} | ${trade.profit >= 0 ? 'Profit' : 'Loss'}: $${Math.abs(trade.profit).toFixed(2)}`,
        }));

        await supabase.from('transactions').insert(transactionInserts);
      }

      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('net_balance, total_invested, interest_earned, commissions')
        .eq('id', user.id)
        .single();

      if (updatedProfile) {
        setProfile(updatedProfile);
      }

      toast({
        title: "Trading Stopped Successfully",
        description: `Stopped ${resultData.trades_stopped} trade(s). Total profit: $${resultData.total_profit.toFixed(2)} added to your balance.`,
      });

      setActiveTrades([]);
    } catch (error: any) {
      console.error('Stop trades error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to stop trades",
        variant: "destructive",
      });
    } finally {
      setStoppingTrades(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <motion.div
            className="w-16 h-16 border-4 border-crypto-blue/30 border-t-crypto-blue rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </DashboardLayout>
    );
  }

  const stats = [
    {
      title: 'Net Balance',
      value: profile?.net_balance || 0,
      icon: Wallet,
      color: 'text-crypto-blue',
      glow: 'blue' as const,
      change: '+12.5%'
    },
    {
      title: 'Total Invested',
      value: profile?.total_invested || 0,
      icon: DollarSign,
      color: 'text-crypto-green',
      glow: 'green' as const,
      change: '+8.2%'
    },
    {
      title: 'Interest Earned',
      value: profile?.interest_earned || 0,
      icon: TrendingUp,
      color: 'text-crypto-purple',
      glow: 'purple' as const,
      change: '+24.8%'
    },
    {
      title: 'Commissions',
      value: profile?.commissions || 0,
      icon: ArrowUpRight,
      color: 'text-crypto-gold',
      glow: 'gold' as const,
      change: '+15.3%'
    },
  ];

  const quickActions = [
    { icon: Plus, label: 'Deposit', href: '/dashboard/deposit', variant: 'primary' },
    { icon: Minus, label: 'Withdraw', href: '/dashboard/withdrawal', variant: 'purple' },
    { icon: TrendingUp, label: 'Trade', href: '/dashboard/signals', variant: 'green' },
    { icon: Wallet, label: 'Wallet', href: '/dashboard/wallet', variant: 'gold' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GlassmorphicCard glow="blue" className="overflow-hidden">
            <div className="bg-crypto-gradient p-6 relative">
              <motion.div
                className="absolute inset-0 bg-white/5"
                animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                transition={{ duration: 8, repeat: Infinity }}
              />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-background mb-2 flex items-center gap-2">
                    <Sparkles className="h-6 w-6" />
                    Welcome back!
                  </h1>
                  <p className="text-background/80">Track your crypto investments and grow your wealth</p>
                </div>
                <motion.div
                  className="hidden md:block text-6xl"
                  animate={{ rotate: [0, 10, 0, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                >
                  ₿
                </motion.div>
              </div>
            </div>
          </GlassmorphicCard>
        </motion.div>

        {/* Real-time Crypto Prices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CryptoTicker />
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <GlassmorphicCard glow={stat.glow} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                    <motion.div
                      className={`w-10 h-10 rounded-lg bg-current/10 flex items-center justify-center ${stat.color}`}
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon className="h-5 w-5" />
                    </motion.div>
                  </div>
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    $<AnimatedCounter value={stat.value} />
                  </div>
                  <p className="text-xs text-crypto-green mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {stat.change} from last month
                  </p>
                </GlassmorphicCard>
              </motion.div>
            );
          })}
        </div>

        {/* Live Trading Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <TradingChart />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassmorphicCard glow="blue" className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {quickActions.map((action, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    className={`h-20 w-full flex flex-col ${
                      action.variant === 'primary' 
                        ? 'bg-crypto-gradient hover:opacity-90' 
                        : `border-crypto-${action.variant} text-crypto-${action.variant} hover:bg-crypto-${action.variant} hover:text-background`
                    }`}
                    variant={action.variant === 'primary' ? 'default' : 'outline'}
                    onClick={() => navigate(action.href)}
                  >
                    <action.icon className="h-6 w-6 mb-2" />
                    {action.label}
                  </Button>
                </motion.div>
              ))}
              <motion.div whileHover={{ scale: 1.05, y: -5 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="outline" 
                  className="h-20 w-full flex flex-col border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all"
                  onClick={handleStopAllTrades}
                  disabled={stoppingTrades || activeTrades.length === 0}
                >
                  <StopCircle className="h-6 w-6 mb-2" />
                  {stoppingTrades ? 'Stopping...' : `Stop Trading${activeTrades.length > 0 ? ` (${activeTrades.length})` : ''}`}
                </Button>
              </motion.div>
            </div>
          </GlassmorphicCard>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
