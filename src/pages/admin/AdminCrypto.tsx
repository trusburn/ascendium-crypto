import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface CryptoSetting {
  symbol: string;
  name: string;
  coingecko_id: string;
  enabled: boolean;
}

const AdminCrypto = () => {
  const [cryptos, setCryptos] = useState<CryptoSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCryptoSettings();
  }, []);

  const fetchCryptoSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "tracked_cryptos")
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data?.value && Array.isArray(data.value)) {
        setCryptos(data.value as unknown as CryptoSetting[]);
      } else {
        // Default cryptos
        setCryptos([
          { symbol: "BTC", name: "Bitcoin", coingecko_id: "bitcoin", enabled: true },
          { symbol: "ETH", name: "Ethereum", coingecko_id: "ethereum", enabled: true },
          { symbol: "USDT", name: "Tether", coingecko_id: "tether", enabled: true },
        ]);
      }
    } catch (error) {
      console.error("Error fetching crypto settings:", error);
      toast({
        title: "Error",
        description: "Failed to load crypto settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("admin_settings")
        .upsert({
          key: "tracked_cryptos",
          value: cryptos as any,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Crypto settings saved successfully",
      });
    } catch (error) {
      console.error("Error saving crypto settings:", error);
      toast({
        title: "Error",
        description: "Failed to save crypto settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addCrypto = () => {
    setCryptos([
      ...cryptos,
      { symbol: "", name: "", coingecko_id: "", enabled: true },
    ]);
  };

  const removeCrypto = (index: number) => {
    setCryptos(cryptos.filter((_, i) => i !== index));
  };

  const updateCrypto = (index: number, field: keyof CryptoSetting, value: any) => {
    const updated = [...cryptos];
    updated[index] = { ...updated[index], [field]: value };
    setCryptos(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cryptocurrency Management</h1>
          <p className="text-muted-foreground">
            Configure which cryptocurrencies to track and display on the dashboard
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tracked Cryptocurrencies</CardTitle>
          <CardDescription>
            Add or remove cryptocurrencies to track. Use CoinGecko IDs for accurate data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cryptos.map((crypto, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
              <div className="col-span-2">
                <Label>Symbol</Label>
                <Input
                  value={crypto.symbol}
                  onChange={(e) => updateCrypto(index, "symbol", e.target.value.toUpperCase())}
                  placeholder="BTC"
                />
              </div>
              <div className="col-span-3">
                <Label>Name</Label>
                <Input
                  value={crypto.name}
                  onChange={(e) => updateCrypto(index, "name", e.target.value)}
                  placeholder="Bitcoin"
                />
              </div>
              <div className="col-span-4">
                <Label>CoinGecko ID</Label>
                <Input
                  value={crypto.coingecko_id}
                  onChange={(e) => updateCrypto(index, "coingecko_id", e.target.value)}
                  placeholder="bitcoin"
                />
              </div>
              <div className="col-span-2 flex items-center space-x-2">
                <Switch
                  checked={crypto.enabled}
                  onCheckedChange={(checked) => updateCrypto(index, "enabled", checked)}
                />
                <Label>Enabled</Label>
              </div>
              <div className="col-span-1">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeCrypto(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button onClick={addCrypto} variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Cryptocurrency
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CoinGecko API Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Find CoinGecko IDs at: <a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">coingecko.com</a>
          </p>
          <p className="text-sm text-muted-foreground">
            Common IDs: bitcoin, ethereum, tether, binancecoin, cardano, solana, ripple, polkadot
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCrypto;
