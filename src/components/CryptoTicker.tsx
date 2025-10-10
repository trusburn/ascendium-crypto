import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

const CryptoTicker = () => {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPrices = async () => {
    try {
      // Fetch tracked cryptos from admin settings
      const { data: settingsData } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "tracked_cryptos")
        .single();

      const defaultCryptos = [
        { symbol: "BTC", name: "Bitcoin", coingecko_id: "bitcoin", enabled: true },
        { symbol: "ETH", name: "Ethereum", coingecko_id: "ethereum", enabled: true },
        { symbol: "USDT", name: "Tether", coingecko_id: "tether", enabled: true },
      ];
      
      const trackedCryptos = Array.isArray(settingsData?.value) ? settingsData.value : defaultCryptos;
      const enabledCryptos = trackedCryptos.filter((c: any) => c.enabled);
      const ids = enabledCryptos.map((c: any) => c.coingecko_id).join(",");

      // Fetch prices from CoinGecko
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      const data = await response.json();

      const priceData = enabledCryptos.map((crypto: any) => ({
        symbol: crypto.symbol,
        name: crypto.name,
        price: data[crypto.coingecko_id]?.usd || 0,
        change24h: data[crypto.coingecko_id]?.usd_24h_change || 0,
      }));

      setPrices(priceData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching crypto prices:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex gap-6 overflow-x-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 animate-pulse">
              <div className="h-4 w-16 bg-muted rounded mb-2" />
              <div className="h-6 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card">
      <div className="flex gap-6 overflow-x-auto">
        {prices.map((crypto) => (
          <div key={crypto.symbol} className="flex-shrink-0">
            <div className="text-sm text-muted-foreground">{crypto.symbol}</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">
                ${crypto.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`flex items-center text-sm ${
                  crypto.change24h >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {crypto.change24h >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(crypto.change24h).toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default CryptoTicker;
