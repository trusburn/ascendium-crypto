import { useState, useEffect, useCallback, useRef } from 'react';

export interface TickerData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume: number;
  timestamp: number;
}

// Map our symbols to Binance WebSocket symbols
const BINANCE_SYMBOL_MAP: { [key: string]: string } = {
  'BTC': 'btcusdt',
  'ETH': 'ethusdt',
  'BNB': 'bnbusdt',
  'XRP': 'xrpusdt',
  'SOL': 'solusdt',
  'ADA': 'adausdt',
  'DOGE': 'dogeusdt',
  'DOT': 'dotusdt',
  'MATIC': 'maticusdt',
  'LTC': 'ltcusdt',
  'AVAX': 'avaxusdt',
  'LINK': 'linkusdt',
  'UNI': 'uniusdt',
  'ATOM': 'atomusdt',
};

// Reverse mapping for incoming data
const REVERSE_SYMBOL_MAP: { [key: string]: string } = Object.entries(BINANCE_SYMBOL_MAP).reduce(
  (acc, [key, value]) => ({ ...acc, [value.toUpperCase()]: key }),
  {}
);

interface UseWebSocketPricesResult {
  prices: { [symbol: string]: TickerData };
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

export const useWebSocketPrices = (symbols: string[] = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB']): UseWebSocketPricesResult => {
  const [prices, setPrices] = useState<{ [symbol: string]: TickerData }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Build stream names for multiple symbols
    const streams = symbols
      .map(s => BINANCE_SYMBOL_MAP[s])
      .filter(Boolean)
      .map(s => `${s}@ticker`)
      .join('/');

    if (!streams) {
      setError('No valid symbols to subscribe');
      return;
    }

    // Binance combined stream WebSocket
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    
    console.log('🔌 Connecting to Binance WebSocket:', streams);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const data = message.data;
          
          if (data && data.s) {
            // data.s is the symbol like "BTCUSDT"
            const ourSymbol = REVERSE_SYMBOL_MAP[data.s];
            
            if (ourSymbol) {
              const tickerData: TickerData = {
                symbol: ourSymbol,
                price: parseFloat(data.c), // Current price
                priceChange: parseFloat(data.p), // Price change
                priceChangePercent: parseFloat(data.P), // Price change percent
                high24h: parseFloat(data.h), // 24h high
                low24h: parseFloat(data.l), // 24h low
                volume: parseFloat(data.v), // Volume
                timestamp: data.E, // Event time
              };

              setPrices(prev => ({
                ...prev,
                [ourSymbol]: tickerData,
              }));
            }
          }
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          setError('Max reconnection attempts reached');
        }
      };
    } catch (err) {
      console.error('WebSocket creation error:', err);
      setError('Failed to create WebSocket connection');
    }
  }, [symbols]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    prices,
    isConnected,
    error,
    reconnect,
  };
};

// Hook for real-time kline/candlestick data
export interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

export const useWebSocketKlines = (
  symbol: string = 'BTC',
  interval: string = '1m'
): { kline: KlineData | null; isConnected: boolean } => {
  const [kline, setKline] = useState<KlineData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const binanceSymbol = BINANCE_SYMBOL_MAP[symbol];
    if (!binanceSymbol) {
      console.warn('No Binance mapping for symbol:', symbol);
      return;
    }

    const wsUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol}@kline_${interval}`;
    
    console.log('📊 Connecting to Kline WebSocket:', symbol, interval);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Kline WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const k = message.k;
        
        if (k) {
          setKline({
            time: k.t,
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
            isClosed: k.x, // Is this kline closed?
          });
        }
      } catch (err) {
        console.error('Kline parse error:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [symbol, interval]);

  return { kline, isConnected };
};

export { BINANCE_SYMBOL_MAP };
