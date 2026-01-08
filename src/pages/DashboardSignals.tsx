import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFrozenStatus } from '@/hooks/useFrozenStatus';
import { Signal, TrendingUp, Zap, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SignalData {
  id: string;
  name: string;
  description: string;
  price: number;
  profit_multiplier: number;
}

interface UserBalances {
  btc_balance: number;
  eth_balance: number;
  usdt_balance: number;
  interest_earned: number;
  commissions: number;
  base_balance: number;
}

const BALANCE_OPTIONS = [
  { value: 'usdt_balance', label: 'Tether (USDT)', key: 'usdt_balance' as keyof UserBalances },
  { value: 'btc_balance', label: 'Bitcoin (BTC)', key: 'btc_balance' as keyof UserBalances },
  { value: 'eth_balance', label: 'Ethereum (ETH)', key: 'eth_balance' as keyof UserBalances },
  { value: 'interest_earned', label: 'Interest Earned', key: 'interest_earned' as keyof UserBalances },
  { value: 'commissions', label: 'Commissions', key: 'commissions' as keyof UserBalances },
  { value: 'base_balance', label: 'USD Balance', key: 'base_balance' as keyof UserBalances },
];

const DashboardSignals = () => {
  const { user } = useAuth();
  const { isFrozen } = useFrozenStatus();
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBalances, setUserBalances] = useState<UserBalances>({
    btc_balance: 0,
    eth_balance: 0,
    usdt_balance: 0,
    interest_earned: 0,
    commissions: 0,
    base_balance: 0,
  });
  
  // Purchase dialog state
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<SignalData | null>(null);
  const [selectedBalanceSource, setSelectedBalanceSource] = useState<string>('usdt_balance');
  const [purchasing, setPurchasing] = useState(false);

  // Fetch signals
  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const { data, error } = await supabase
          .from('signals')
          .select('*')
          .order('price', { ascending: true });

        if (error) {
          console.error('Error fetching signals:', error);
          toast({
            title: "Error",
            description: "Failed to load trading signals",
            variant: "destructive",
          });
          return;
        }

        setSignals(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
  }, []);

  // Fetch user balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('btc_balance, eth_balance, usdt_balance, interest_earned, commissions, base_balance')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setUserBalances({
          btc_balance: data?.btc_balance || 0,
          eth_balance: data?.eth_balance || 0,
          usdt_balance: data?.usdt_balance || 0,
          interest_earned: data?.interest_earned || 0,
          commissions: data?.commissions || 0,
          base_balance: data?.base_balance || 0,
        });
      } catch (error) {
        console.error('Error fetching balances:', error);
      }
    };

    fetchBalances();

    // Subscribe to balance changes
    const channel = supabase
      .channel('signal-purchase-balances')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles',
        filter: `id=eq.${user?.id}`
      }, fetchBalances)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const openPurchaseDialog = (signal: SignalData) => {
    setSelectedSignal(signal);
    setSelectedBalanceSource('usdt_balance');
    setPurchaseDialogOpen(true);
  };

  const handlePurchaseSignal = async () => {
    if (!user || !selectedSignal) return;

    if (isFrozen) {
      toast({
        title: "Account Frozen",
        description: "Your account is frozen. You cannot make purchases.",
        variant: "destructive",
      });
      return;
    }

    // Validate balance
    const selectedBalance = userBalances[selectedBalanceSource as keyof UserBalances] || 0;
    if (selectedBalance < selectedSignal.price) {
      toast({
        title: "Insufficient Balance",
        description: `You need $${selectedSignal.price.toFixed(2)} but only have $${selectedBalance.toFixed(2)} in ${BALANCE_OPTIONS.find(b => b.value === selectedBalanceSource)?.label}`,
        variant: "destructive",
      });
      return;
    }

    setPurchasing(true);

    try {
      // Call the secure RPC function with balance source
      const { data, error } = await supabase.rpc('purchase_signal', {
        p_user_id: user.id,
        p_signal_id: selectedSignal.id,
        p_balance_source: selectedBalanceSource
      });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; error?: string; signal_name?: string; amount_paid?: number };

      if (!result.success) {
        toast({
          title: "Purchase Failed",
          description: result.error || "Failed to purchase signal",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Signal Purchased!",
        description: `Successfully purchased ${result.signal_name || selectedSignal.name} signal for $${result.amount_paid}`,
      });

      setPurchaseDialogOpen(false);
      setSelectedSignal(null);
    } catch (error: any) {
      console.error('Error purchasing signal:', error);
      toast({
        title: "Purchase failed",
        description: error.message || "Failed to purchase signal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const getSignalLevel = (multiplier: number) => {
    if (multiplier <= 1.5) return { level: 1, color: 'crypto-blue' };
    if (multiplier <= 2.0) return { level: 2, color: 'crypto-green' };
    if (multiplier <= 2.5) return { level: 3, color: 'crypto-purple' };
    if (multiplier <= 3.0) return { level: 4, color: 'crypto-gold' };
    if (multiplier <= 4.0) return { level: 5, color: 'destructive' };
    if (multiplier <= 5.0) return { level: 6, color: 'crypto-electric' };
    return { level: 7, color: 'gradient-primary' };
  };

  const getSelectedBalanceAmount = () => {
    return userBalances[selectedBalanceSource as keyof UserBalances] || 0;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-crypto-blue"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Trading Signals</h1>
          <p className="text-muted-foreground">Choose your signal package to increase profit speed</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {signals.map((signal) => {
            const signalLevel = getSignalLevel(signal.profit_multiplier);
            return (
              <Card key={signal.id} className="bg-muted/50 border-border hover:bg-muted/70 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Signal className="mr-2 h-5 w-5" />
                      {signal.name}
                    </CardTitle>
                    <Badge className={`bg-${signalLevel.color}/20 text-${signalLevel.color} border-${signalLevel.color}`}>
                      Level {signalLevel.level}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {signal.description}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Profit Multiplier:</span>
                      <span className="font-bold text-crypto-green">
                        {signal.profit_multiplier}x
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Monthly Boost:</span>
                      <span className="font-bold text-crypto-blue">
                        {((signal.profit_multiplier - 1) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-center py-4">
                    <div className="text-3xl font-bold bg-crypto-gradient bg-clip-text text-transparent">
                      ${signal.price}
                    </div>
                    <p className="text-xs text-muted-foreground">one-time payment</p>
                  </div>

                  <Button
                    onClick={() => openPurchaseDialog(signal)}
                    className="w-full bg-crypto-gradient hover:opacity-90"
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Purchase Signal
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {signals.length === 0 && (
          <Card className="bg-muted/50 border-border">
            <CardContent className="text-center py-12">
              <Zap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No signals available</h3>
              <p className="text-muted-foreground">Trading signals will be available soon</p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-muted/50 border-border">
          <CardHeader>
            <CardTitle>How Trading Signals Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Signal Levels</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Level 1-2: Beginner signals</li>
                  <li>• Level 3-4: Intermediate signals</li>
                  <li>• Level 5-7: Advanced signals</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Benefits</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Faster profit generation</li>
                  <li>• Higher return rates</li>
                  <li>• Exclusive market insights</li>
                  <li>• Priority support</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Dialog with Balance Selector */}
      <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Signal className="h-5 w-5" />
              Purchase {selectedSignal?.name} Signal
            </DialogTitle>
            <DialogDescription>
              Select which balance to use for this purchase
            </DialogDescription>
          </DialogHeader>

          {selectedSignal && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Signal Price:</span>
                  <span className="text-xl font-bold text-crypto-gold">${selectedSignal.price}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Profit Multiplier:</span>
                  <span className="font-semibold text-crypto-green">{selectedSignal.profit_multiplier}x</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Pay from:
                </label>
                <Select value={selectedBalanceSource} onValueChange={setSelectedBalanceSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select balance" />
                  </SelectTrigger>
                  <SelectContent>
                    {BALANCE_OPTIONS.map((option) => {
                      const balance = userBalances[option.key];
                      const hasEnough = balance >= (selectedSignal?.price || 0);
                      return (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          disabled={!hasEnough}
                        >
                          <div className="flex justify-between items-center w-full gap-4">
                            <span>{option.label}</span>
                            <span className={hasEnough ? 'text-crypto-green' : 'text-muted-foreground'}>
                              ${balance.toFixed(2)}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Available: ${getSelectedBalanceAmount().toFixed(2)}
                </p>
              </div>

              {getSelectedBalanceAmount() < selectedSignal.price && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">
                    Insufficient balance. You need ${(selectedSignal.price - getSelectedBalanceAmount()).toFixed(2)} more.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPurchaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePurchaseSignal}
              disabled={purchasing || getSelectedBalanceAmount() < (selectedSignal?.price || 0)}
              className="bg-crypto-gradient hover:opacity-90"
            >
              {purchasing ? 'Processing...' : `Pay $${selectedSignal?.price || 0}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DashboardSignals;
