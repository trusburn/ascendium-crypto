import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Activity, DollarSign, Bitcoin, DollarSign as Forex } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PurchasedSignal {
  id: string;
  signal_id: string;
  signal_name: string;
  profit_multiplier: number;
}

interface ActiveTrade {
  id: string;
  trade_type: string;
  initial_amount: number;
  current_profit: number;
  profit_multiplier: number;
  started_at: string;
  signal_name: string;
}

interface CandlestickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TradeableAsset {
  id: string;
  symbol: string;
  name: string;
  asset_type: string;
  current_price: number;
  api_id?: string;
}

type TradingEngineType = 'rising' | 'general';

// NOTE: Profit calculation is now done entirely in the DATABASE via PostgreSQL functions
// Frontend only reads current_profit from the trades table - NO client-side calculations

const TradingChart = () => {
  const { user } = useAuth();
  const [purchasedSignals, setPurchasedSignals] = useState<PurchasedSignal[]>([]);
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [tradeAmount, setTradeAmount] = useState<number>(100);
  const [chartData, setChartData] = useState<CandlestickData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cryptoAssets, setCryptoAssets] = useState<TradeableAsset[]>([]);
  const [forexAssets, setForexAssets] = useState<TradeableAsset[]>([]);
  const [assetType, setAssetType] = useState<'crypto' | 'forex'>('crypto');
  const [tradingEngine, setTradingEngine] = useState<TradingEngineType>('rising');

  // Fetch trading engine setting for current user
  useEffect(() => {
    const fetchTradingEngine = async () => {
      if (!user) return;

      try {
        // Get user-specific engine setting
        const { data: userEngine } = await supabase
          .from('user_trading_engines')
          .select('engine_type')
          .eq('user_id', user.id)
          .maybeSingle();

        // Get global engine setting
        const { data: globalSetting } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'global_trading_engine')
          .maybeSingle();

        const globalEngine = (globalSetting?.value as TradingEngineType) || 'rising';
        
        // Determine effective engine
        if (userEngine?.engine_type === 'default' || !userEngine) {
          setTradingEngine(globalEngine);
        } else {
          setTradingEngine(userEngine.engine_type as TradingEngineType);
        }
      } catch (error) {
        console.error('Error fetching trading engine:', error);
      }
    };

    fetchTradingEngine();

    // Subscribe to changes
    const channel = supabase
      .channel('trading-engine-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_settings' }, fetchTradingEngine)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_trading_engines' }, fetchTradingEngine)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Fetch tradeable assets
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const { data: assets, error } = await supabase
          .from('tradeable_assets')
          .select('*')
          .order('symbol');

        if (error) throw error;

        const crypto = assets?.filter(a => a.asset_type === 'crypto') || [];
        const forex = assets?.filter(a => a.asset_type === 'forex') || [];

        setCryptoAssets(crypto as TradeableAsset[]);
        setForexAssets(forex as TradeableAsset[]);

        // Set default selected asset
        if (crypto.length > 0) setSelectedAsset(crypto[0].id);
      } catch (error) {
        console.error('Error fetching assets:', error);
      }
    };

    fetchAssets();
  }, []);

  // Update crypto prices from CoinGecko
  useEffect(() => {
    const updateCryptoPrices = async () => {
      try {
        const cryptoIds = cryptoAssets.filter(a => a.api_id).map(a => a.api_id).join(',');
        if (!cryptoIds) return;

        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds}&vs_currencies=usd`
        );
        const data = await response.json();

        // Update prices in database
        for (const asset of cryptoAssets) {
          if (asset.api_id && data[asset.api_id]) {
            await supabase
              .from('tradeable_assets')
              .update({ current_price: data[asset.api_id].usd })
              .eq('id', asset.id);
          }
        }
      } catch (error) {
        console.error('Error updating crypto prices:', error);
      }
    };

    if (cryptoAssets.length > 0) {
      updateCryptoPrices();
      const interval = setInterval(updateCryptoPrices, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [cryptoAssets]);

  // Simulate forex price movements
  useEffect(() => {
    const updateForexPrices = async () => {
      try {
        for (const asset of forexAssets) {
          // Simulate small price changes (±0.1%)
          const change = (Math.random() - 0.5) * 0.002;
          const newPrice = asset.current_price * (1 + change);

          await supabase
            .from('tradeable_assets')
            .update({ current_price: newPrice })
            .eq('id', asset.id);
        }
      } catch (error) {
        console.error('Error updating forex prices:', error);
      }
    };

    if (forexAssets.length > 0) {
      const interval = setInterval(updateForexPrices, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [forexAssets]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // FORCE sync trading profits first
        console.log('Syncing trading profits...');
        const { error: syncError } = await supabase.rpc('sync_trading_profits');
        if (syncError) {
          console.error('Sync error:', syncError);
        } else {
          console.log('Trading profits synced successfully');
        }

        // Fetch purchased signals
        const { data: purchasedData, error: purchasedError } = await supabase
          .from('purchased_signals')
          .select('id, signal_id')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (purchasedError) {
          console.error('Error fetching purchased signals:', purchasedError);
          return;
        }

        // Fetch signal details for purchased signals
        const signalIds = purchasedData?.map(p => p.signal_id) || [];
        const { data: signalsData, error: signalsError } = await supabase
          .from('signals')
          .select('id, name, profit_multiplier')
          .in('id', signalIds);

        if (signalsError) {
          console.error('Error fetching signals:', signalsError);
          return;
        }

        // Merge data
        const mergedPurchasedSignals = purchasedData?.map(purchased => {
          const signal = signalsData?.find(s => s.id === purchased.signal_id);
          return {
            id: purchased.id,
            signal_id: purchased.signal_id,
            signal_name: signal?.name || 'Unknown Signal',
            profit_multiplier: signal?.profit_multiplier || 1.0,
          };
        }) || [];

        setPurchasedSignals(mergedPurchasedSignals);

        // Fetch active trades
        console.log('📈 Fetching active trades...');
        const { data: tradesData, error: tradesError } = await supabase
          .from('trades')
          .select('id, trade_type, initial_amount, current_profit, profit_multiplier, started_at, signal_id')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (tradesError) {
          console.error('❌ Error fetching trades:', tradesError);
          return;
        }

        console.log('💹 Raw trades data:', tradesData);

        // Merge trade data with signal names
        const mergedTrades = tradesData?.map(trade => {
          const signal = signalsData?.find(s => s.id === trade.signal_id);
          return {
            ...trade,
            signal_name: signal?.name || 'Unknown Signal',
          };
        }) || [];

        console.log('🔄 Merged trades with signals:', mergedTrades);
        setActiveTrades(mergedTrades);

        // Generate candlestick chart data based on trading engine
        const baseValue = 100;
        const data = Array.from({ length: 30 }, (_, i) => {
          const totalProfit = mergedTrades?.reduce((sum, trade) => {
            const hoursElapsed = (Date.now() - new Date(trade.started_at).getTime()) / (1000 * 60 * 60);
            const daysElapsed = hoursElapsed / 24;
            const profit = trade.initial_amount * trade.profit_multiplier * daysElapsed;
            return sum + profit;
          }, 0) || 0;
          
          if (tradingEngine === 'rising') {
            // Rising engine: Only upward movement
            const basePrice = baseValue + (totalProfit * (i / 30));
            const volatility = 2 + Math.sin(i * 0.1) * 0.5;
            const open = basePrice + Math.sin(i * 0.3) * volatility;
            const close = basePrice + Math.sin((i + 1) * 0.3) * volatility + (Math.random() * 0.5); // Slight upward bias
            const high = Math.max(open, close) + Math.random() * volatility;
            const low = Math.min(open, close) - Math.random() * volatility * 0.3; // Less downward movement
            
            return {
              time: new Date(Date.now() - (29 - i) * 60000).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              open: Number(open.toFixed(2)),
              high: Number(high.toFixed(2)),
              low: Number(Math.max(low, baseValue * 0.9).toFixed(2)), // Floor to prevent big dips
              close: Number(Math.max(close, open).toFixed(2)), // Always close higher or equal
            };
          } else {
            // General engine: Real market-like movement (up and down)
            const volatilityFactor = 8 + Math.sin(i * 0.2) * 3;
            const trend = Math.sin(i * 0.15) * 15; // Creates waves
            const randomWalk = (Math.random() - 0.5) * volatilityFactor;
            const basePrice = baseValue + trend + randomWalk + (totalProfit * 0.1);
            
            const open = basePrice + (Math.random() - 0.5) * 3;
            const close = basePrice + (Math.random() - 0.5) * 3;
            const high = Math.max(open, close) + Math.random() * 2;
            const low = Math.min(open, close) - Math.random() * 2;
            
            return {
              time: new Date(Date.now() - (29 - i) * 60000).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }),
              open: Number(open.toFixed(2)),
              high: Number(high.toFixed(2)),
              low: Number(low.toFixed(2)),
              close: Number(close.toFixed(2)),
            };
          }
        });

        setChartData(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Update profits via DATABASE function every 2 seconds (no frontend calculations)
    const interval = setInterval(async () => {
      if (activeTrades.length === 0) return;
      
      console.log('🔄 Syncing profits from database...');
      try {
        // Call database function to calculate and sync all profits
        const { error: syncError } = await supabase.rpc('update_live_interest_earned');
        if (syncError) {
          console.error('❌ Sync error:', syncError);
        } else {
          console.log('✅ Database profits synced');
        }
        
        // Refresh trades data to get updated current_profit values from DB
        const { data: tradesData } = await supabase
          .from('trades')
          .select('id, trade_type, initial_amount, current_profit, profit_multiplier, started_at, signal_id')
          .eq('user_id', user?.id)
          .eq('status', 'active');
        
        if (tradesData) {
          const signalIds = tradesData.map(t => t.signal_id);
          const { data: signalsData } = await supabase
            .from('signals')
            .select('id, name')
            .in('id', signalIds.length > 0 ? signalIds : ['']);
          
          const mergedTrades = tradesData.map(trade => ({
            ...trade,
            signal_name: signalsData?.find(s => s.id === trade.signal_id)?.name || 'Unknown Signal',
          }));
          
          setActiveTrades(mergedTrades);
        }
      } catch (error) {
        console.error('💥 Sync interval error:', error);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [user, tradingEngine, activeTrades.length]);

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
      // Get current profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('net_balance, base_balance, total_invested')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast({
          title: "Error",
          description: "Failed to fetch profile data",
          variant: "destructive",
        });
        return;
      }

      const currentBalance = Number(profileData.net_balance || 0);

      // Check if user has enough balance
      if (currentBalance < tradeAmount) {
        toast({
          title: "Insufficient Balance",
          description: `You need $${tradeAmount} to place this trade. Current balance: $${currentBalance.toFixed(2)}`,
          variant: "destructive",
        });
        return;
      }

      // Get current asset price
      const { data: assetData, error: assetError } = await supabase
        .from('tradeable_assets')
        .select('current_price, symbol')
        .eq('id', selectedAsset)
        .single();

      if (assetError || !assetData) {
        toast({
          title: "Error",
          description: "Failed to fetch asset price",
          variant: "destructive",
        });
        return;
      }

      const entryPrice = assetData.current_price;

      // FIRST: Deduct balance using secure database function
      const { data: balanceDeducted, error: balanceError } = await supabase
        .rpc('deduct_trade_balance', {
          p_user_id: user.id,
          p_amount: tradeAmount,
        });

      if (balanceError) {
        console.error('Error deducting balance:', balanceError);
        toast({
          title: "Error",
          description: "Failed to process trade",
          variant: "destructive",
        });
        return;
      }

      if (!balanceDeducted) {
        toast({
          title: "Insufficient Balance",
          description: "Not enough balance to place this trade",
          variant: "destructive",
        });
        return;
      }

      // THEN: Create the trade after balance is deducted
      const { error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          signal_id: selectedSignalData.signal_id,
          purchased_signal_id: selectedSignal,
          trade_type: type,
          initial_amount: tradeAmount,
          profit_multiplier: selectedSignalData.profit_multiplier,
          asset_id: selectedAsset,
          entry_price: entryPrice,
          current_price: entryPrice,
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

      // Sync trading profits to update interest_earned and net_balance with profits
      const { error: syncError } = await supabase.rpc('sync_trading_profits');
      
      if (syncError) {
        console.error('Error syncing trading profits:', syncError);
        toast({
          title: "Sync Warning",
          description: "Trade completed but balance sync failed",
          variant: "destructive",
        });
      }

      toast({
        title: "Trade Started",
        description: `${type.toUpperCase()} order placed for ${assetData.symbol} with ${selectedSignalData.signal_name} signal`,
      });

      // Refresh trades data
      const { data: tradesData } = await supabase
        .from('trades')
        .select('id, trade_type, initial_amount, current_profit, profit_multiplier, started_at, signal_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      // Get signal names for trades
      if (tradesData) {
        const signalIds = tradesData.map(t => t.signal_id);
        const { data: signalsData } = await supabase
          .from('signals')
          .select('id, name')
          .in('id', signalIds);

        const mergedTrades = tradesData.map(trade => {
          const signal = signalsData?.find(s => s.id === trade.signal_id);
          return {
            ...trade,
            signal_name: signal?.name || 'Unknown Signal',
          };
        });

        setActiveTrades(mergedTrades);
      }
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

  // Get profit directly from database - NO frontend calculation
  const getProfit = (trade: ActiveTrade) => {
    return trade.current_profit || 0;
  };

  const totalProfit = activeTrades.reduce((sum, trade) => sum + getProfit(trade), 0);

  return (
    <div className="space-y-6">
      {/* Trading Chart */}
      <Card className="bg-muted/50 border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5 text-crypto-blue" />
              Live Trading Chart
              <Badge 
                variant="outline" 
                className={`ml-3 ${tradingEngine === 'rising' ? 'border-green-500 text-green-500' : 'border-amber-500 text-amber-500'}`}
              >
                {tradingEngine === 'rising' ? (
                  <><TrendingUp className="h-3 w-3 mr-1" /> Rising</>
                ) : (
                  <><TrendingDown className="h-3 w-3 mr-1" /> General</>
                )}
              </Badge>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-foreground/70">Total Profit</p>
                <p className={`text-lg font-bold ${totalProfit >= 0 ? 'text-crypto-green' : 'text-destructive'}`}>
                  {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Professional Candlestick Chart */}
          <div className="h-80 bg-slate-950 rounded-lg border relative overflow-hidden">
            {/* Grid lines */}
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-5 opacity-20">
              {Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="border border-slate-700/30"></div>
              ))}
            </div>
            
            {/* Price levels on the right */}
            <div className="absolute right-2 top-0 h-full flex flex-col justify-between py-4 text-xs text-slate-400">
              {chartData.length > 0 && (() => {
                const maxPrice = Math.max(...chartData.map(c => c.high));
                const minPrice = Math.min(...chartData.map(c => c.low));
                const levels = [];
                for (let i = 0; i < 6; i++) {
                  const price = maxPrice - (i * (maxPrice - minPrice) / 5);
                  levels.push(price.toFixed(2));
                }
                return levels.map((level, i) => (
                  <span key={i} className="bg-slate-950/80 px-1 rounded">{level}</span>
                ));
              })()}
            </div>

            {/* Candlesticks */}
            <div className="absolute inset-4 flex items-end justify-between">
              {chartData.map((candle, index) => {
                const isGreen = candle.close >= candle.open;
                const bodyHeight = Math.abs(candle.close - candle.open);
                const maxPrice = Math.max(...chartData.map(c => c.high));
                const minPrice = Math.min(...chartData.map(c => c.low));
                const priceRange = maxPrice - minPrice;
                const chartHeight = 280;
                
                // Calculate positions
                const highY = ((maxPrice - candle.high) / priceRange) * chartHeight;
                const lowY = ((maxPrice - candle.low) / priceRange) * chartHeight;
                const openY = ((maxPrice - candle.open) / priceRange) * chartHeight;
                const closeY = ((maxPrice - candle.close) / priceRange) * chartHeight;
                
                const bodyTop = Math.min(openY, closeY);
                const bodyBottom = Math.max(openY, closeY);
                const bodyHeightPx = Math.max(1, bodyBottom - bodyTop);
                
                return (
                  <div key={index} className="relative flex-1 max-w-[8px] mx-[1px]" style={{ height: `${chartHeight}px` }}>
                    {/* High-Low wick */}
                    <div 
                      className="absolute left-1/2 transform -translate-x-1/2 w-[1px] bg-slate-500"
                      style={{
                        top: `${highY}px`,
                        height: `${lowY - highY}px`
                      }}
                    />
                    {/* Candle body */}
                    <div 
                      className={`absolute left-1/2 transform -translate-x-1/2 w-[6px] rounded-sm border transition-all duration-200 hover:scale-110 ${
                        isGreen 
                          ? 'bg-emerald-500 border-emerald-400 shadow-emerald-500/20' 
                          : 'bg-red-500 border-red-400 shadow-red-500/20'
                      } shadow-sm`}
                      style={{
                        top: `${bodyTop}px`,
                        height: `${bodyHeightPx}px`
                      }}
                    />
                    {/* Volume indicator */}
                    <div 
                      className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[4px] rounded-t-sm opacity-60 ${
                        isGreen ? 'bg-emerald-500/40' : 'bg-red-500/40'
                      }`}
                      style={{
                        height: `${Math.random() * 20 + 5}px`
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Price display */}
            <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700">
              <div className="text-2xl font-bold text-white">
                ${chartData.length > 0 ? chartData[chartData.length - 1].close.toFixed(2) : '0.00'}
              </div>
              <div className="text-sm text-emerald-400 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +{((totalProfit / 100) * 100).toFixed(2)}%
              </div>
            </div>

            {/* Trading indicator */}
            <div className="absolute top-4 right-20 bg-slate-900/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700">
              <div className="text-xs text-slate-400">LIVE</div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm text-white">BTC/USD</span>
              </div>
            </div>

            {/* Time labels */}
            <div className="absolute bottom-1 left-4 right-4 flex justify-between text-xs text-slate-500">
              {chartData.slice(0, 6).map((candle, i) => (
                <span key={i}>{candle.time}</span>
              ))}
            </div>
          </div>

          {/* Trading Controls */}
          <div className="mt-6 space-y-4">
            {/* Asset Selection Tabs */}
            <Tabs value={assetType} onValueChange={(v) => setAssetType(v as 'crypto' | 'forex')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="crypto" className="flex items-center gap-2">
                  <Bitcoin className="h-4 w-4" />
                  Cryptocurrencies
                </TabsTrigger>
                <TabsTrigger value="forex" className="flex items-center gap-2">
                  <Forex className="h-4 w-4" />
                  Forex
                </TabsTrigger>
              </TabsList>
              <TabsContent value="crypto" className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {cryptoAssets.map((asset) => (
                    <Button
                      key={asset.id}
                      variant={selectedAsset === asset.id ? "default" : "outline"}
                      onClick={() => setSelectedAsset(asset.id)}
                      className="h-auto py-3 flex flex-col items-start"
                    >
                      <span className="font-bold text-sm">{asset.symbol}</span>
                      <span className="text-xs text-muted-foreground">${asset.current_price.toLocaleString()}</span>
                    </Button>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="forex" className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {forexAssets.map((asset) => (
                    <Button
                      key={asset.id}
                      variant={selectedAsset === asset.id ? "default" : "outline"}
                      onClick={() => setSelectedAsset(asset.id)}
                      className="h-auto py-3 flex flex-col items-start"
                    >
                      <span className="font-bold text-sm">{asset.symbol}</span>
                      <span className="text-xs text-muted-foreground">${asset.current_price.toFixed(4)}</span>
                    </Button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-foreground">Select Signal</label>
                <Select value={selectedSignal} onValueChange={setSelectedSignal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your purchased signal" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchasedSignals.map((signal) => (
                      <SelectItem key={signal.id} value={signal.id}>
                        {signal.signal_name} (×{signal.profit_multiplier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-foreground">Trade Amount</label>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(Number(e.target.value))}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-foreground"
                    min="1"
                    max="10000"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={() => handleTrade('buy')}
                disabled={!selectedSignal || !selectedAsset}
                className="flex-1 bg-crypto-green hover:bg-crypto-green/90"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                BUY
              </Button>
              <Button
                onClick={() => handleTrade('sell')}
                disabled={!selectedSignal || !selectedAsset}
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
            <CardTitle className="text-foreground">Active Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeTrades.map((trade) => {
                const hoursElapsed = (Date.now() - new Date(trade.started_at).getTime()) / (1000 * 60 * 60);
                const currentProfit = getProfit(trade);
                
                return (
                  <div key={trade.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Badge className={trade.trade_type === 'buy' ? 'bg-crypto-green/20 text-crypto-green' : 'bg-destructive/20 text-destructive'}>
                        {trade.trade_type.toUpperCase()}
                      </Badge>
                    <div>
                      <p className="font-medium text-foreground">{trade.signal_name}</p>
                      <p className="text-sm text-foreground/70">
                        ${trade.initial_amount} • ×{trade.profit_multiplier}
                      </p>
                    </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${currentProfit >= 0 ? 'text-crypto-green' : 'text-destructive'}`}>
                        {currentProfit >= 0 ? '+' : ''}${currentProfit.toFixed(2)}
                      </p>
                      <p className="text-sm text-foreground/70">
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
            <Activity className="mx-auto h-12 w-12 text-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2 text-foreground">No Signals Purchased</h3>
            <p className="text-foreground/70 mb-4">
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