import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PurchasedSignal {
  id: string;
  signal_id: string;
  signals: {
    name: string;
    profit_multiplier: number;
  };
}

interface ActiveTrade {
  id: string;
  trade_type: string;
  initial_amount: number;
  current_profit: number;
  profit_multiplier: number;
  started_at: string;
  signals: {
    name: string;
  };
}

const TradingChart = () => {
  const { user } = useAuth();
  const [purchasedSignals, setPurchasedSignals] = useState<PurchasedSignal[]>([]);
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<string>('');
  const [tradeAmount, setTradeAmount] = useState<number>(100);
  const [chartData, setChartData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch purchased signals
        const { data: signalsData, error: signalsError } = await supabase
          .from('purchased_signals')
          .select(`
            id,
            signal_id,
            signals (
              name,
              profit_multiplier
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (signalsError) {
          console.error('Error fetching purchased signals:', signalsError);
          return;
        }

        setPurchasedSignals(signalsData || []);

        // Fetch active trades
        const { data: tradesData, error: tradesError } = await supabase
          .from('trades')
          .select(`
            id,
            trade_type,
            initial_amount,
            current_profit,
            profit_multiplier,
            started_at,
            signals (
              name
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (tradesError) {
          console.error('Error fetching trades:', tradesError);
          return;
        }

        setActiveTrades(tradesData || []);

        // Generate chart data based on active trades
        const baseValue = 100;
        const data = Array.from({ length: 50 }, (_, i) => {
          const totalProfit = tradesData?.reduce((sum, trade) => {
            const hoursElapsed = (Date.now() - new Date(trade.started_at).getTime()) / (1000 * 60 * 60);
            const profit = trade.initial_amount * trade.profit_multiplier * (hoursElapsed / 24);
            return sum + profit;
          }, 0) || 0;
          
          return baseValue + (totalProfit * (i / 50)) + Math.sin(i * 0.2) * 5;
        });

        setChartData(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Update chart every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleTrade = async (type: 'buy' | 'sell') => {
    if (!selectedSignal || !user) {
      toast({
        title: "Error",
        description: "Please select a signal first",
        variant: "destructive",
      });
      return;
    }

    const selectedSignalData = purchasedSignals.find(s => s.id === selectedSignal);
    if (!selectedSignalData) return;

    try {
      const { error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          signal_id: selectedSignalData.signal_id,
          purchased_signal_id: selectedSignal,
          trade_type: type,
          initial_amount: tradeAmount,
          profit_multiplier: selectedSignalData.signals.profit_multiplier,
        });

      if (error) {
        console.error('Error creating trade:', error);
        toast({
          title: "Error",
          description: "Failed to create trade",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Trade Started",
        description: `${type.toUpperCase()} order placed with ${selectedSignalData.signals.name} signal`,
      });

      // Refresh data
      const { data: tradesData } = await supabase
        .from('trades')
        .select(`
          id,
          trade_type,
          initial_amount,
          current_profit,
          profit_multiplier,
          started_at,
          signals (
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      setActiveTrades(tradesData || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <Card className="bg-muted/50 border-border">
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-crypto-blue"></div>
        </CardContent>
      </Card>
    );
  }

  const totalProfit = activeTrades.reduce((sum, trade) => {
    const hoursElapsed = (Date.now() - new Date(trade.started_at).getTime()) / (1000 * 60 * 60);
    return sum + (trade.initial_amount * trade.profit_multiplier * (hoursElapsed / 24));
  }, 0);

  return (
    <div className="space-y-6">
      {/* Trading Chart */}
      <Card className="bg-muted/50 border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5 text-crypto-blue" />
              Live Trading Chart
            </CardTitle>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <p className="text-lg font-bold text-crypto-green">
                  +${totalProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Chart Area */}
          <div className="h-64 bg-crypto-blue/5 rounded-lg border relative overflow-hidden">
            <div className="absolute inset-0 flex items-end justify-center p-4">
              <div className="flex items-end space-x-1 w-full">
                {chartData.map((value, index) => (
                  <div
                    key={index}
                    className="bg-crypto-blue/60 rounded-t"
                    style={{
                      height: `${Math.max(5, (value / Math.max(...chartData)) * 100)}%`,
                      width: `${100 / chartData.length}%`,
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="absolute top-4 left-4">
              <div className="text-2xl font-bold text-crypto-blue">
                ${(chartData[chartData.length - 1] || 0).toFixed(2)}
              </div>
              <div className="text-sm text-crypto-green">
                +{((totalProfit / 100) * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Trading Controls */}
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Signal</label>
                <Select value={selectedSignal} onValueChange={setSelectedSignal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your purchased signal" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchasedSignals.map((signal) => (
                      <SelectItem key={signal.id} value={signal.id}>
                        {signal.signals.name} (×{signal.signals.profit_multiplier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Trade Amount</label>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(Number(e.target.value))}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-md"
                    min="1"
                    max="10000"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={() => handleTrade('buy')}
                disabled={!selectedSignal}
                className="flex-1 bg-crypto-green hover:bg-crypto-green/90"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                BUY
              </Button>
              <Button
                onClick={() => handleTrade('sell')}
                disabled={!selectedSignal}
                variant="outline"
                className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-background"
              >
                <TrendingDown className="mr-2 h-4 w-4" />
                SELL
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Trades */}
      {activeTrades.length > 0 && (
        <Card className="bg-muted/50 border-border">
          <CardHeader>
            <CardTitle>Active Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeTrades.map((trade) => {
                const hoursElapsed = (Date.now() - new Date(trade.started_at).getTime()) / (1000 * 60 * 60);
                const currentProfit = trade.initial_amount * trade.profit_multiplier * (hoursElapsed / 24);
                
                return (
                  <div key={trade.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Badge className={trade.trade_type === 'buy' ? 'bg-crypto-green/20 text-crypto-green' : 'bg-destructive/20 text-destructive'}>
                        {trade.trade_type.toUpperCase()}
                      </Badge>
                      <div>
                        <p className="font-medium">{trade.signals.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${trade.initial_amount} • ×{trade.profit_multiplier}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-crypto-green">+${currentProfit.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {hoursElapsed.toFixed(1)}h ago
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {purchasedSignals.length === 0 && (
        <Card className="bg-muted/50 border-border">
          <CardContent className="text-center py-8">
            <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Signals Purchased</h3>
            <p className="text-muted-foreground mb-4">
              Purchase trading signals to start trading and earning profits
            </p>
            <Button className="bg-crypto-gradient hover:opacity-90">
              Browse Signals
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TradingChart;