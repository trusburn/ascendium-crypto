import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useFrozenStatus } from '@/hooks/useFrozenStatus';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { supabase } from '@/integrations/supabase/client';
import { ArrowDownLeft, AlertTriangle, Wallet, TrendingUp, Users, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UserBalances {
  net_balance: number;
  interest_earned: number;
  commissions: number;
}

const DashboardWithdrawal = () => {
  const { user } = useAuth();
  const { isFrozen } = useFrozenStatus();
  const { settings, isLoading: settingsLoading } = useAdminSettings();
  const [amount, setAmount] = useState('');
  const [cryptoType, setCryptoType] = useState('bitcoin');
  const [walletAddress, setWalletAddress] = useState('');
  const [withdrawalSource, setWithdrawalSource] = useState('net_balance');
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<UserBalances>({
    net_balance: 0,
    interest_earned: 0,
    commissions: 0,
  });
  const [loadingBalances, setLoadingBalances] = useState(true);

  const minWithdrawal = settings.minimum_withdrawal;

  const cryptoOptions = [
    { value: 'bitcoin', label: 'Bitcoin (BTC)' },
    { value: 'ethereum', label: 'Ethereum (ETH)' },
    { value: 'usdt', label: 'USDT (TRC20)' },
    { value: 'bnb', label: 'BNB (BSC)' },
  ];

  const sourceOptions = [
    { value: 'net_balance', label: 'Net Balance', icon: Wallet, color: 'text-crypto-blue' },
    { value: 'interest_earned', label: 'Interest Earned', icon: TrendingUp, color: 'text-crypto-green' },
    { value: 'commissions', label: 'Commissions', icon: Users, color: 'text-crypto-gold' },
  ];

  useEffect(() => {
    if (user) {
      fetchBalances();
    }
  }, [user]);

  const fetchBalances = async () => {
    if (!user) return;
    
    setLoadingBalances(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('net_balance, interest_earned, commissions')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching balances:', error);
        return;
      }

      setBalances({
        net_balance: data?.net_balance || 0,
        interest_earned: data?.interest_earned || 0,
        commissions: data?.commissions || 0,
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingBalances(false);
    }
  };

  const getAvailableBalance = () => {
    return balances[withdrawalSource as keyof UserBalances] || 0;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const handleSubmitWithdrawal = async () => {
    if (isFrozen) {
      toast({
        title: "Account Frozen",
        description: "Your account is frozen. You cannot make withdrawals.",
        variant: "destructive",
      });
      return;
    }

    if (!amount || !cryptoType || !walletAddress || !user) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const withdrawAmount = parseFloat(amount);
    const availableBalance = getAvailableBalance();

    if (withdrawAmount < minWithdrawal) {
      toast({
        title: "Minimum Amount Required",
        description: `Minimum withdrawal amount is $${minWithdrawal}`,
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You don't have enough funds in ${sourceOptions.find(s => s.value === withdrawalSource)?.label}. Available: ${formatCurrency(availableBalance)}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: withdrawAmount,
          crypto_type: cryptoType,
          wallet_address: walletAddress,
          source: withdrawalSource,
          status: 'pending'
        });

      if (error) {
        console.error('Error creating withdrawal:', error);
        toast({
          title: "Withdrawal Failed",
          description: "Failed to submit withdrawal request",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Withdrawal Submitted",
        description: "Your withdrawal request has been submitted and is pending admin approval.",
      });

      // Reset form
      setAmount('');
      setCryptoType('bitcoin');
      setWalletAddress('');
      setWithdrawalSource('net_balance');
      
      // Refresh balances
      fetchBalances();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const availableBalance = getAvailableBalance();
  const withdrawAmount = parseFloat(amount) || 0;
  const isValidAmount = withdrawAmount >= minWithdrawal && withdrawAmount <= availableBalance;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Withdraw Funds</h1>
          <p className="text-muted-foreground">Request a withdrawal from your account</p>
        </div>

        {/* Balance Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {sourceOptions.map((source) => {
            const Icon = source.icon;
            const balance = balances[source.value as keyof UserBalances];
            const isSelected = withdrawalSource === source.value;
            
            return (
              <Card 
                key={source.value}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'bg-muted/50 hover:bg-muted'
                } border-border`}
                onClick={() => setWithdrawalSource(source.value)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-background ${source.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{source.label}</p>
                        <p className="text-lg font-bold">
                          {loadingBalances ? '...' : formatCurrency(balance)}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Withdrawal Form */}
          <Card className="bg-muted/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowDownLeft className="mr-2 h-5 w-5 text-destructive" />
                Withdrawal Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-background/50 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Withdrawing from:</span>
                  <span className="font-medium">
                    {sourceOptions.find(s => s.value === withdrawalSource)?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-muted-foreground">Available:</span>
                  <span className="font-bold text-crypto-green">
                    {loadingBalances ? '...' : formatCurrency(availableBalance)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Withdrawal Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder={`Enter amount (minimum $${settingsLoading ? '...' : minWithdrawal})`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border-border/50 focus:border-crypto-blue"
                />
                {amount && !isValidAmount && (
                  <p className="text-xs text-destructive">
                    {withdrawAmount < minWithdrawal 
                      ? `Minimum withdrawal is $${minWithdrawal}` 
                      : `Exceeds available balance of ${formatCurrency(availableBalance)}`}
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-crypto-blue"
                  onClick={() => setAmount(availableBalance.toString())}
                >
                  Withdraw Max ({formatCurrency(availableBalance)})
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="crypto">Receive As (Cryptocurrency)</Label>
                <Select value={cryptoType} onValueChange={setCryptoType}>
                  <SelectTrigger className="border-border/50 focus:border-crypto-blue">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cryptoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wallet">Your {cryptoOptions.find(c => c.value === cryptoType)?.label.split(' ')[0]} Wallet Address</Label>
                <Input
                  id="wallet"
                  type="text"
                  placeholder="Enter your wallet address"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="border-border/50 focus:border-crypto-blue"
                />
                <p className="text-xs text-muted-foreground">
                  Make sure this address matches the selected cryptocurrency
                </p>
              </div>

              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h4 className="font-medium text-destructive">Important</h4>
                    <p className="text-sm text-muted-foreground">
                      Double-check your wallet address. Incorrect addresses may result in permanent loss of funds. All withdrawals require admin approval.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSubmitWithdrawal}
                className="w-full bg-destructive hover:bg-destructive/90"
                disabled={loading || !amount || !walletAddress || !isValidAmount}
              >
                {loading ? "Submitting..." : `Request Withdrawal of ${amount ? formatCurrency(withdrawAmount) : '$0.00'}`}
              </Button>
            </CardContent>
          </Card>

          {/* Withdrawal Information */}
          <Card className="bg-muted/50 border-border">
            <CardHeader>
              <CardTitle>Withdrawal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium">Processing Time</h4>
                  <p className="text-sm text-muted-foreground">
                    Withdrawals are processed within 24-72 hours after admin approval
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Minimum Amount</h4>
                  <p className="text-sm text-muted-foreground">
                    ${settingsLoading ? '...' : minWithdrawal} USD minimum withdrawal amount
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Fees</h4>
                  <p className="text-sm text-muted-foreground">
                    Network fees apply based on blockchain congestion
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Security</h4>
                  <p className="text-sm text-muted-foreground">
                    All withdrawals require manual admin approval for security
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-crypto-blue/10 border border-crypto-blue/30 rounded-lg">
                <h4 className="font-medium text-crypto-blue mb-2">Withdrawal Steps:</h4>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Select withdrawal source (balance type)</li>
                  <li>2. Enter withdrawal amount</li>
                  <li>3. Select cryptocurrency to receive</li>
                  <li>4. Provide your wallet address</li>
                  <li>5. Submit for admin approval</li>
                  <li>6. Receive funds after processing</li>
                </ol>
              </div>

              <div className="mt-4 p-4 bg-crypto-gold/10 border border-crypto-gold/30 rounded-lg">
                <h4 className="font-medium text-crypto-gold mb-2">Withdrawal Sources:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><strong>Net Balance:</strong> Your main trading balance</li>
                  <li><strong>Interest Earned:</strong> Profits from trading</li>
                  <li><strong>Commissions:</strong> Referral earnings</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardWithdrawal;