import { useState, useCallback, useRef } from 'react';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// CoinGecko API IDs for crypto
const CRYPTO_API_IDS: Record<string, string> = {
  'BTC/USDT': 'bitcoin',
  'ETH/USDT': 'ethereum',
  'BNB/USDT': 'binancecoin',
  'SOL/USDT': 'solana',
  'XRP/USDT': 'ripple',
  'ADA/USDT': 'cardano',
  'DOGE/USDT': 'dogecoin',
  'AVAX/USDT': 'avalanche-2',
  'DOT/USDT': 'polkadot',
  'LINK/USDT': 'chainlink',
  'TRX/USDT': 'tron',
  'LTC/USDT': 'litecoin',
  'MATIC/USDT': 'matic-network',
  'TON/USDT': 'the-open-network',
  'SHIB/USDT': 'shiba-inu',
};

// Base prices for all pairs (used for simulation and fallback)
const BASE_PRICES: Record<string, number> = {
  'BTC/USDT': 94500, 'ETH/USDT': 3450, 'BNB/USDT': 680,
  'SOL/USDT': 195, 'XRP/USDT': 2.35, 'ADA/USDT': 1.05,
  'DOGE/USDT': 0.38, 'AVAX/USDT': 42, 'DOT/USDT': 8.2,
  'LINK/USDT': 24, 'TRX/USDT': 0.26, 'LTC/USDT': 115,
  'MATIC/USDT': 0.58, 'TON/USDT': 6.2, 'SHIB/USDT': 0.000024,
  'EUR/USD': 1.0850, 'GBP/USD': 1.2650, 'USD/JPY': 149.50,
  'AUD/USD': 0.6550, 'USD/CHF': 0.8850, 'USD/CAD': 1.3550,
  'NZD/USD': 0.6150, 'EUR/GBP': 0.8580, 'EUR/JPY': 162.20,
  'GBP/JPY': 189.10, 'EUR/AUD': 1.6550, 'GBP/AUD': 1.9310,
  'EUR/CAD': 1.4710, 'USD/SGD': 1.3450, 'USD/ZAR': 18.50,
};

// Cache for price data - 30 second TTL
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_TTL = 30000;

// Cache for candle data - 60 second TTL
const candleCache = new Map<string, { candles: CandleData[]; timestamp: number }>();
const CANDLE_CACHE_TTL = 60000;

// Deterministic simulation state per symbol
const simulationState = new Map<string, { price: number; lastUpdate: number; phase: number }>();

/**
 * Generate deterministic market simulation with realistic waves
 * Uses sinusoidal waves + noise for realistic forex-like movement
 */
const simulateMarketPrice = (symbol: string, basePrice: number): number => {
  const now = Date.now();
  let state = simulationState.get(symbol);
  
  if (!state) {
    state = { price: basePrice, lastUpdate: now, phase: Math.random() * Math.PI * 2 };
    simulationState.set(symbol, state);
  }
  
  const elapsed = (now - state.lastUpdate) / 1000; // seconds
  const volatility = basePrice * 0.0003; // 0.03% base volatility per tick
  
  // Multiple wave components for realistic movement
  const wave1 = Math.sin(now / 50000 + state.phase) * volatility * 3;
  const wave2 = Math.sin(now / 12000 + state.phase * 2) * volatility * 2;
  const wave3 = Math.sin(now / 3000 + state.phase * 3) * volatility;
  const noise = (Math.random() - 0.5) * volatility * 2;
  
  // Slight trend component (changes every ~5 minutes)
  const trendPhase = Math.floor(now / 300000);
  const trend = Math.sin(trendPhase + state.phase) * volatility * 0.5;
  
  const newPrice = state.price + wave1 + wave2 + wave3 + noise + trend;
  
  // Clamp to reasonable range (±5% from base)
  const minPrice = basePrice * 0.95;
  const maxPrice = basePrice * 1.05;
  const clampedPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
  
  state.price = clampedPrice;
  state.lastUpdate = now;
  
  return clampedPrice;
};

/**
 * Generate simulated candlestick data
 */
const generateSimulatedCandles = (
  symbol: string,
  basePrice: number,
  numCandles: number = 100,
  intervalMs: number = 900000 // 15 min default
): CandleData[] => {
  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = intervalMs / 1000;
  let lastClose = basePrice;
  const data: CandleData[] = [];
  
  // Reset simulation state for consistent chart
  const phase = Math.random() * Math.PI * 2;
  
  for (let i = numCandles; i >= 0; i--) {
    const time = now - i * intervalSeconds;
    const timeMs = time * 1000;
    
    // Simulate price at this historical point
    const volatility = basePrice * 0.002;
    const wave1 = Math.sin(timeMs / 50000 + phase) * volatility * 1.5;
    const wave2 = Math.sin(timeMs / 15000 + phase * 2) * volatility;
    const noise = (Math.sin(timeMs / 1000 + i) * 0.5 + 0.5 - 0.5) * volatility;
    
    const change = wave1 + wave2 + noise;
    
    const open = lastClose;
    const close = open + change;
    const high = Math.max(open, close) + Math.abs(Math.sin(timeMs / 2000)) * volatility * 0.4;
    const low = Math.min(open, close) - Math.abs(Math.cos(timeMs / 2500)) * volatility * 0.4;
    
    data.push({ time, open, high, low, close });
    lastClose = close;
  }
  
  return data;
};

/**
 * Fetch crypto price from CoinGecko (free, no API key required)
 */
