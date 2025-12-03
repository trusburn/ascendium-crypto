import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, Bitcoin, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const AdminWallets = () => {
  const [loading, setLoading] = useState(false);
  const [wallets, setWallets] = useState({
    bitcoin: '',
    ethereum: '',
    usdt: '',
  });

  useEffect(() => {
    fetchWalletAddresses();
  }, []);

  const fetchWalletAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', ['wallet_bitcoin', 'wallet_ethereum', 'wallet_usdt']);

      if (error) throw error;

      const walletsData: Record<string, string> = {};
      data?.forEach((setting) => {
        const cryptoType = setting.key.replace('wallet_', '');
        // Extract string from jsonb value
        const value = setting.value;
        if (typeof value === 'string') {
          walletsData[cryptoType] = value;
        } else if (value && typeof value === 'object' && 'address' in value) {
          walletsData[cryptoType] = (value as { address: string }).address;
        } else {
          walletsData[cryptoType] = '';
        }
      });

      setWallets({
        bitcoin: walletsData.bitcoin || '',
        ethereum: walletsData.ethereum || '',
        usdt: walletsData.usdt || '',
      });
    } catch (error) {
      console.error('Error fetching wallet addresses:', error);
      toast({
        title: "Error",
        description: "Failed to load wallet addresses",
        variant: "destructive",
      });
    }
  };

  const handleSaveWallet = async (cryptoType: string, address: string) => {
    setLoading(true);
    try {
      // Store as JSON object with address property for jsonb column
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          key: `wallet_${cryptoType}`,
          value: { address: address } as unknown as string,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `${cryptoType.toUpperCase()} wallet address updated. Users will now see this address.`,
      });
    } catch (error) {
      console.error('Error saving wallet address:', error);
      toast({
        title: "Error",
        description: "Failed to save wallet address",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const walletConfig = [
    {
      type: 'bitcoin',
      label: 'Bitcoin (BTC)',
      icon: Bitcoin,
      placeholder: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      color: 'text-orange-500'
    },
    {
      type: 'ethereum',
      label: 'Ethereum (ETH)',
      icon: Wallet,
      placeholder: '0x742d35cc6635c0532925a3b8d23c82c6b1234567',
      color: 'text-blue-500'
    },
    {
      type: 'usdt',
      label: 'USDT (TRC20)',
      icon: DollarSign,
      placeholder: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5oREqjK',
      color: 'text-green-500'
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Wallet Management</h1>
          <p className="text-muted-foreground">
            Configure cryptocurrency wallet addresses for user deposits
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {walletConfig.map((config) => (
            <Card key={config.type} className="bg-muted/50 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <config.icon className={`h-5 w-5 ${config.color}`} />
                  {config.label}
                </CardTitle>
                <CardDescription>
                  Set the wallet address for {config.label} deposits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={config.type}>Wallet Address</Label>
                  <Input
                    id={config.type}
                    placeholder={config.placeholder}
                    value={wallets[config.type as keyof typeof wallets]}
                    onChange={(e) => setWallets({
                      ...wallets,
                      [config.type]: e.target.value
                    })}
                    className="font-mono text-sm"
                  />
                </div>
                <Button
                  onClick={() => handleSaveWallet(config.type, wallets[config.type as keyof typeof wallets])}
                  disabled={loading || !wallets[config.type as keyof typeof wallets]}
                  className="w-full"
                >
                  {loading ? 'Saving...' : 'Save Address'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-crypto-gold/10 border-crypto-gold/30">
          <CardHeader>
            <CardTitle className="text-crypto-gold">Important Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Ensure wallet addresses are correct before saving</p>
            <p>• Users will see these addresses when making deposits</p>
            <p>• Changes take effect immediately for all new deposits</p>
            <p>• Keep backup copies of wallet addresses in a secure location</p>
            <p>• Verify you have access to these wallets before updating</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminWallets;
