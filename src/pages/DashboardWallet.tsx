import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, Bitcoin, CircleDollarSign, DollarSign, TrendingUp, Eye, EyeOff, ArrowLeftRight, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface WalletData {
  btc_balance: number;
  eth_balance: number;
  usdt_balance: number;
  interest_earned: number;
  commissions: number;
  net_balance: number;
}

const DashboardWallet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [walletData, setWalletData] = useState<WalletData>({
    btc_balance: 0,
    eth_balance: 0,
    usdt_balance: 0,
    interest_earned: 0,
    commissions: 0,
    net_balance: 0
  });
  const [loading, setLoading] = useState(true);
  const [showBalances, setShowBalances] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  const fetchWalletData = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('net_balance, btc_balance, eth_balance, usdt_balance, interest_earned, commissions')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      setWalletData({
        btc_balance: profile?.btc_balance || 0,
        eth_balance: profile?.eth_balance || 0,
        usdt_balance: profile?.usdt_balance || 0,
        interest_earned: profile?.interest_earned || 0,
        commissions: profile?.commissions || 0,
        net_balance: profile?.net_balance || 0
      });
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch wallet data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatUSD = (amount: number) => {
    return showBalances 
      ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
      : '$••••••';
  };

  // Calculate total for portfolio allocation
  const totalAssets = walletData.btc_balance + walletData.eth_balance + walletData.usdt_balance + walletData.interest_earned + walletData.commissions;

  const walletAssets = [
    {
      name: 'Bitcoin',
      symbol: 'BTC',
      balance: walletData.btc_balance,
      icon: Bitcoin,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20'
    },
    {
      name: 'Ethereum',
      symbol: 'ETH',
      balance: walletData.eth_balance,
      icon: CircleDollarSign,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      name: 'Tether USD',
      symbol: 'USDT',
      balance: walletData.usdt_balance,
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    },
    {
      name: 'Interest Earned',
      symbol: 'PROFIT',
      balance: walletData.interest_earned,
      icon: TrendingUp,
      color: 'text-crypto-green',
      bgColor: 'bg-crypto-green/10',
      borderColor: 'border-crypto-green/20'
    },
    {
      name: 'Commissions',
      symbol: 'COMM',
      balance: walletData.commissions,
      icon: Users,
      color: 'text-crypto-gold',
      bgColor: 'bg-crypto-gold/10',
      borderColor: 'border-crypto-gold/20'
    }
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-crypto-blue"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Wallet</h1>
            <p className="text-muted-foreground">Manage your crypto portfolio</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowBalances(!showBalances)}
            className="gap-2"
          >
            {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showBalances ? 'Hide' : 'Show'} Balances
          </Button>
        </div>

        {/* Total Portfolio Value */}
        <Card className="bg-gradient-to-r from-crypto-blue/10 to-crypto-purple/10 border-crypto-blue/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Balance (Total Assets)</p>
                <h2 className="text-4xl font-bold bg-crypto-gradient bg-clip-text text-transparent">
                  {formatUSD(walletData.net_balance)}
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Sum of all crypto balances + interest + commissions
                </p>
              </div>
              <div className="text-6xl opacity-20">
                <Wallet />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Crypto Assets */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {walletAssets.map((asset) => {
            const Icon = asset.icon;
            const percentage = totalAssets > 0 ? (asset.balance / totalAssets) * 100 : 0;
            return (
              <Card key={asset.symbol} className={`${asset.bgColor} ${asset.borderColor} border`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {asset.name}
                  </CardTitle>
                  <Icon className={`h-6 w-6 ${asset.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-2xl font-bold">
                        {formatUSD(asset.balance)}
                      </div>
                    </div>
                    {totalAssets > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {percentage.toFixed(1)}% of portfolio
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <Button 
                className="bg-crypto-gradient hover:opacity-90 text-background h-12"
                onClick={() => navigate('/dashboard/deposit')}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Deposit Funds
              </Button>
              <Button 
                variant="outline" 
                className="h-12"
                onClick={() => navigate('/dashboard/swap')}
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Swap Balances
              </Button>
              <Button 
                variant="outline" 
                className="h-12"
                onClick={() => navigate('/dashboard/signals')}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Buy Signals
              </Button>
              <Button 
                variant="outline" 
                className="h-12"
                onClick={() => navigate('/dashboard/withdrawal')}
              >
                <Wallet className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {walletAssets.map((asset) => {
                const percentage = totalAssets > 0 ? (asset.balance / totalAssets) * 100 : 0;
                return (
                  <div key={asset.symbol} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <asset.icon className={`h-4 w-4 ${asset.color}`} />
                        <span className="font-medium">{asset.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">{formatUSD(asset.balance)}</span>
                        <span className="text-sm text-muted-foreground w-16 text-right">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${asset.bgColor.replace('/10', '')}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardWallet;
