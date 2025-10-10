import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface CryptoOption {
  symbol: string;
  name: string;
  coingecko_id: string;
}

const TradingViewChart = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const [cryptos, setCryptos] = useState<CryptoOption[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<string>("bitcoin");

  useEffect(() => {
    fetchCryptos();
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current) return;

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

    fetchChartData(selectedCrypto);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [selectedCrypto]);

  const fetchCryptos = async () => {
    try {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "tracked_cryptos")
        .single();

      const defaultCryptos = [
        { symbol: "BTC", name: "Bitcoin", coingecko_id: "bitcoin", enabled: true },
        { symbol: "ETH", name: "Ethereum", coingecko_id: "ethereum", enabled: true },
        { symbol: "USDT", name: "Tether", coingecko_id: "tether", enabled: true },
      ];
      
      const trackedCryptos = Array.isArray(data?.value) ? data.value : defaultCryptos;
      const enabled = trackedCryptos.filter((c: any) => c.enabled);
      setCryptos(enabled as unknown as CryptoOption[]);
      if (enabled.length > 0) {
        setSelectedCrypto((enabled[0] as any).coingecko_id);
      }
    } catch (error) {
      console.error("Error fetching cryptos:", error);
    }
  };

  const fetchChartData = async (cryptoId: string) => {
    try {
      // Fetch 7 days of OHLC data from CoinGecko
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${cryptoId}/ohlc?vs_currency=usd&days=7`
      );
      const data = await response.json();

      if (seriesRef.current && Array.isArray(data)) {
        const chartData = data.map((item: number[]) => ({
          time: Math.floor(item[0] / 1000) as any,
          open: item[1],
          high: item[2],
          low: item[3],
          close: item[4],
        }));

        seriesRef.current.setData(chartData);
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  };

  const handleCryptoChange = (value: string) => {
    setSelectedCrypto(value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Market Analysis</CardTitle>
        <Select value={selectedCrypto} onValueChange={handleCryptoChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select crypto" />
          </SelectTrigger>
          <SelectContent>
            {cryptos.map((crypto) => (
              <SelectItem key={crypto.coingecko_id} value={crypto.coingecko_id}>
                {crypto.name} ({crypto.symbol})
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

export default TradingViewChart;
