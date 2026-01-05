import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFrozenStatus } from '@/hooks/useFrozenStatus';
import { Signal, TrendingUp, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SignalData {
  id: string;
  name: string;
  description: string;
  price: number;
  profit_multiplier: number;
}

const DashboardSignals = () => {
  const { user } = useAuth();
  const { isFrozen } = useFrozenStatus();
  const [signals, setSignals] = useState<SignalData[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handlePurchaseSignal = async (signalId: string, signalName: string) => {
    if (!user) return;

    if (isFrozen) {
      toast({
        title: "Account Frozen",
        description: "Your account is frozen. You cannot make purchases.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Call the secure RPC function to handle the purchase
      const { data, error } = await supabase.rpc('purchase_signal', {
        p_user_id: user.id,
        p_signal_id: signalId
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
        description: `Successfully purchased ${result.signal_name || signalName} signal for $${result.amount_paid}. You can now use it for trading.`,
      });
    } catch (error: any) {
      console.error('Error purchasing signal:', error);
      toast({
        title: "Purchase failed",
        description: error.message || "Failed to purchase signal. Please try again.",
        variant: "destructive",
      });
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
                    onClick={() => handlePurchaseSignal(signal.id, signal.name)}
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
    </DashboardLayout>
  );
};

export default DashboardSignals;