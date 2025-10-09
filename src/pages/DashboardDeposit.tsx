import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { supabase } from '@/integrations/supabase/client';
import { ArrowUpRight, Copy, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const DashboardDeposit = () => {
  const { user } = useAuth();
  const { settings, isLoading: settingsLoading } = useAdminSettings();
  const [amount, setAmount] = useState('');
  const [cryptoType, setCryptoType] = useState('bitcoin');
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [profitCalculated, setProfitCalculated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walletAddresses, setWalletAddresses] = useState({
    bitcoin: '',
    ethereum: '',
    usdt: '',
  });

  const minDeposit = settings.minimum_deposit;

  const cryptoOptions = [
    { value: 'bitcoin', label: 'Bitcoin (BTC)', rate: 0.15 },
    { value: 'ethereum', label: 'Ethereum (ETH)', rate: 0.18 },
    { value: 'usdt', label: 'USDT (TRC20)', rate: 0.12 },
  ];

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

      const addresses: any = {};
      data?.forEach((setting) => {
        const cryptoType = setting.key.replace('wallet_', '');
        addresses[cryptoType] = setting.value || '';
      });

      setWalletAddresses({
        bitcoin: addresses.bitcoin || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        ethereum: addresses.ethereum || '0x742d35cc6635c0532925a3b8d23c82c6b1234567',
        usdt: addresses.usdt || 'TQn9Y2khEsLJW1ChVWFMSMeRDow5oREqjK',
      });
    } catch (error) {
      console.error('Error fetching wallet addresses:', error);
    }
  };

  const selectedCrypto = cryptoOptions.find(option => option.value === cryptoType);
  const calculatedProfit = amount ? (parseFloat(amount) * (selectedCrypto?.rate || 0)).toFixed(2) : '0.00';

  const handleCalculateProfit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(amount) < minDeposit) {
      toast({
        title: "Minimum Deposit Required",
        description: `Minimum deposit amount is $${minDeposit}`,
        variant: "destructive",
      });
      return;
    }

    setWalletAddress(walletAddresses[cryptoType as keyof typeof walletAddresses]);
    setProfitCalculated(true);
  };

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitDeposit = async () => {
    if (!amount || !cryptoType || !walletAddress || !user) {
      toast({
        title: "Missing Information",
        description: "Please complete all steps before submitting",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          crypto_type: cryptoType,
          wallet_address: walletAddress,
          status: 'pending'
        });

      if (error) {
        console.error('Error creating deposit:', error);
        toast({
          title: "Deposit Failed",
          description: "Failed to submit deposit request",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Deposit Submitted",
        description: "Your deposit request has been submitted for approval",
      });

      // Reset form
      setAmount('');
      setCryptoType('bitcoin');
      setWalletAddress('');
      setProfitCalculated(false);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Make a Deposit</h1>
          <p className="text-muted-foreground">Fund your account to start trading</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Deposit Form */}
          <Card className="bg-muted/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowUpRight className="mr-2 h-5 w-5 text-crypto-green" />
                Deposit Funds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">Deposit Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border-border/50 focus:border-crypto-blue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="crypto">Select Cryptocurrency</Label>
                <Select value={cryptoType} onValueChange={setCryptoType}>
                  <SelectTrigger className="border-border/50 focus:border-crypto-blue">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cryptoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} ({(option.rate * 100).toFixed(0)}% profit rate)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleCalculateProfit}
                className="w-full bg-crypto-gradient hover:opacity-90"
                disabled={!amount || parseFloat(amount) <= 0}
              >
                Calculate Profit & Get Wallet Address
              </Button>

              {profitCalculated && (
                <div className="space-y-4 p-4 bg-crypto-green/10 border border-crypto-green/30 rounded-lg">
                  <div className="text-center">
                    <h3 className="font-semibold text-crypto-green">Expected Monthly Profit</h3>
                    <p className="text-2xl font-bold text-crypto-green">${calculatedProfit}</p>
                    <p className="text-sm text-muted-foreground">
                      {((selectedCrypto?.rate || 0) * 100).toFixed(0)}% of ${amount}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Send payment to this wallet address:</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={walletAddress}
                        readOnly
                        className="bg-background"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handleCopyAddress}
                        className="shrink-0"
                      >
                        {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmitDeposit}
                    className="w-full bg-crypto-green hover:bg-crypto-green/90"
                    disabled={loading}
                  >
                    {loading ? "Submitting..." : "Confirm Deposit"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-muted/50 border-border">
            <CardHeader>
              <CardTitle>How to Deposit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-crypto-blue rounded-full flex items-center justify-center text-xs font-bold text-background">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Enter Amount</h4>
                    <p className="text-sm text-muted-foreground">
                      Enter the amount you want to deposit in USD
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-crypto-blue rounded-full flex items-center justify-center text-xs font-bold text-background">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Choose Cryptocurrency</h4>
                    <p className="text-sm text-muted-foreground">
                      Select your preferred cryptocurrency for deposit
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-crypto-blue rounded-full flex items-center justify-center text-xs font-bold text-background">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Send Payment</h4>
                    <p className="text-sm text-muted-foreground">
                      Send the exact amount to the provided wallet address
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-crypto-blue rounded-full flex items-center justify-center text-xs font-bold text-background">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium">Confirmation</h4>
                    <p className="text-sm text-muted-foreground">
                      Your deposit will be confirmed within 1-3 business days
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-crypto-gold/10 border border-crypto-gold/30 rounded-lg">
                <h4 className="font-medium text-crypto-gold mb-2">Important Notes:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Minimum deposit: ${settingsLoading ? '...' : minDeposit}</li>
                  <li>• All deposits require admin approval</li>
                  <li>• Profits are calculated monthly</li>
                  <li>• Contact support for large deposits</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardDeposit;