import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TwelveDataQuote {
  symbol: string;
  name: string;
  exchange: string;
  close: string;
  previous_close: string;
  change: string;
  percent_change: string;
  timestamp: number;
}

// Map our trading pair symbols to Twelve Data format
const symbolMapping: Record<string, string> = {
  // Crypto pairs
  'BTC/USDT': 'BTC/USD',
  'ETH/USDT': 'ETH/USD',
  'BNB/USDT': 'BNB/USD',
  'SOL/USDT': 'SOL/USD',
  'XRP/USDT': 'XRP/USD',
  'ADA/USDT': 'ADA/USD',
  'DOGE/USDT': 'DOGE/USD',
  'AVAX/USDT': 'AVAX/USD',
  'DOT/USDT': 'DOT/USD',
  'LINK/USDT': 'LINK/USD',
  'TRX/USDT': 'TRX/USD',
  'LTC/USDT': 'LTC/USD',
  'MATIC/USDT': 'MATIC/USD',
  'TON/USDT': 'TON/USD',
  'SHIB/USDT': 'SHIB/USD',
  // Forex pairs - already correct format
  'EUR/USD': 'EUR/USD',
  'GBP/USD': 'GBP/USD',
  'USD/JPY': 'USD/JPY',
  'AUD/USD': 'AUD/USD',
  'USD/CHF': 'USD/CHF',
  'USD/CAD': 'USD/CAD',
  'NZD/USD': 'NZD/USD',
  'EUR/GBP': 'EUR/GBP',
  'EUR/JPY': 'EUR/JPY',
  'GBP/JPY': 'GBP/JPY',
  'EUR/AUD': 'EUR/AUD',
  'GBP/AUD': 'GBP/AUD',
  'EUR/CAD': 'EUR/CAD',
  'USD/SGD': 'USD/SGD',
  'USD/ZAR': 'USD/ZAR',
};

// Timeframe mapping to Twelve Data intervals
const timeframeMapping: Record<string, string> = {
  '1': '1min',
  '5': '5min',
  '15': '15min',
  '60': '1h',
  '240': '4h',
  '1440': '1day',
};

// Rate limiting - max 8 calls per minute for free tier
const RATE_LIMIT_INTERVAL = 8000; // ~7.5 calls per minute
let lastCallTime = 0;

const waitForRateLimit = async (): Promise<void> => {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < RATE_LIMIT_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_INTERVAL - timeSinceLastCall));
  }
  lastCallTime = Date.now();
};

// Cache for price data
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export const useTwelveData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch current price
  const fetchCurrentPrice = useCallback(async (tradingPair: string): Promise<number | null> => {
    const cacheKey = tradingPair;
    const cached = priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.price;
    }

    try {
      const twelveSymbol = symbolMapping[tradingPair] || tradingPair;
      
      // Call edge function to get price (API key is stored server-side)
      const { data, error } = await supabase.functions.invoke('twelve-data-proxy', {
        body: { 
          endpoint: 'price',
          symbol: twelveSymbol 
        }
      });

      if (error) throw error;
      
      if (data?.price) {
        const price = parseFloat(data.price);
        priceCache.set(cacheKey, { price, timestamp: Date.now() });
        return price;
      }
      
      return null;
    } catch (err) {
      console.warn('Twelve Data price fetch failed:', err);
      return null;
    }
  }, []);

  // Fetch candlestick data for chart
  const fetchCandleData = useCallback(async (
    tradingPair: string,
    timeframe: string,
    marketType: 'crypto' | 'forex'
  ): Promise<CandleData[]> => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      await waitForRateLimit();
      
      const twelveSymbol = symbolMapping[tradingPair] || tradingPair;
      const interval = timeframeMapping[timeframe] || '15min';
      
      // Call edge function to get time series
      const { data, error: invokeError } = await supabase.functions.invoke('twelve-data-proxy', {
        body: {
          endpoint: 'time_series',
          symbol: twelveSymbol,
          interval,
          outputsize: 100
        }
      });

      if (invokeError) throw invokeError;

      if (data?.values && Array.isArray(data.values)) {
        const candles: CandleData[] = data.values
          .map((v: any) => ({
            time: Math.floor(new Date(v.datetime).getTime() / 1000),
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close),
          }))
          .reverse() // Twelve Data returns newest first
          .filter((c: CandleData) => !isNaN(c.open) && !isNaN(c.close));

        if (candles.length > 0) {
          // Update cache with latest price
          const latestPrice = candles[candles.length - 1].close;
          priceCache.set(tradingPair, { price: latestPrice, timestamp: Date.now() });
        }

        setLoading(false);
        return candles;
      }

      throw new Error('Invalid data format from API');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return [];
      }
      console.warn('Twelve Data candle fetch failed:', err);
      setError(err.message || 'Failed to fetch market data');
      setLoading(false);
      return [];
    }
  }, []);

  // Calculate profit based on trade direction and price movement
  const calculateProfit = useCallback((
    entryPrice: number,
    currentPrice: number,
    investedAmount: number,
    tradeDirection: 'buy' | 'sell'
  ): number => {
    // Position size = invested_amount / entry_price
    const positionSize = investedAmount / entryPrice;
    
    // Calculate P/L
    if (tradeDirection === 'buy') {
      // BUY profits when price goes UP
      return (currentPrice - entryPrice) * positionSize;
    } else {
      // SELL profits when price goes DOWN
      return (entryPrice - currentPrice) * positionSize;
    }
  }, []);

  return {
    loading,
    error,
    fetchCurrentPrice,
    fetchCandleData,
    calculateProfit,
  };
};

export default useTwelveData;
