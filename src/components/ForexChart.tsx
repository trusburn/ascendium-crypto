import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const ForexChart = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const [selectedPair, setSelectedPair] = useState<string>("EUR/USD");

  // Initialize chart once on mount
  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (chartRef.current) return;

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
      });

      const candlestickSeries = chart.addSeries({
        type: 'Candlestick',
        upColor: "#10b981",
        downColor: "#ef4444",
        borderVisible: false,
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      } as any);

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;

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
        }
      };
    } catch (error) {
      console.error("Error initializing chart:", error);
    }
  }, []);

  // Update chart data when pair selection changes
  useEffect(() => {
    if (selectedPair && seriesRef.current) {
      generateForexData(selectedPair);
    }
  }, [selectedPair]);

  const generateForexData = (pairSymbol: string) => {
    const pair = forexPairs.find(p => p.symbol === pairSymbol);
    if (!pair || !seriesRef.current) return;

    // Generate simulated historical data
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    const daySeconds = 86400;
    let price = pair.basePrice;

    for (let i = 30; i >= 0; i--) {
      const time = now - (i * daySeconds);
      const volatility = pair.basePrice * 0.005; // 0.5% daily volatility
      
      const open = price;
      const change = (Math.random() - 0.5) * volatility * 2;
      const high = open + Math.abs(change) + Math.random() * volatility;
      const low = open - Math.abs(change) - Math.random() * volatility;
      const close = open + change;
      
      data.push({
        time: time as any,
        open: Number(open.toFixed(4)),
        high: Number(high.toFixed(4)),
        low: Number(low.toFixed(4)),
        close: Number(close.toFixed(4)),
      });
      
      price = close;
    }

    seriesRef.current.setData(data);
  };

  const handlePairChange = (value: string) => {
    setSelectedPair(value);
  };

  return (
    <Card className="border-0 bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span>Forex Market Analysis</span>
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
        <div ref={chartContainerRef} className="w-full" />
      </CardContent>
    </Card>
  );
};

export default ForexChart;
