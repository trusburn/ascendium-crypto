import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceData {
  [symbol: string]: number;
}

interface ForexRates {
  rates: { [key: string]: number };
  base: string;
}

// CoinGecko ID mapping for crypto assets
const CRYPTO_ID_MAP: { [key: string]: string } = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'USDT': 'tether',
  'BNB': 'binancecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'SOL': 'solana',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'LTC': 'litecoin',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
};

// Base prices for forex pairs (used as fallback and for calculating pair prices)
const FOREX_BASE_PRICES: { [key: string]: number } = {
  'EUR/USD': 1.0850,
  'GBP/USD': 1.2650,
  'USD/JPY': 148.50,
  'USD/CHF': 0.8750,
  'AUD/USD': 0.6550,
  'USD/CAD': 1.3450,
  'NZD/USD': 0.6150,
  'EUR/GBP': 0.8580,
  'EUR/JPY': 161.10,
  'GBP/JPY': 187.80,
  'EUR/CHF': 0.9495,
  'AUD/JPY': 97.25,
  'GBP/CHF': 1.1070,
  'EUR/AUD': 1.6565,
  'NZD/JPY': 91.35,
};

export const useRealMarketPrices = () => {
  const [cryptoPrices, setCryptoPrices] = useState<PriceData>({});
  const [forexRates, setForexRates] = useState<PriceData>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const forexBaseRatesRef = useRef<{ [key: string]: number }>({});

  // Fetch crypto prices from CoinGecko (free, no API key needed)
  const fetchCryptoPrices = useCallback(async () => {
    try {
      const ids = Object.values(CRYPTO_ID_MAP).join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      
      if (!response.ok) {
        console.warn('CoinGecko API response not OK:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      // Map back to symbols
      const prices: PriceData = {};
      Object.entries(CRYPTO_ID_MAP).forEach(([symbol, id]) => {
        if (data[id]?.usd) {
          prices[symbol] = data[id].usd;
        }
      });
      
      return prices;
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      return null;
    }
  }, []);

  // Fetch forex rates from Exchange Rate API (free, no API key needed)
  const fetchForexRates = useCallback(async () => {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      
      if (!response.ok) {
        console.warn('Exchange Rate API response not OK:', response.status);
        return null;
      }
      
      const data: ForexRates = await response.json();
      
      // Store base rates for calculations
      forexBaseRatesRef.current = data.rates;
      
      // Calculate forex pair prices
      const pairs: PriceData = {};
      
      // EUR/USD: How many USD per 1 EUR
      if (data.rates.EUR) pairs['EUR/USD'] = 1 / data.rates.EUR;
      
      // GBP/USD: How many USD per 1 GBP
      if (data.rates.GBP) pairs['GBP/USD'] = 1 / data.rates.GBP;
      
      // USD/JPY: How many JPY per 1 USD
      if (data.rates.JPY) pairs['USD/JPY'] = data.rates.JPY;
      
      // USD/CHF: How many CHF per 1 USD
      if (data.rates.CHF) pairs['USD/CHF'] = data.rates.CHF;
      
      // AUD/USD: How many USD per 1 AUD
      if (data.rates.AUD) pairs['AUD/USD'] = 1 / data.rates.AUD;
      
      // USD/CAD: How many CAD per 1 USD
      if (data.rates.CAD) pairs['USD/CAD'] = data.rates.CAD;
      
      // NZD/USD: How many USD per 1 NZD
      if (data.rates.NZD) pairs['NZD/USD'] = 1 / data.rates.NZD;
      
      // Cross pairs
      if (data.rates.EUR && data.rates.GBP) pairs['EUR/GBP'] = data.rates.GBP / data.rates.EUR;
      if (data.rates.EUR && data.rates.JPY) pairs['EUR/JPY'] = data.rates.JPY / data.rates.EUR;
      if (data.rates.GBP && data.rates.JPY) pairs['GBP/JPY'] = data.rates.JPY / data.rates.GBP;
      if (data.rates.EUR && data.rates.CHF) pairs['EUR/CHF'] = data.rates.CHF / data.rates.EUR;
      if (data.rates.AUD && data.rates.JPY) pairs['AUD/JPY'] = data.rates.JPY / data.rates.AUD;
      if (data.rates.GBP && data.rates.CHF) pairs['GBP/CHF'] = data.rates.CHF / data.rates.GBP;
      if (data.rates.EUR && data.rates.AUD) pairs['EUR/AUD'] = data.rates.AUD / data.rates.EUR;
      if (data.rates.NZD && data.rates.JPY) pairs['NZD/JPY'] = data.rates.JPY / data.rates.NZD;
      
      return pairs;
    } catch (error) {
      console.error('Error fetching forex rates:', error);
      return null;
    }
  }, []);

  // Update prices in the database
  const updateDatabasePrices = useCallback(async (crypto: PriceData, forex: PriceData) => {
    try {
      // Fetch all tradeable assets
      const { data: assets, error } = await supabase
        .from('tradeable_assets')
        .select('id, symbol, asset_type');
      
      if (error) {
        console.error('Error fetching assets:', error);
        return;
      }
      
      // Update each asset with real price
      for (const asset of assets || []) {
        let newPrice: number | null = null;
        
        if (asset.asset_type === 'crypto') {
          // Extract base symbol (e.g., "BTC/USDT" -> "BTC")
          const baseSymbol = asset.symbol.split('/')[0];
          newPrice = crypto[baseSymbol];
        } else if (asset.asset_type === 'forex') {
          newPrice = forex[asset.symbol];
        }
        
        if (newPrice && newPrice > 0) {
          await supabase
            .from('tradeable_assets')
            .update({ 
              current_price: newPrice,
              updated_at: new Date().toISOString()
            })
            .eq('id', asset.id);
        }
      }
      
      console.log('✅ Database prices updated with real market data');
    } catch (error) {
      console.error('Error updating database prices:', error);
    }
  }, []);

  // Main fetch function
  const fetchAllPrices = useCallback(async () => {
    console.log('📊 Fetching real market prices...');
    
    const [crypto, forex] = await Promise.all([
      fetchCryptoPrices(),
      fetchForexRates()
    ]);
    
    if (crypto) {
      setCryptoPrices(crypto);
    }
    
    if (forex) {
      setForexRates(forex);
    } else {
      // Use fallback forex prices if API fails
      setForexRates(FOREX_BASE_PRICES);
    }
    
    // Update database with real prices
    if (crypto || forex) {
      await updateDatabasePrices(
        crypto || {},
        forex || FOREX_BASE_PRICES
      );
    }
    
    setLastUpdate(new Date());
    setLoading(false);
  }, [fetchCryptoPrices, fetchForexRates, updateDatabasePrices]);

  // Initial fetch and interval
  useEffect(() => {
    fetchAllPrices();
    
    // Refresh every 30 seconds for crypto, forex rates update less frequently
    const interval = setInterval(fetchAllPrices, 30000);
    
    return () => clearInterval(interval);
  }, [fetchAllPrices]);

  // Get price for a specific symbol
  const getPrice = useCallback((symbol: string, assetType: 'crypto' | 'forex'): number => {
    if (assetType === 'crypto') {
      const baseSymbol = symbol.split('/')[0];
      return cryptoPrices[baseSymbol] || 0;
    } else {
      return forexRates[symbol] || FOREX_BASE_PRICES[symbol] || 0;
    }
  }, [cryptoPrices, forexRates]);

  return {
    cryptoPrices,
    forexRates,
    loading,
    lastUpdate,
    getPrice,
    refetch: fetchAllPrices,
  };
};

export { CRYPTO_ID_MAP, FOREX_BASE_PRICES };
