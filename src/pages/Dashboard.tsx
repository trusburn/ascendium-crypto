import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import TradingChart from '@/components/TradingChart';
import { 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight, 
  Plus,
  Minus
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ProfileData {
  net_balance: number;
  total_invested: number;
  interest_earned: number;
  commissions: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const portfolioData = [
    { name: 'Bitcoin', value: 45, color: 'hsl(var(--crypto-gold))' },
    { name: 'Ethereum', value: 30, color: 'hsl(var(--crypto-blue))' },
    { name: 'Others', value: 25, color: 'hsl(var(--crypto-purple))' },
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        console.log('Dashboard: Syncing trading profits...');
        // First sync trading profits to ensure latest data
        const { error: syncError } = await supabase.rpc('sync_trading_profits');
        if (syncError) {
          console.error('Dashboard sync error:', syncError);
        } else {
          console.log('Dashboard sync successful');
        }

        // Then fetch the updated profile data
        const { data, error } = await supabase
          .from('profiles')
          .select('net_balance, total_invested, interest_earned, commissions, base_balance')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          toast({
            title: "Error",
            description: "Failed to load profile data",
            variant: "destructive",
          });
          return;
        }

        console.log('Dashboard profile data:', data);
        setProfile(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    
    // Refresh profile data every 3 seconds for faster updates
    const interval = setInterval(fetchProfile, 3000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-crypto-blue"></div>
        </div>
      </DashboardLayout>
    );
  }

  const stats = [
    {
      title: 'Net Balance',
      value: `$${profile?.net_balance?.toLocaleString() || '0.00'}`,
      icon: Wallet,
      color: 'crypto-blue',
      change: '+12.5%'
    },
    {
      title: 'Total Invested',
      value: `$${profile?.total_invested?.toLocaleString() || '0.00'}`,
      icon: DollarSign,
      color: 'crypto-green',
      change: '+8.2%'
    },
    {
      title: 'Interest Earned',
      value: `$${profile?.interest_earned?.toLocaleString() || '0.00'}`,
      icon: TrendingUp,
      color: 'crypto-purple',
      change: '+24.8%'
    },
    {
      title: 'Commissions',
      value: `$${profile?.commissions?.toLocaleString() || '0.00'}`,
      icon: ArrowUpRight,
      color: 'crypto-gold',
      change: '+15.3%'
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-crypto-gradient rounded-lg p-6 text-background">
          <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
          <p className="text-background/80">Track your crypto investments and grow your wealth</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-muted/50 border-border hover:bg-muted/70 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-5 w-5 text-${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-crypto-green">
                    {stat.change} from last month
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trading Chart Section */}
        <TradingChart />

        {/* Quick Actions */}
        <Card className="bg-muted/50 border-border">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button className="h-20 flex flex-col bg-crypto-blue hover:bg-crypto-blue/90">
                <Plus className="h-6 w-6 mb-2" />
                Deposit
              </Button>
              <Button variant="outline" className="h-20 flex flex-col border-crypto-purple text-crypto-purple hover:bg-crypto-purple hover:text-background">
                <Minus className="h-6 w-6 mb-2" />
                Withdraw
              </Button>
              <Button variant="outline" className="h-20 flex flex-col border-crypto-green text-crypto-green hover:bg-crypto-green hover:text-background">
                <TrendingUp className="h-6 w-6 mb-2" />
                Trade
              </Button>
              <Button variant="outline" className="h-20 flex flex-col border-crypto-gold text-crypto-gold hover:bg-crypto-gold hover:text-background">
                <Wallet className="h-6 w-6 mb-2" />
                Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;