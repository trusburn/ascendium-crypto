import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Activity, DollarSign, Bitcoin, DollarSign as Forex, Wallet, Square, Clock, Target, ShieldAlert, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useRealMarketPrices, CRYPTO_ID_MAP, FOREX_BASE_PRICES } from '@/hooks/useRealMarketPrices';
import { useRealOHLCData } from '@/hooks/useRealOHLCData';

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
  entry_price?: number;
  current_price?: number;
  trading_pair?: string;
  stop_loss?: number;
  take_profit?: number;
  duration_type?: string;
  expires_at?: string;
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
type DurationType = '1h' | '6h' | '24h' | '7d' | 'unlimited';

// NOTE: Profit calculation is now done entirely in the DATABASE via PostgreSQL functions
// Frontend only reads current_profit from the trades table - NO client-side calculations
// GENERAL engine uses REAL market prices from CoinGecko (crypto) and Exchange Rate API (forex)

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

const DURATION_OPTIONS: { value: DurationType; label: string }[] = [
  { value: 'unlimited', label: 'No Limit' },
  { value: '1h', label: '1 Hour' },
  { value: '6h', label: '6 Hours' },
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
];

const TradingChart = () => {
  const { user } = useAuth();
  const { cryptoPrices, forexRates, getPrice, lastUpdate, syncStatus, refetch: refetchPrices, syncPrices } = useRealMarketPrices();
  const [purchasedSignals, setPurchasedSignals] = useState<PurchasedSignal[]>([]);
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [tradeAmount, setTradeAmount] = useState<number>(100);
  const [selectedBalanceSource, setSelectedBalanceSource] = useState<string>('usdt_balance');
  const [userBalances, setUserBalances] = useState<UserBalances>({
    btc_balance: 0,
    eth_balance: 0,
    usdt_balance: 0,
    interest_earned: 0,
    commissions: 0,
  });
  const [chartData, setChartData] = useState<CandlestickData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cryptoAssets, setCryptoAssets] = useState<TradeableAsset[]>([]);
  const [forexAssets, setForexAssets] = useState<TradeableAsset[]>([]);
  const [assetType, setAssetType] = useState<'crypto' | 'forex'>('crypto');
  const [tradingEngine, setTradingEngine] = useState<TradingEngineType>('rising');
  const priceHistoryRef = useRef<{ [symbol: string]: number[] }>({});
  
  // New trade options
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [duration, setDuration] = useState<DurationType>('unlimited');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Get selected asset data for OHLC hook
  const allAssets = [...cryptoAssets, ...forexAssets];
  const selectedAssetData = allAssets.find(a => a.id === selectedAsset);
  const selectedSymbol = selectedAssetData?.symbol || 'BTC';
  const selectedAssetType = (selectedAssetData?.asset_type as 'crypto' | 'forex') || 'crypto';
  const currentAssetPrice = selectedAssetData ? getPrice(selectedAssetData.symbol, selectedAssetType) : 0;

  // Use REAL OHLC data hook for General engine
  const { ohlcData: realOHLCData, isLoading: ohlcLoading, refetch: refetchOHLC } = useRealOHLCData(
    selectedSymbol,
    selectedAssetType,
    currentAssetPrice
  );

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

    // Subscribe to profile changes
    const channel = supabase
      .channel(`user-balances-${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user?.id}`
        },
        (payload) => {
          const newData = payload.new as any;
          setUserBalances({
            btc_balance: Number(newData?.btc_balance || 0),
            eth_balance: Number(newData?.eth_balance || 0),
            usdt_balance: Number(newData?.usdt_balance || 0),
            interest_earned: Number(newData?.interest_earned || 0),
            commissions: Number(newData?.commissions || 0),
          });
        }
      )
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

  // Update asset prices from real market data (using useRealMarketPrices hook)
  // This replaces the old simulated price logic
  useEffect(() => {
    const updateAssetPrices = async () => {
      const allAssets = [...cryptoAssets, ...forexAssets];
      
      for (const asset of allAssets) {
        const realPrice = getPrice(asset.symbol, asset.asset_type as 'crypto' | 'forex');
        
        if (realPrice > 0 && realPrice !== asset.current_price) {
          // Track price history for chart generation
          const symbol = asset.symbol;
          if (!priceHistoryRef.current[symbol]) {
            priceHistoryRef.current[symbol] = [];
          }
          priceHistoryRef.current[symbol].push(realPrice);
          
          // Keep only last 60 prices (for chart)
          if (priceHistoryRef.current[symbol].length > 60) {
            priceHistoryRef.current[symbol] = priceHistoryRef.current[symbol].slice(-60);
          }
        }
      }
    };

    if (cryptoAssets.length > 0 || forexAssets.length > 0) {
      updateAssetPrices();
    }
  }, [cryptoPrices, forexRates, cryptoAssets, forexAssets, getPrice]);

  // Generate real market candlestick data based on actual price history
  const generateRealCandlestickData = useCallback((symbol: string, assetTypeParam: 'crypto' | 'forex', currentPrice: number): CandlestickData[] => {
    const history = priceHistoryRef.current[symbol] || [];
    
    // If we have price history, use it
    if (history.length >= 5) {
      return history.slice(-30).map((price, i) => {
        const volatility = assetTypeParam === 'crypto' ? price * 0.002 : price * 0.0005;
        const open = i > 0 ? history[Math.max(0, history.length - 30 + i - 1)] : price * 0.999;
        const close = price;
        const high = Math.max(open, close) + Math.random() * volatility;
        const low = Math.min(open, close) - Math.random() * volatility;
        
        return {
          time: new Date(Date.now() - (history.length - i - 1) * 30000).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          open: Number(open.toFixed(assetTypeParam === 'crypto' ? 2 : 5)),
          high: Number(high.toFixed(assetTypeParam === 'crypto' ? 2 : 5)),
          low: Number(low.toFixed(assetTypeParam === 'crypto' ? 2 : 5)),
          close: Number(close.toFixed(assetTypeParam === 'crypto' ? 2 : 5)),
        };
      });
    }
    
    // Generate initial data based on current price with realistic volatility
    if (currentPrice > 0) {
      const volatility = assetTypeParam === 'crypto' ? currentPrice * 0.003 : currentPrice * 0.001;
      
      return Array.from({ length: 30 }, (_, i) => {
        // Create realistic price movement around current price
        const timeOffset = (29 - i) / 30;
        const trendFactor = Math.sin(i * 0.3) * 0.5;
        const randomFactor = (Math.random() - 0.5) * 2;
        
        const priceVariation = currentPrice * (1 + (trendFactor + randomFactor * 0.5) * 0.01 * timeOffset);
        const open = priceVariation + (Math.random() - 0.5) * volatility;
        const close = priceVariation + (Math.random() - 0.5) * volatility;
        const high = Math.max(open, close) + Math.random() * volatility * 0.5;
        const low = Math.min(open, close) - Math.random() * volatility * 0.5;
        
        return {
          time: new Date(Date.now() - (29 - i) * 60000).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          open: Number(open.toFixed(assetTypeParam === 'crypto' ? 2 : 5)),
          high: Number(high.toFixed(assetTypeParam === 'crypto' ? 2 : 5)),
          low: Number(low.toFixed(assetTypeParam === 'crypto' ? 2 : 5)),
          close: Number(close.toFixed(assetTypeParam === 'crypto' ? 2 : 5)),
        };
      });
    }
    
    // Fallback for when no price is available
    return Array.from({ length: 30 }, (_, i) => ({
      time: new Date(Date.now() - (29 - i) * 60000).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      open: 100,
      high: 100.5,
      low: 99.5,
      close: 100,
    }));
  }, []);

  // Effect to update chart data based on trading engine and real OHLC data
  useEffect(() => {
    if (!selectedAssetData) return;
    
    const realPrice = getPrice(selectedAssetData.symbol, selectedAssetData.asset_type as 'crypto' | 'forex');
    const currentPrice = realPrice > 0 ? realPrice : selectedAssetData.current_price || 100;
    
    if (tradingEngine === 'rising') {
      // Rising engine: Generate upward-trending chart (simulated growth)
      const baseValue = currentPrice;
      const data = Array.from({ length: 30 }, (_, i) => {
        const volatility = baseValue * 0.005;
        const upwardBias = (i / 30) * baseValue * 0.02; // 2% upward trend
        const open = baseValue + upwardBias + Math.sin(i * 0.3) * volatility;
        const close = baseValue + upwardBias + Math.sin((i + 1) * 0.3) * volatility + Math.random() * volatility * 0.5;
        const high = Math.max(open, close) + Math.random() * volatility;
        const low = Math.min(open, close) - Math.random() * volatility * 0.3;
        
        return {
          time: new Date(Date.now() - (29 - i) * 60000).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(Math.max(low, baseValue * 0.98).toFixed(2)),
          close: Number(Math.max(close, open).toFixed(2)),
        };
      });
      setChartData(data);
    } else {
      // GENERAL engine: Use REAL OHLC data from CoinGecko API
      if (realOHLCData && realOHLCData.length > 0) {
        // Use real OHLC data from the hook
        console.log('📊 Using REAL OHLC data:', realOHLCData.length, 'candles for', selectedSymbol);
        setChartData(realOHLCData);
      } else if (!ohlcLoading) {
        // Fallback to generated data if OHLC fetch failed
        const fallbackData = generateRealCandlestickData(
          selectedAssetData.symbol,
          selectedAssetData.asset_type as 'crypto' | 'forex',
          currentPrice
        );
        setChartData(fallbackData);
      }
    }
  }, [tradingEngine, selectedAssetData, realOHLCData, ohlcLoading, selectedSymbol, getPrice, generateRealCandlestickData]);

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
          .select('id, trade_type, initial_amount, current_profit, profit_multiplier, started_at, signal_id, entry_price, current_price, trading_pair, stop_loss, take_profit, duration_type, expires_at')
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

        // Chart data is now handled by the useEffect below that uses realOHLCData
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Update profits via DATABASE function every 5 seconds
    // Edge function syncs prices to DB, then RPC recalculates profits
    const interval = setInterval(async () => {
      if (activeTrades.length === 0) return;
      
      console.log('🔄 Syncing prices and profits...');
      try {
        // First sync prices to database via edge function (bypasses RLS)
        await syncPrices();
        
        // Then call database function to recalculate all profits
        const { error: syncError } = await supabase.rpc('update_live_interest_earned');
        if (syncError) {
          console.error('❌ Profit sync error:', syncError);
        } else {
          console.log('✅ Profits synced');
        }
        
        // Refresh trades data to get updated current_profit values from DB
        const { data: tradesData } = await supabase
          .from('trades')
          .select('id, trade_type, initial_amount, current_profit, profit_multiplier, started_at, signal_id, entry_price, current_price, trading_pair, stop_loss, take_profit, duration_type, expires_at')
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
    }, 5000);
    return () => clearInterval(interval);
  }, [user, tradingEngine, activeTrades.length, syncPrices]);

  const handleTrade = async (type: 'buy' | 'sell') => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to trade",
        variant: "destructive",
      });
      return;
    }

    // For Rising engine, signal is required
    if (tradingEngine === 'rising' && !selectedSignal) {
      toast({
        title: "Error",
        description: "Please select a signal first",
        variant: "destructive",
      });
      return;
    }

    if (!selectedBalanceSource) {
      toast({
        title: "Error",
        description: "Please select a balance source",
        variant: "destructive",
      });
      return;
    }

    if (!selectedAsset) {
      toast({
        title: "Error",
        description: "Please select a trading asset",
        variant: "destructive",
      });
      return;
    }

    // Get signal data (only for Rising engine)
    const selectedSignalData = tradingEngine === 'rising' 
      ? purchasedSignals.find(s => s.id === selectedSignal)
      : null;

    // For rising engine, require signal
    if (tradingEngine === 'rising' && !selectedSignalData) {
      toast({
        title: "Error",
        description: "Please select a valid signal",
        variant: "destructive",
      });
      return;
    }

    // Get the selected balance amount
    const selectedBalanceAmount = userBalances[selectedBalanceSource as keyof UserBalances] || 0;

    // Check if user has enough balance in selected source
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
      // CRITICAL: Sync prices to database BEFORE starting trade
      // This ensures entry_price is accurate and up-to-date
      console.log('🔄 Syncing market prices before trade...');
      await syncPrices();
      
      // Get current asset price (now freshly synced)
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
      
      if (!entryPrice || entryPrice <= 0) {
        toast({
          title: "Error",
          description: "Market price not available. Please try again in a moment.",
          variant: "destructive",
        });
        return;
      }

      // Use the atomic start_trade_validated RPC function
      // This handles balance deduction + trade creation atomically
      const { data: tradeResult, error: tradeError } = await supabase.rpc('start_trade_validated', {
        p_user_id: user.id,
        p_signal_id: selectedSignalData?.signal_id || '00000000-0000-0000-0000-000000000000',
        p_purchased_signal_id: selectedSignalData?.id || '00000000-0000-0000-0000-000000000000',
        p_trade_type: type,
        p_initial_amount: tradeAmount,
        p_profit_multiplier: selectedSignalData?.profit_multiplier || 1.0,
        p_asset_id: selectedAsset,
        p_entry_price: entryPrice,
        p_balance_source: selectedBalanceSource,
        p_trading_pair: assetData.symbol,
        p_market_type: assetType,
        p_stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        p_take_profit: takeProfit ? parseFloat(takeProfit) : null,
        p_duration_type: duration,
      });

      if (tradeError) {
        console.error('Trade RPC error:', tradeError);
        toast({
          title: "Trade Failed",
          description: tradeError.message || "Failed to start trade",
          variant: "destructive",
        });
        return;
      }

      const result = tradeResult as { success: boolean; error?: string; trade_id?: string; engine?: string };

      if (!result.success) {
        toast({
          title: "Trade Failed",
          description: result.error || "Failed to start trade",
          variant: "destructive",
        });
        return;
      }

      const balanceLabel = BALANCE_OPTIONS.find(b => b.value === selectedBalanceSource)?.label || selectedBalanceSource;
      toast({
        title: "Trade Started",
        description: `${type.toUpperCase()} order placed for ${assetData.symbol} using ${balanceLabel} (${result.engine} engine)`,
      });

      // Refresh trades data
      const { data: tradesData } = await supabase
        .from('trades')
        .select('id, trade_type, initial_amount, current_profit, profit_multiplier, started_at, signal_id, trading_pair, trade_direction, entry_price, current_price, stop_loss, take_profit, duration_type, expires_at')
        .eq('user_id', user.id)
        .eq('status', 'active');

      // Get signal names for trades
      if (tradesData) {
        const signalIds = tradesData.map(t => t.signal_id).filter(Boolean);
        const { data: signalsData } = signalIds.length > 0 
          ? await supabase.from('signals').select('id, name').in('id', signalIds)
          : { data: [] };

        const mergedTrades = tradesData.map(trade => {
          const signal = signalsData?.find(s => s.id === trade.signal_id);
          return {
            ...trade,
            signal_name: signal?.name || (tradingEngine === 'general' ? trade.trading_pair || 'Market Trade' : 'Unknown Signal'),
          };
        });

        setActiveTrades(mergedTrades);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Get selected balance amount for display
  const getSelectedBalanceAmount = () => {
    return userBalances[selectedBalanceSource as keyof UserBalances] || 0;
  };

  // Check if trade amount is valid
  const isTradeAmountValid = tradeAmount > 0 && tradeAmount <= getSelectedBalanceAmount();

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

            <div className={`grid grid-cols-1 ${tradingEngine === 'rising' ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
              {/* Signal selector - ONLY for Rising engine */}
              {tradingEngine === 'rising' && (
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
              )}
              <div>
                <label className="text-sm font-medium mb-2 block text-foreground">
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
                            <span className={`text-xs ${balance > 0 ? 'text-crypto-green' : 'text-muted-foreground'}`}>
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
                <label className="text-sm font-medium mb-2 block text-foreground">Trade Amount</label>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(Number(e.target.value))}
                    className={`flex-1 px-3 py-2 bg-background border rounded-md text-foreground ${
                      !isTradeAmountValid && tradeAmount > 0 ? 'border-destructive' : 'border-border'
                    }`}
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Trading Options */}
            <Collapsible open={showAdvancedOptions} onOpenChange={setShowAdvancedOptions}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Advanced Options (SL/TP, Duration)
                  </span>
                  <span className="text-xs">{showAdvancedOptions ? '▲' : '▼'}</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Stop Loss */}
                  <div>
                    <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                      <ShieldAlert className="h-4 w-4 text-destructive" />
                      Stop Loss
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Auto-close at loss"
                        value={stopLoss}
                        onChange={(e) => setStopLoss(e.target.value)}
                        className="pl-9"
                        step="0.01"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Close if price hits this level</p>
                  </div>
                  
                  {/* Take Profit */}
                  <div>
                    <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Target className="h-4 w-4 text-crypto-green" />
                      Take Profit
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Auto-close at profit"
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(e.target.value)}
                        className="pl-9"
                        step="0.01"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Lock in profit at this level</p>
                  </div>
                  
                  {/* Duration */}
                  <div>
                    <Label className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Trade Duration
                    </Label>
                    <Select value={duration} onValueChange={(v) => setDuration(v as DurationType)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Auto-close after this time</p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="flex space-x-4">
              <Button
                onClick={() => handleTrade('buy')}
                disabled={(tradingEngine === 'rising' && !selectedSignal) || !selectedAsset || !isTradeAmountValid}
                className="flex-1 bg-crypto-green hover:bg-crypto-green/90"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                BUY
              </Button>
              <Button
                onClick={() => handleTrade('sell')}
                disabled={(tradingEngine === 'rising' && !selectedSignal) || !selectedAsset || !isTradeAmountValid}
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
            <CardTitle className="text-foreground">Active Trades ({activeTrades.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTrades.map((trade) => {
                const hoursElapsed = (Date.now() - new Date(trade.started_at).getTime()) / (1000 * 60 * 60);
                const currentProfit = getProfit(trade);
                const pnlPercent = trade.initial_amount > 0 ? (currentProfit / trade.initial_amount) * 100 : 0;
                const equity = trade.initial_amount + currentProfit;
                
                // Calculate time remaining for duration trades
                let timeRemaining = '';
                if (trade.expires_at) {
                  const expiresAt = new Date(trade.expires_at);
                  const now = new Date();
                  const diff = expiresAt.getTime() - now.getTime();
                  if (diff > 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    timeRemaining = hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
                  } else {
                    timeRemaining = 'Expiring...';
                  }
                }
                
                return (
                  <div key={trade.id} className="p-4 bg-background rounded-lg border space-y-3">
                    {/* Trade Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge className={trade.trade_type === 'buy' ? 'bg-crypto-green/20 text-crypto-green' : 'bg-destructive/20 text-destructive'}>
                          {trade.trade_type.toUpperCase()}
                        </Badge>
                        <div>
                          <p className="font-medium text-foreground">{trade.trading_pair || trade.signal_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Entry: ${trade.entry_price?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || 'N/A'}
                            {trade.current_price && ` → $${trade.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) return;
                          
                          const { error } = await supabase.rpc('stop_single_trade', {
                            p_trade_id: trade.id,
                            p_user_id: user.id
                          });
                          
                          if (error) {
                            console.error('stop_single_trade error:', error);
                            toast({
                              title: "Error",
                              description: error.message || "Failed to stop trade",
                              variant: "destructive"
                            });
                          } else {
                            toast({
                              title: "Trade Closed",
                              description: `Closed with ${currentProfit >= 0 ? 'profit' : 'loss'} of $${Math.abs(currentProfit).toFixed(2)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`
                            });
                            setActiveTrades(prev => prev.filter(t => t.id !== trade.id));
                          }
                        }}
                      >
                        <Square className="h-3 w-3 mr-1" />
                        Close Trade
                      </Button>
                    </div>
                    
                    {/* Trade Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-muted/50 rounded-md p-2">
                        <p className="text-xs text-muted-foreground">Invested</p>
                        <p className="font-medium">${trade.initial_amount.toLocaleString()}</p>
                      </div>
                      <div className="bg-muted/50 rounded-md p-2">
                        <p className="text-xs text-muted-foreground">Equity</p>
                        <p className={`font-medium ${equity >= trade.initial_amount ? 'text-crypto-green' : 'text-destructive'}`}>
                          ${equity.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-md p-2">
                        <p className="text-xs text-muted-foreground">P/L ($)</p>
                        <p className={`font-bold ${currentProfit >= 0 ? 'text-crypto-green' : 'text-destructive'}`}>
                          {currentProfit >= 0 ? '+' : ''}${currentProfit.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-md p-2">
                        <p className="text-xs text-muted-foreground">P/L (%)</p>
                        <p className={`font-bold ${pnlPercent >= 0 ? 'text-crypto-green' : 'text-destructive'}`}>
                          {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    
                    {/* Trade Info Footer */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {hoursElapsed.toFixed(1)}h ago
                      </span>
                      {trade.duration_type && trade.duration_type !== 'unlimited' && (
                        <Badge variant="outline" className="text-xs">
                          {timeRemaining || trade.duration_type}
                        </Badge>
                      )}
                      {trade.stop_loss && (
                        <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
                          SL: ${trade.stop_loss}
                        </Badge>
                      )}
                      {trade.take_profit && (
                        <Badge variant="outline" className="text-xs border-crypto-green/50 text-crypto-green">
                          TP: ${trade.take_profit}
                        </Badge>
                      )}
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