const fetchCoinGeckoPrice = async (apiId: string): Promise<number | null> => {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${apiId}&vs_currencies=usd`,
      { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      }
    );
    
    if (!response.ok) {
      console.warn(`CoinGecko HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data[apiId]?.usd || null;
  } catch (error) {
    console.warn('CoinGecko fetch failed:', error);
    return null;
  }
};

/**
 * Fetch crypto OHLC candles from CoinGecko (free)
 * Days: 1, 7, 14, 30, 90, 180, 365, max
 */
const fetchCoinGeckoCandles = async (
  apiId: string,
  days: number = 1
): Promise<CandleData[] | null> => {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${apiId}/ohlc?vs_currency=usd&days=${days}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      }
    );
    
    if (!response.ok) {
      console.warn(`CoinGecko OHLC HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    
    // CoinGecko OHLC format: [timestamp, open, high, low, close]
    return data.map((item: number[]) => ({
      time: Math.floor(item[0] / 1000),
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4],
    }));
  } catch (error) {
    console.warn('CoinGecko OHLC fetch failed:', error);
    return null;
  }
};

export const useMarketData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch current price - uses CoinGecko for crypto, simulation for forex
   */
  const fetchCurrentPrice = useCallback(async (
    tradingPair: string,
    marketType: 'crypto' | 'forex'
  ): Promise<number | null> => {
    const cacheKey = tradingPair;
    const cached = priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.price;
    }

    const basePrice = BASE_PRICES[tradingPair] || 100;

    try {
      if (marketType === 'crypto') {
        const apiId = CRYPTO_API_IDS[tradingPair];
        if (apiId) {
          const livePrice = await fetchCoinGeckoPrice(apiId);
          if (livePrice) {
            priceCache.set(cacheKey, { price: livePrice, timestamp: Date.now() });
            return livePrice;
          }
        }
      }
      
      // Forex or fallback: use simulation
      const simulatedPrice = simulateMarketPrice(tradingPair, basePrice);
      priceCache.set(cacheKey, { price: simulatedPrice, timestamp: Date.now() });
      return simulatedPrice;
    } catch (err) {
      console.warn('Price fetch failed:', err);
      // Return simulated price on error
      const simulatedPrice = simulateMarketPrice(tradingPair, basePrice);
      return simulatedPrice;
    }
  }, []);

  /**
   * Fetch candlestick data for chart
   * - Crypto: CoinGecko OHLC (free)
   * - Forex: Deterministic simulation
   */
  const fetchCandleData = useCallback(async (
    tradingPair: string,
    timeframe: string,
    marketType: 'crypto' | 'forex'
  ): Promise<CandleData[]> => {
    const cacheKey = `${tradingPair}-${timeframe}`;
    const cached = candleCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CANDLE_CACHE_TTL) {
      return cached.candles;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    const basePrice = BASE_PRICES[tradingPair] || 100;
    
    // Map timeframe to interval for simulation
    const intervalMap: Record<string, number> = {
      '1': 60000,      // 1 min
      '5': 300000,     // 5 min
      '15': 900000,    // 15 min
      '60': 3600000,   // 1 hour
      '240': 14400000, // 4 hours
      '1440': 86400000 // 1 day
    };
    const intervalMs = intervalMap[timeframe] || 900000;

    try {
      let candles: CandleData[] | null = null;

      // Try CoinGecko for crypto
      if (marketType === 'crypto') {
        const apiId = CRYPTO_API_IDS[tradingPair];
        if (apiId) {
          // Map timeframe to days for CoinGecko
          const daysMap: Record<string, number> = {
            '1': 1,
            '5': 1,
            '15': 1,
            '60': 7,
            '240': 14,
            '1440': 30,
          };
          const days = daysMap[timeframe] || 1;
          
          candles = await fetchCoinGeckoCandles(apiId, days);
        }
      }

      // Fallback to simulation for forex or if CoinGecko fails
      if (!candles || candles.length === 0) {
        candles = generateSimulatedCandles(tradingPair, basePrice, 100, intervalMs);
      }

      if (candles.length > 0) {
        candleCache.set(cacheKey, { candles, timestamp: Date.now() });
        
        // Update price cache with latest
        const lastPrice = candles[candles.length - 1].close;
        priceCache.set(tradingPair, { price: lastPrice, timestamp: Date.now() });
      }

      setLoading(false);
      return candles;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return [];
      }
      
      console.warn('Candle fetch failed:', err);
      setError(err.message || 'Failed to fetch market data');
      setLoading(false);
      
      // Return simulated data on error
      const fallback = generateSimulatedCandles(tradingPair, basePrice, 100, intervalMs);
      return fallback;
    }
  }, []);

  /**
   * Calculate profit based on trade direction and price movement
   */
  const calculateProfit = useCallback((
    entryPrice: number,
    currentPrice: number,
    investedAmount: number,
    tradeDirection: 'buy' | 'sell'
  ): number => {
    const positionSize = investedAmount / entryPrice;
    
    if (tradeDirection === 'buy') {
      return (currentPrice - entryPrice) * positionSize;
    } else {
      return (entryPrice - currentPrice) * positionSize;
    }
  }, []);

  /**
   * Get data source type for a trading pair
   */
  const getDataSource = useCallback((
    tradingPair: string,
    marketType: 'crypto' | 'forex'
  ): 'coingecko' | 'simulation' => {
    if (marketType === 'crypto' && CRYPTO_API_IDS[tradingPair]) {
      return 'coingecko';
    }
    return 'simulation';
  }, []);

  return {
    loading,
    error,
    fetchCurrentPrice,
    fetchCandleData,
    calculateProfit,
    getDataSource,
  };
};

export default useMarketData;
