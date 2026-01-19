import { useState, useEffect, useCallback, useRef } from 'react';

export interface OHLCCandle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// CoinGecko ID mapping for crypto symbols
const COINGECKO_ID_MAP: { [key: string]: string } = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'SOL': 'solana',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'LTC': 'litecoin',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
};

interface UseRealOHLCDataResult {
  ohlcData: OHLCCandle[];
  isLoading: boolean;
  error: string | null;
  lastFetch: Date | null;
  refetch: () => Promise<void>;
}

export const useRealOHLCData = (
  symbol: string,
  assetType: 'crypto' | 'forex',
  currentPrice?: number
): UseRealOHLCDataResult => {
  const [ohlcData, setOhlcData] = useState<OHLCCandle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const fetchingRef = useRef(false);
  const cacheRef = useRef<{ [key: string]: { data: OHLCCandle[]; timestamp: number } }>({});

  // Fetch real OHLC data from CoinGecko (for crypto)
  const fetchCryptoOHLC = useCallback(async (sym: string): Promise<OHLCCandle[]> => {
    const coingeckoId = COINGECKO_ID_MAP[sym];
    if (!coingeckoId) {
      console.warn(`No CoinGecko ID for symbol: ${sym}`);
      return [];
    }

    // Check cache (valid for 60 seconds)
    const cacheKey = `crypto_${coingeckoId}`;
    const cached = cacheRef.current[cacheKey];
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }

    try {
      // CoinGecko OHLC endpoint - free tier allows this
      // days=1 gives us hourly candles, days=7 gives us 4-hour candles
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coingeckoId}/ohlc?vs_currency=usd&days=1`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No OHLC data returned');
      }

      // CoinGecko returns [timestamp, open, high, low, close]
      const candles: OHLCCandle[] = data.slice(-30).map((item: number[]) => ({
        timestamp: item[0],
        time: new Date(item[0]).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        open: item[1],
        high: item[2],
        low: item[3],
        close: item[4],
      }));

      // Cache the result
      cacheRef.current[cacheKey] = { data: candles, timestamp: Date.now() };

      return candles;
    } catch (err) {
      console.error('Error fetching crypto OHLC:', err);
      throw err;
    }
  }, []);

  // Generate realistic forex OHLC based on current price
  // Forex APIs with free OHLC are limited, so we simulate realistic movement
  const generateForexOHLC = useCallback((sym: string, price: number): OHLCCandle[] => {
    const volatility = price * 0.0008; // Forex typically has lower volatility
    const now = Date.now();
    
    // Check cache
    const cacheKey = `forex_${sym}`;
    const cached = cacheRef.current[cacheKey];
    if (cached && Date.now() - cached.timestamp < 30000) {
      // Update the last candle with current price
      const updated = [...cached.data];
      if (updated.length > 0) {
        const lastCandle = updated[updated.length - 1];
        lastCandle.close = price;
        lastCandle.high = Math.max(lastCandle.high, price);
        lastCandle.low = Math.min(lastCandle.low, price);
      }
      return updated;
    }

    // Generate 30 candles of realistic forex data
    const candles: OHLCCandle[] = [];
    let currentClose = price * (1 - 0.005 * Math.random()); // Start slightly below current

    for (let i = 0; i < 30; i++) {
      const timestamp = now - (29 - i) * 60000 * 5; // 5-minute intervals
      const trend = Math.sin(i * 0.2) * 0.3 + (Math.random() - 0.5) * 0.7;
      const change = volatility * trend;
      
      const open = currentClose;
      const close = open + change;
      const range = Math.abs(change) + volatility * Math.random();
      const high = Math.max(open, close) + range * 0.3;
      const low = Math.min(open, close) - range * 0.3;
      
      candles.push({
        timestamp,
        time: new Date(timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        open: Number(open.toFixed(5)),
        high: Number(high.toFixed(5)),
        low: Number(low.toFixed(5)),
        close: Number(close.toFixed(5)),
      });
      
      currentClose = close;
    }

    // Ensure the last candle ends at current price
    if (candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const priceDiff = price - lastCandle.close;
      // Adjust the last few candles to trend toward current price
      for (let i = Math.max(0, candles.length - 5); i < candles.length; i++) {
        const factor = (i - (candles.length - 5)) / 5;
        candles[i].close += priceDiff * factor;
        candles[i].high = Math.max(candles[i].high, candles[i].close);
        candles[i].low = Math.min(candles[i].low, candles[i].close);
      }
    }

    cacheRef.current[cacheKey] = { data: candles, timestamp: Date.now() };
    return candles;
  }, []);

  const fetchOHLCData = useCallback(async () => {
    if (fetchingRef.current || !symbol) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      let candles: OHLCCandle[];

      if (assetType === 'crypto') {
        candles = await fetchCryptoOHLC(symbol);
      } else {
        // For forex, we need a current price to generate realistic data
        const fallbackPrice = currentPrice || 1.0;
        candles = generateForexOHLC(symbol, fallbackPrice);
      }

      if (candles.length > 0) {
        setOhlcData(candles);
        setLastFetch(new Date());
      }
    } catch (err) {
      console.error('OHLC fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch OHLC data');
      
      // Generate fallback data on error
      if (currentPrice && currentPrice > 0) {
        const fallback = generateForexOHLC(symbol, currentPrice);
        setOhlcData(fallback);
      }
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [symbol, assetType, currentPrice, fetchCryptoOHLC, generateForexOHLC]);

  // Initial fetch
  useEffect(() => {
    if (symbol) {
      fetchOHLCData();
    }
  }, [symbol, assetType]);

  // Auto-refresh every 60 seconds for crypto, 30 seconds for forex
  useEffect(() => {
    if (!symbol) return;

    const interval = setInterval(() => {
      fetchOHLCData();
    }, assetType === 'crypto' ? 60000 : 30000);

    return () => clearInterval(interval);
  }, [symbol, assetType, fetchOHLCData]);

  return {
    ohlcData,
    isLoading,
    error,
    lastFetch,
    refetch: fetchOHLCData,
  };
};

export { COINGECKO_ID_MAP };
