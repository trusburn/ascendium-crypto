import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, IChartApi, CandlestickSeries } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface ForexPair {
  symbol: string;
  name: string;
  basePrice: number;
}

const forexPairs: ForexPair[] = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", basePrice: 1.0892 },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", basePrice: 1.2654 },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", basePrice: 149.85 },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", basePrice: 0.6543 },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", basePrice: 0.8765 },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", basePrice: 1.3542 },
  { symbol: "NZD/USD", name: "New Zealand Dollar / US Dollar", basePrice: 0.6123 },
  { symbol: "EUR/GBP", name: "Euro / British Pound", basePrice: 0.8612 },
];

// Generate realistic forex OHLC data
const generateForexData = (pair: ForexPair) => {
  const data = [];
  const now = Math.floor(Date.now() / 1000);
  const hourSeconds = 3600;
  let price = pair.basePrice;

  // Generate 7 days of hourly data (168 candles)
  for (let i = 168; i >= 0; i--) {
    const time = now - (i * hourSeconds);
    
    // Simulate realistic forex volatility (0.1-0.3% per hour)
    const volatility = pair.basePrice * (0.001 + Math.random() * 0.002);
    const trend = Math.sin(i / 24) * 0.0005; // Add some trending behavior
    
    const open = price;
    const change = (Math.random() - 0.5 + trend) * volatility * 2;
    const high = Math.max(open, open + change) + Math.random() * volatility * 0.5;
    const low = Math.min(open, open + change) - Math.random() * volatility * 0.5;
    const close = open + change;
    
    data.push({
      time: time as any,
      open: Number(open.toFixed(5)),
      high: Number(high.toFixed(5)),
      low: Number(low.toFixed(5)),
      close: Number(close.toFixed(5)),
    });
    
    price = close;
  }

  return data;
};

const ForexChart = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const [selectedPair, setSelectedPair] = useState<string>("EUR/USD");
  const [isChartReady, setIsChartReady] = useState(false);

  // Initialize chart once on mount
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    try {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#d1d5db",
        },
        grid: {
          vertLines: { color: "#1f2937" },
          horzLines: { color: "#1f2937" },
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      });

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;
      setIsChartReady(true);

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          seriesRef.current = null;
          setIsChartReady(false);
        }
      };
    } catch (error) {
      console.error("Error initializing forex chart:", error);
    }
  }, []);

  // Update chart data when pair changes or chart becomes ready
  const updateChartData = useCallback(() => {
    if (!seriesRef.current || !isChartReady) return;
    
    const pair = forexPairs.find(p => p.symbol === selectedPair);
    if (!pair) return;

    try {
      const data = generateForexData(pair);
      seriesRef.current.setData(data);
      
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (error) {
      console.error("Error updating forex chart data:", error);
    }
  }, [selectedPair, isChartReady]);

  useEffect(() => {
    updateChartData();
  }, [updateChartData]);

  const handlePairChange = (value: string) => {
    setSelectedPair(value);
  };

  const currentPair = forexPairs.find(p => p.symbol === selectedPair);

  return (
    <Card className="border-0 bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span>Forex Market Analysis</span>
          {currentPair && (
            <span className="text-sm font-normal text-muted-foreground">
              ({currentPair.name})
            </span>
          )}
        </CardTitle>
        <Select value={selectedPair} onValueChange={handlePairChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select pair" />
          </SelectTrigger>
          <SelectContent>
            {forexPairs.map((pair) => (
              <SelectItem key={pair.symbol} value={pair.symbol}>
                {pair.symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div ref={chartContainerRef} className="w-full relative">
          {!isChartReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <Loader2 className="h-8 w-8 animate-spin text-crypto-blue" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ForexChart;
