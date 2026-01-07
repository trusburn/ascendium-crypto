import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useFrozenStatus } from '@/hooks/useFrozenStatus';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeftRight, Bitcoin, CircleDollarSign, DollarSign, TrendingUp, Users, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface Balances {
  btc_balance: number;
  eth_balance: number;
  usdt_balance: number;
  interest_earned: number;
  commissions: number;
}

const balanceOptions = [
  { value: 'btc_balance', label: 'Bitcoin (BTC)', icon: Bitcoin, color: 'text-orange-500' },
  { value: 'eth_balance', label: 'Ethereum (ETH)', icon: CircleDollarSign, color: 'text-blue-500' },
  { value: 'usdt_balance', label: 'Tether (USDT)', icon: DollarSign, color: 'text-green-500' },
  { value: 'interest_earned', label: 'Interest Earned', icon: TrendingUp, color: 'text-crypto-green' },
  { value: 'commissions', label: 'Commissions', icon: Users, color: 'text-crypto-gold' },
];

const DashboardSwap = () => {
  const { user } = useAuth();
  const { isFrozen } = useFrozenStatus();
  const [amount, setAmount] = useState('');
  const [fromBalance, setFromBalance] = useState('btc_balance');
  const [toBalance, setToBalance] = useState('usdt_balance');
  const [loading, setLoading] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [balances, setBalances] = useState<Balances>({
    btc_balance: 0,
    eth_balance: 0,
    usdt_balance: 0,
    interest_earned: 0,
    commissions: 0,
  });

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
        .select('btc_balance, eth_balance, usdt_balance, interest_earned, commissions')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setBalances({
        btc_balance: data?.btc_balance || 0,
        eth_balance: data?.eth_balance || 0,
        usdt_balance: data?.usdt_balance || 0,
        interest_earned: data?.interest_earned || 0,
        commissions: data?.commissions || 0,
      });
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoadingBalances(false);
    }
  };

  const getBalanceValue = (key: string) => {
    return balances[key as keyof Balances] || 0;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const handleSwapDirection = () => {
    const temp = fromBalance;
    setFromBalance(toBalance);
    setToBalance(temp);
  };

  const handleMaxAmount = () => {
    setAmount(getBalanceValue(fromBalance).toString());
  };

  const handleSwap = async () => {
    if (isFrozen) {
      toast({
        title: "Account Frozen",
        description: "Your account is frozen. You cannot make swaps.",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to swap.",
        variant: "destructive",
      });
      return;
    }

    if (fromBalance === toBalance) {
      toast({
        title: "Invalid Swap",
        description: "Cannot swap to the same balance type.",
        variant: "destructive",
      });
      return;
    }

    const swapAmount = parseFloat(amount);
    const availableBalance = getBalanceValue(fromBalance);

    if (swapAmount > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${formatCurrency(availableBalance)} available.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('swap_balances', {
        p_user_id: user?.id,
        p_from_balance: fromBalance,
        p_to_balance: toBalance,
        p_amount: swapAmount
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };

      if (!result.success) {
        throw new Error(result.error || 'Swap failed');
      }

      toast({
        title: "Swap Successful",
        description: `Swapped ${formatCurrency(swapAmount)} from ${balanceOptions.find(b => b.value === fromBalance)?.label} to ${balanceOptions.find(b => b.value === toBalance)?.label}`,
      });

      // Reset form and refresh balances
      setAmount('');
      fetchBalances();
    } catch (error: any) {
      console.error('Swap error:', error);
      toast({
        title: "Swap Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fromOption = balanceOptions.find(b => b.value === fromBalance);
  const toOption = balanceOptions.find(b => b.value === toBalance);
  const swapAmount = parseFloat(amount) || 0;
  const isValidSwap = swapAmount > 0 && swapAmount <= getBalanceValue(fromBalance) && fromBalance !== toBalance;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Swap Balances</h1>
          <p className="text-muted-foreground">Convert between your different balance types instantly</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Swap Card */}
          <Card className="bg-muted/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowLeftRight className="mr-2 h-5 w-5 text-crypto-blue" />
                Internal Swap
              </CardTitle>
              <CardDescription>
                Swap between your balances at 1:1 rate (no fees)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* From Balance */}
              <div className="space-y-2">
                <Label>From</Label>
                <Select value={fromBalance} onValueChange={setFromBalance}>
                  <SelectTrigger className="border-border/50 focus:border-crypto-blue">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {balanceOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${option.color}`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground flex justify-between">
                  <span>Available:</span>
                  <span className="font-medium text-foreground">
                    {loadingBalances ? '...' : formatCurrency(getBalanceValue(fromBalance))}
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="border-border/50 focus:border-crypto-blue pr-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-crypto-blue"
                    onClick={handleMaxAmount}
                  >
                    MAX
                  </Button>
                </div>
              </div>

              {/* Swap Direction Button */}
              <div className="flex justify-center">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full h-12 w-12 border-2 border-crypto-blue/50 hover:border-crypto-blue hover:bg-crypto-blue/10"
                    onClick={handleSwapDirection}
                  >
                    <RefreshCw className="h-5 w-5 text-crypto-blue" />
                  </Button>
                </motion.div>
              </div>

              {/* To Balance */}
              <div className="space-y-2">
                <Label>To</Label>
                <Select value={toBalance} onValueChange={setToBalance}>
                  <SelectTrigger className="border-border/50 focus:border-crypto-blue">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {balanceOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${option.color}`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground flex justify-between">
                  <span>Current Balance:</span>
                  <span className="font-medium text-foreground">
                    {loadingBalances ? '...' : formatCurrency(getBalanceValue(toBalance))}
                  </span>
                </div>
              </div>

              {/* Preview */}
              {swapAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-crypto-blue/10 border border-crypto-blue/30 rounded-lg"
                >
                  <h4 className="font-medium text-crypto-blue mb-2">Swap Preview</h4>
                  <div className="flex items-center justify-between text-sm">
                    <span>You send:</span>
                    <span className="font-bold">{formatCurrency(swapAmount)} {fromOption?.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span>You receive:</span>
                    <span className="font-bold text-crypto-green">{formatCurrency(swapAmount)} {toOption?.label}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Rate: 1:1 (No fees applied)
                  </div>
                </motion.div>
              )}

              <Button
                onClick={handleSwap}
                className="w-full bg-crypto-gradient hover:opacity-90 h-12"
                disabled={loading || !isValidSwap}
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="mr-2 h-4 w-4" />
                    Swap {amount ? formatCurrency(swapAmount) : ''}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-muted/50 border-border">
            <CardHeader>
              <CardTitle>Your Balances</CardTitle>
              <CardDescription>Current balance breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {balanceOptions.map((option) => {
                const Icon = option.icon;
                const value = getBalanceValue(option.value);
                return (
                  <div 
                    key={option.value}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-background ${option.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <span className="font-bold">
                      {loadingBalances ? '...' : formatCurrency(value)}
                    </span>
                  </div>
                );
              })}

              <div className="mt-6 p-4 bg-crypto-gold/10 border border-crypto-gold/30 rounded-lg">
                <h4 className="font-medium text-crypto-gold mb-2">Swap Rules:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All swaps are instant and at 1:1 rate</li>
                  <li>• No fees are charged for internal swaps</li>
                  <li>• Net balance remains unchanged after swap</li>
                  <li>• You can swap between any balance types</li>
                  <li>• Interest & Commissions can be converted to USDT</li>
                </ul>
              </div>

              <div className="p-4 bg-crypto-blue/10 border border-crypto-blue/30 rounded-lg">
                <h4 className="font-medium text-crypto-blue mb-2">Common Swaps:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• BTC ↔ USDT - Convert between Bitcoin and Tether</li>
                  <li>• ETH ↔ USDT - Convert between Ethereum and Tether</li>
                  <li>• Interest → USDT - Cash out your trading profits</li>
                  <li>• Commissions → USDT - Convert referral earnings</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardSwap;
