import { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, IChartApi, CandlestickSeries, UTCTimestamp } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Activity, DollarSign, Wallet, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Trading Pairs Configuration
const CRYPTO_PAIRS = [
  { symbol: 'BTC/USDT', name: 'Bitcoin', apiId: 'bitcoin' },
  { symbol: 'ETH/USDT', name: 'Ethereum', apiId: 'ethereum' },
  { symbol: 'BNB/USDT', name: 'Binance Coin', apiId: 'binancecoin' },
  { symbol: 'SOL/USDT', name: 'Solana', apiId: 'solana' },
  { symbol: 'XRP/USDT', name: 'Ripple', apiId: 'ripple' },
  { symbol: 'ADA/USDT', name: 'Cardano', apiId: 'cardano' },
  { symbol: 'DOGE/USDT', name: 'Dogecoin', apiId: 'dogecoin' },
  { symbol: 'AVAX/USDT', name: 'Avalanche', apiId: 'avalanche-2' },
  { symbol: 'DOT/USDT', name: 'Polkadot', apiId: 'polkadot' },
  { symbol: 'LINK/USDT', name: 'Chainlink', apiId: 'chainlink' },
  { symbol: 'TRX/USDT', name: 'Tron', apiId: 'tron' },
  { symbol: 'LTC/USDT', name: 'Litecoin', apiId: 'litecoin' },
  { symbol: 'MATIC/USDT', name: 'Polygon', apiId: 'matic-network' },
  { symbol: 'TON/USDT', name: 'Toncoin', apiId: 'the-open-network' },
  { symbol: 'SHIB/USDT', name: 'Shiba Inu', apiId: 'shiba-inu' },
];

const FOREX_PAIRS = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', baseRate: 1.0850 },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', baseRate: 1.2650 },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', baseRate: 149.50 },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', baseRate: 0.6550 },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', baseRate: 0.8850 },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', baseRate: 1.3550 },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', baseRate: 0.6150 },
  { symbol: 'EUR/GBP', name: 'Euro / British Pound', baseRate: 0.8580 },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', baseRate: 162.20 },
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', baseRate: 189.10 },
  { symbol: 'EUR/AUD', name: 'Euro / Australian Dollar', baseRate: 1.6550 },
  { symbol: 'GBP/AUD', name: 'British Pound / Australian Dollar', baseRate: 1.9310 },
  { symbol: 'EUR/CAD', name: 'Euro / Canadian Dollar', baseRate: 1.4710 },
  { symbol: 'USD/SGD', name: 'US Dollar / Singapore Dollar', baseRate: 1.3450 },
  { symbol: 'USD/ZAR', name: 'US Dollar / South African Rand', baseRate: 18.50 },
];

const TIMEFRAMES = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1h' },
  { value: '240', label: '4h' },
  { value: '1440', label: '1D' },
];

interface PurchasedSignal {
  id: string;
  signal_id: string;
  signal_name: string;
  profit_multiplier: number;
}

interface ActiveTrade {
  id: string;
  trade_type: string;
  trade_direction: string;
  initial_amount: number;
  current_profit: number;
  profit_multiplier: number;
  started_at: string;
  signal_name: string;
  trading_pair?: string;
  entry_price?: number;
}

type TradingEngineType = 'rising' | 'general';

interface UserBalances {
  btc_balance: number;
  eth_balance: number;
  usdt_balance: number;
  interest_earned: number;
  commissions: number;
}

const BALANCE_OPTIONS = [
  { value: 'btc_balance', label: 'Bitcoin (BTC)', key: 'btc_balance' },
  { value: 'eth_balance', label: 'Ethereum (ETH)', key: 'eth_balance' },
  { value: 'usdt_balance', label: 'Tether (USDT)', key: 'usdt_balance' },
  { value: 'interest_earned', label: 'Interest Earned', key: 'interest_earned' },
  { value: 'commissions', label: 'Commissions', key: 'commissions' },
] as const;

