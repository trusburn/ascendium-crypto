import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, Bitcoin, CircleDollarSign, DollarSign, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface WalletData {
  btc_balance: number;
  eth_balance: number;
  usdt_balance: number;
  total_balance_usd: number;
  profit_percentage: number;
}

const DashboardWallet = () => {
  const { user } = useAuth();
  const [walletData, setWalletData] = useState<WalletData>({
    btc_balance: 0,
    eth_balance: 0,
    usdt_balance: 0,
    total_balance_usd: 0,
    profit_percentage: 0
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
        .select('net_balance, total_invested, interest_earned')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      // Calculate mock crypto balances based on net balance
      const netBalance = profile?.net_balance || 0;
      const mockWalletData: WalletData = {
        btc_balance: netBalance * 0.4 / 65000, // 40% in BTC
        eth_balance: netBalance * 0.35 / 3500, // 35% in ETH
        usdt_balance: netBalance * 0.25, // 25% in USDT
        total_balance_usd: netBalance,
        profit_percentage: profile?.interest_earned ? (profile.interest_earned / (profile.total_invested || 1)) * 100 : 0
      };

      setWalletData(mockWalletData);
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

  const formatCrypto = (amount: number, decimals: number = 6) => {
    return showBalances ? amount.toFixed(decimals) : '••••••';
  };

  const formatUSD = (amount: number) => {
    return showBalances ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$••••••';
  };

  const walletAssets = [
    {
      name: 'Bitcoin',
      symbol: 'BTC',
      balance: walletData.btc_balance,
      valueUSD: walletData.btc_balance * 65000,
      icon: Bitcoin,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20'
    },
    {
      name: 'Ethereum',
      symbol: 'ETH',
      balance: walletData.eth_balance,
      valueUSD: walletData.eth_balance * 3500,
      icon: CircleDollarSign,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      name: 'Tether USD',
      symbol: 'USDT',
      balance: walletData.usdt_balance,
      valueUSD: walletData.usdt_balance,
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
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
                <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
                <h2 className="text-4xl font-bold bg-crypto-gradient bg-clip-text text-transparent">
                  {formatUSD(walletData.total_balance_usd)}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="h-4 w-4 text-crypto-green" />
                  <span className="text-crypto-green font-medium">
                    +{walletData.profit_percentage.toFixed(2)}%
                  </span>
                  <span className="text-muted-foreground text-sm">All time</span>
                </div>
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
                        {formatCrypto(asset.balance)} {asset.symbol}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatUSD(asset.valueUSD)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {((asset.valueUSD / walletData.total_balance_usd) * 100).toFixed(1)}% of portfolio
                    </Badge>
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
            <div className="grid gap-4 md:grid-cols-3">
              <Button className="bg-crypto-gradient hover:opacity-90 text-background h-12">
                <DollarSign className="mr-2 h-4 w-4" />
                Deposit Funds
              </Button>
              <Button variant="outline" className="h-12">
                <TrendingUp className="mr-2 h-4 w-4" />
                Buy Signals
              </Button>
              <Button variant="outline" className="h-12">
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
                const percentage = (asset.valueUSD / walletData.total_balance_usd) * 100;
                return (
                  <div key={asset.symbol} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <asset.icon className={`h-4 w-4 ${asset.color}`} />
                        <span className="font-medium">{asset.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r ${asset.color.replace('text', 'from')}-500 to-${asset.color.replace('text-', '').replace('-500', '')}-400`}
                        style={{ width: `${percentage}%` }}
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