const TradingChart = () => {
  const { user } = useAuth();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  
  // Market selection state
  const [marketType, setMarketType] = useState<'crypto' | 'forex'>('crypto');
  const [selectedPair, setSelectedPair] = useState<string>('BTC/USDT');
  const [timeframe, setTimeframe] = useState<string>('15');
  
  // Trading state
  const [purchasedSignals, setPurchasedSignals] = useState<PurchasedSignal[]>([]);
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<string>('');
  const [tradeAmount, setTradeAmount] = useState<number>(100);
  const [selectedBalanceSource, setSelectedBalanceSource] = useState<string>('usdt_balance');
  const [userBalances, setUserBalances] = useState<UserBalances>({
    btc_balance: 0, eth_balance: 0, usdt_balance: 0, interest_earned: 0, commissions: 0,
  });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [tradingEngine, setTradingEngine] = useState<TradingEngineType>('rising');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);

  // Get current pair data
  const getCurrentPairData = useCallback(() => {
    if (marketType === 'crypto') {
      return CRYPTO_PAIRS.find(p => p.symbol === selectedPair);
    }
    return FOREX_PAIRS.find(p => p.symbol === selectedPair);
  }, [marketType, selectedPair]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(42, 46, 57, 0.5)',
      },
      rightPriceScale: {
        borderColor: 'rgba(42, 46, 57, 0.5)',
      },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(59, 130, 246, 0.5)', width: 1, style: 2 },
        horzLine: { color: 'rgba(59, 130, 246, 0.5)', width: 1, style: 2 },
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  // Fetch chart data when pair or timeframe changes
  useEffect(() => {
    const fetchChartData = async () => {
      if (!seriesRef.current) return;
      setChartLoading(true);

      try {
        const pairData = getCurrentPairData();
        if (!pairData) return;

        if (marketType === 'crypto') {
          const cryptoPair = pairData as typeof CRYPTO_PAIRS[0];
          // Fetch from CoinGecko for crypto
          const days = timeframe === '1440' ? 30 : timeframe === '240' ? 7 : 1;
          const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${cryptoPair.apiId}/ohlc?vs_currency=usd&days=${days}`
          );
          
          if (!response.ok) throw new Error('Failed to fetch data');
          
          const data = await response.json();
          
          if (Array.isArray(data) && data.length > 0) {
            // For rising engine, modify data to always trend up
            let chartData;
            if (tradingEngine === 'rising') {
              let minClose = data[0][4];
              chartData = data.map((item: number[], idx: number) => {
                const baseClose = item[4];
                const upwardBias = (idx / data.length) * (baseClose * 0.05);
                const adjustedClose = Math.max(minClose, baseClose) + upwardBias;
                minClose = adjustedClose;
                return {
                  time: Math.floor(item[0] / 1000) as UTCTimestamp,
                  open: item[1] + upwardBias * 0.8,
                  high: Math.max(item[2], adjustedClose) + upwardBias * 0.2,
                  low: Math.max(item[3], item[1] * 0.99),
                  close: adjustedClose,
                };
              });
            } else {
              chartData = data.map((item: number[]) => ({
                time: Math.floor(item[0] / 1000) as UTCTimestamp,
                open: item[1],
                high: item[2],
                low: item[3],
                close: item[4],
              }));
            }
            
            seriesRef.current.setData(chartData);
            chartRef.current?.timeScale().fitContent();
            
            // Update current price
            const lastPrice = chartData[chartData.length - 1].close;
            const firstPrice = chartData[0].open;
            setCurrentPrice(lastPrice);
            setPriceChange(lastPrice - firstPrice);
            setPriceChangePercent(((lastPrice - firstPrice) / firstPrice) * 100);
          }
        } else {
          // Generate simulated forex data
          const forexPair = pairData as typeof FOREX_PAIRS[0];
          const baseRate = forexPair.baseRate;
          const numCandles = 100;
          const now = Math.floor(Date.now() / 1000);
          const interval = parseInt(timeframe) * 60;
          
          let lastClose = baseRate;
          const chartData = [];
          
          for (let i = numCandles; i >= 0; i--) {
            const time = (now - i * interval) as UTCTimestamp;
            const volatility = baseRate * 0.0015;
            
            let change;
            if (tradingEngine === 'rising') {
              // Rising engine: always trend up
              change = (Math.random() * volatility * 0.8);
            } else {
              // General engine: realistic fluctuations
              change = (Math.random() - 0.5) * volatility * 2;
            }
            
            const open = lastClose;
            const close = open + change;
            const high = Math.max(open, close) + Math.random() * volatility * 0.5;
            const low = Math.min(open, close) - Math.random() * volatility * 0.5;
            
            chartData.push({ time, open, high, low, close });
            lastClose = close;
          }
          
          seriesRef.current.setData(chartData);
          chartRef.current?.timeScale().fitContent();
          
          const lastPrice = chartData[chartData.length - 1].close;
          const firstPrice = chartData[0].open;
          setCurrentPrice(lastPrice);
          setPriceChange(lastPrice - firstPrice);
          setPriceChangePercent(((lastPrice - firstPrice) / firstPrice) * 100);
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setChartLoading(false);
      }
    };

    fetchChartData();
    const interval = setInterval(fetchChartData, 30000);
    return () => clearInterval(interval);
  }, [selectedPair, timeframe, marketType, tradingEngine, getCurrentPairData]);

  // Fetch trading engine setting
  useEffect(() => {
    const fetchTradingEngine = async () => {
      if (!user) return;
      try {
        const { data: userEngine } = await supabase
          .from('user_trading_engines')
          .select('engine_type')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: globalSetting } = await supabase
          .from('admin_settings')
          .select('value')
          .eq('key', 'global_trading_engine')
          .maybeSingle();

        const globalEngine = (globalSetting?.value as TradingEngineType) || 'rising';
        
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
    const channel = supabase
      .channel('trading-engine-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_settings' }, fetchTradingEngine)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_trading_engines' }, fetchTradingEngine)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Fetch user balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('btc_balance, eth_balance, usdt_balance, interest_earned, commissions')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setUserBalances({
          btc_balance: Number(data?.btc_balance || 0),
          eth_balance: Number(data?.eth_balance || 0),
          usdt_balance: Number(data?.usdt_balance || 0),
          interest_earned: Number(data?.interest_earned || 0),
          commissions: Number(data?.commissions || 0),
        });
      } catch (error) {
        console.error('Error fetching balances:', error);
      }
    };

    fetchBalances();
    const channel = supabase
      .channel(`user-balances-${user?.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user?.id}`
      }, (payload) => {
        const newData = payload.new as any;
        setUserBalances({
          btc_balance: Number(newData?.btc_balance || 0),
          eth_balance: Number(newData?.eth_balance || 0),
          usdt_balance: Number(newData?.usdt_balance || 0),
          interest_earned: Number(newData?.interest_earned || 0),
          commissions: Number(newData?.commissions || 0),
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Fetch purchased signals and active trades
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // Sync trading profits
        await supabase.rpc('sync_trading_profits');

        // Fetch purchased signals (only for rising engine)
        if (tradingEngine === 'rising') {
          const { data: purchasedData } = await supabase
            .from('purchased_signals')
            .select('id, signal_id')
            .eq('user_id', user.id)
            .eq('status', 'active');

          const signalIds = purchasedData?.map(p => p.signal_id) || [];
          const { data: signalsData } = await supabase
            .from('signals')
            .select('id, name, profit_multiplier')
            .in('id', signalIds.length > 0 ? signalIds : ['']);

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
        }

        // Fetch active trades
        const { data: tradesData } = await supabase
          .from('trades')
          .select('id, trade_type, initial_amount, current_profit, profit_multiplier, started_at, signal_id, trading_pair, entry_price')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (tradesData) {
          const signalIds = tradesData.map(t => t.signal_id).filter(Boolean);
          const { data: signalsData } = signalIds.length > 0 
            ? await supabase.from('signals').select('id, name').in('id', signalIds)
            : { data: [] };

          const mergedTrades = tradesData.map(trade => ({
            ...trade,
            trade_direction: trade.trade_type,
            signal_name: signalsData?.find(s => s.id === trade.signal_id)?.name || (tradingEngine === 'general' ? 'Market Trade' : 'Unknown Signal'),
          }));

          setActiveTrades(mergedTrades);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [user, tradingEngine]);

  // Handle market type change
  const handleMarketTypeChange = (value: 'crypto' | 'forex') => {
    setMarketType(value);
    setSelectedPair(value === 'crypto' ? 'BTC/USDT' : 'EUR/USD');
  };

  // Handle trade
  const handleTrade = async (type: 'buy' | 'sell') => {
    if (!user) {
      toast({ title: "Error", description: "Please log in to trade", variant: "destructive" });
      return;
    }

    if (tradingEngine === 'rising' && !selectedSignal) {
      toast({ title: "Error", description: "Please select a signal first", variant: "destructive" });
      return;
    }

    if (!selectedBalanceSource) {
      toast({ title: "Error", description: "Please select a balance source", variant: "destructive" });
      return;
    }

    const selectedSignalData = tradingEngine === 'rising' ? purchasedSignals.find(s => s.id === selectedSignal) : null;
    const profitMultiplier = selectedSignalData?.profit_multiplier || 1.0;
    const selectedBalanceAmount = userBalances[selectedBalanceSource as keyof UserBalances] || 0;

    if (selectedBalanceAmount < tradeAmount) {
      const balanceLabel = BALANCE_OPTIONS.find(b => b.value === selectedBalanceSource)?.label || selectedBalanceSource;
      toast({
        title: "Insufficient Balance",
        description: `You need $${tradeAmount.toLocaleString()} to place this trade. ${balanceLabel} balance: $${selectedBalanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const entryPrice = currentPrice;

      const { data: tradeResult, error: tradeError } = await supabase
        .rpc('start_trade_validated', {
          p_user_id: user.id,
          p_signal_id: tradingEngine === 'rising' ? selectedSignalData?.signal_id : null,
          p_purchased_signal_id: tradingEngine === 'rising' ? selectedSignal : null,
          p_trade_type: type,
          p_initial_amount: tradeAmount,
          p_profit_multiplier: profitMultiplier,
          p_asset_id: null,
          p_entry_price: entryPrice,
          p_balance_source: selectedBalanceSource,
          p_trading_pair: selectedPair,
          p_market_type: marketType,
        });

      if (tradeError) {
        console.error('Error starting trade:', tradeError);
        toast({ title: "Error", description: "Failed to start trade", variant: "destructive" });
        return;
      }

      const result = tradeResult as { success?: boolean; error?: string; trade_id?: string };
      if (!result?.success) {
        toast({ title: "Trade Rejected", description: result?.error || "Unable to process trade", variant: "destructive" });
        return;
      }

      const balanceLabel = BALANCE_OPTIONS.find(b => b.value === selectedBalanceSource)?.label || selectedBalanceSource;
      toast({
        title: "Trade Started",
        description: `${type.toUpperCase()} ${selectedPair} @ $${entryPrice.toFixed(marketType === 'forex' ? 4 : 2)} using ${balanceLabel}`,
      });

      // Refresh trades
      const { data: tradesData } = await supabase
        .from('trades')
        .select('id, trade_type, initial_amount, current_profit, profit_multiplier, started_at, signal_id, trading_pair, entry_price')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (tradesData) {
        const signalIds = tradesData.map(t => t.signal_id).filter(Boolean);
        const { data: signalsData } = signalIds.length > 0 
          ? await supabase.from('signals').select('id, name').in('id', signalIds)
          : { data: [] };

        const mergedTrades = tradesData.map(trade => ({
          ...trade,
          trade_direction: trade.trade_type,
          signal_name: signalsData?.find(s => s.id === trade.signal_id)?.name || (tradingEngine === 'general' ? 'Market Trade' : 'Unknown Signal'),
        }));

        setActiveTrades(mergedTrades);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getSelectedBalanceAmount = () => userBalances[selectedBalanceSource as keyof UserBalances] || 0;
  const isTradeAmountValid = tradeAmount > 0 && tradeAmount <= getSelectedBalanceAmount();
  const totalProfit = activeTrades.reduce((sum, trade) => sum + (trade.current_profit || 0), 0);

  if (loading) {
    return (
      <Card className="bg-muted/50 border-border">
        <CardContent className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trading Chart Card */}
      <Card className="bg-muted/50 border-border">
        <CardHeader className="pb-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5 text-primary" />
                {selectedPair}
              </CardTitle>
              <Badge 
                variant="outline" 
                className={tradingEngine === 'rising' ? 'border-emerald-500 text-emerald-500' : 'border-amber-500 text-amber-500'}
              >
                {tradingEngine === 'rising' ? <><TrendingUp className="h-3 w-3 mr-1" /> Rising</> : <><TrendingDown className="h-3 w-3 mr-1" /> General</>}
              </Badge>
            </div>
            
            {/* Price Display */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold">${currentPrice.toFixed(marketType === 'forex' ? 4 : 2)}</p>
                <p className={`text-sm ${priceChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(marketType === 'forex' ? 4 : 2)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                </p>
              </div>
            </div>
          </div>
          
          {/* Market Selection Controls */}
          <div className="flex flex-wrap gap-3 mt-4">
            <Select value={marketType} onValueChange={handleMarketTypeChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Market" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="forex">Forex</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select pair" />
              </SelectTrigger>
              <SelectContent>
                {(marketType === 'crypto' ? CRYPTO_PAIRS : FOREX_PAIRS).map((pair) => (
                  <SelectItem key={pair.symbol} value={pair.symbol}>
                    <span className="font-medium">{pair.symbol}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{pair.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Chart Container */}
          <div className="relative rounded-lg overflow-hidden border border-border bg-slate-950">
            {chartLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            <div ref={chartContainerRef} className="w-full h-[400px]" />
          </div>

          {/* Trading Controls */}
          <div className="mt-6 space-y-4">
            <div className={`grid gap-4 ${tradingEngine === 'rising' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
              {/* Signal selector - ONLY for Rising engine */}
              {tradingEngine === 'rising' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Signal</label>
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
              )}
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  <Wallet className="inline h-4 w-4 mr-1" />
                  Deduct From
                </label>
                <Select value={selectedBalanceSource} onValueChange={setSelectedBalanceSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select balance source" />
                  </SelectTrigger>
                  <SelectContent>
                    {BALANCE_OPTIONS.map((option) => {
                      const balance = userBalances[option.key as keyof UserBalances] || 0;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex justify-between items-center w-full gap-4">
                            <span>{option.label}</span>
                            <span className={`text-xs ${balance > 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                              ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className={`text-xs mt-1 ${isTradeAmountValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                  Available: ${getSelectedBalanceAmount().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  {!isTradeAmountValid && tradeAmount > 0 && ' (Insufficient)'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Trade Amount</label>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(Number(e.target.value))}
                    className={`flex-1 px-3 py-2 bg-background border rounded-md ${
                      !isTradeAmountValid && tradeAmount > 0 ? 'border-destructive' : 'border-border'
                    }`}
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* General engine info banner */}
            {tradingEngine === 'general' && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-200">
                <strong>Market Mode:</strong> Trades follow real market conditions. Profits and losses are calculated based on actual price movements.
                {purchasedSignals.length > 0 && (
                  <span className="block mt-1 text-xs opacity-80">
                    💡 You have purchased signals, but they can only be used in Rising mode.
                  </span>
                )}
              </div>
            )}

            {/* Trade Buttons */}
            <div className="flex space-x-4">
              <Button
                onClick={() => handleTrade('buy')}
                disabled={(tradingEngine === 'rising' && !selectedSignal) || !isTradeAmountValid}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                BUY {selectedPair}
              </Button>
              <Button
                onClick={() => handleTrade('sell')}
                disabled={(tradingEngine === 'rising' && !selectedSignal) || !isTradeAmountValid}
                variant="outline"
                className="flex-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              >
                <TrendingDown className="mr-2 h-4 w-4" />
                SELL {selectedPair}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Trades */}
      {activeTrades.length > 0 && (
        <Card className="bg-muted/50 border-border">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Active Trades</CardTitle>
              <div className={`text-lg font-bold ${totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                Total P/L: {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeTrades.map((trade) => {
                const equity = trade.initial_amount + (trade.current_profit || 0);
                const profitPercent = ((trade.current_profit || 0) / trade.initial_amount) * 100;
                const hoursElapsed = (Date.now() - new Date(trade.started_at).getTime()) / (1000 * 60 * 60);
                
                return (
                  <div key={trade.id} className="flex items-center justify-between p-4 bg-background rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Badge className={trade.trade_type === 'buy' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}>
                        {trade.trade_type.toUpperCase()}
                      </Badge>
                      <div>
                        <p className="font-medium">{trade.trading_pair || trade.signal_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Entry: ${trade.entry_price?.toFixed(2) || 'N/A'} • Invested: ${trade.initial_amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${equity.toFixed(2)}</p>
                      <p className={`text-sm ${(trade.current_profit || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {(trade.current_profit || 0) >= 0 ? '+' : ''}${(trade.current_profit || 0).toFixed(2)} ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)
                      </p>
                      <p className="text-xs text-muted-foreground">{hoursElapsed.toFixed(1)}h ago</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Signals Message - Only for Rising engine */}
      {tradingEngine === 'rising' && purchasedSignals.length === 0 && (
        <Card className="bg-muted/50 border-border">
          <CardContent className="text-center py-8">
            <Activity className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Signals Purchased</h3>
            <p className="text-muted-foreground mb-4">
              Purchase trading signals to start trading and earning profits
            </p>
            <Button className="bg-primary hover:bg-primary/90">
              Browse Signals
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TradingChart;
