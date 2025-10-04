import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { supabase } from '@/integrations/supabase/client';
import { ArrowDownLeft, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const DashboardWithdrawal = () => {
  const { user } = useAuth();
  const { settings, isLoading: settingsLoading } = useAdminSettings();
  const [amount, setAmount] = useState('');
  const [cryptoType, setCryptoType] = useState('bitcoin');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const minWithdrawal = settings.minimum_withdrawal;

  const cryptoOptions = [
    { value: 'bitcoin', label: 'Bitcoin (BTC)' },
    { value: 'ethereum', label: 'Ethereum (ETH)' },
    { value: 'usdt', label: 'USDT (TRC20)' },
    { value: 'bnb', label: 'BNB (BSC)' },
  ];

  const handleSubmitWithdrawal = async () => {
    if (!amount || !cryptoType || !walletAddress || !user) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(amount) < minWithdrawal) {
      toast({
        title: "Minimum Amount Required",
        description: `Minimum withdrawal amount is $${minWithdrawal}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          crypto_type: cryptoType,
          wallet_address: walletAddress,
          status: 'pending'
        });

      if (error) {
        console.error('Error creating withdrawal:', error);
        toast({
          title: "Withdrawal Failed",
          description: "Failed to submit withdrawal request",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Withdrawal Submitted",
        description: "Your withdrawal request has been submitted for approval",
      });

      // Reset form
      setAmount('');
      setCryptoType('bitcoin');
      setWalletAddress('');
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
          <h1 className="text-3xl font-bold">Withdraw Funds</h1>
          <p className="text-muted-foreground">Request a withdrawal from your account</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Withdrawal Form */}
          <Card className="bg-muted/50 border-border">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowDownLeft className="mr-2 h-5 w-5 text-destructive" />
                Withdrawal Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">Withdrawal Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder={`Enter amount (minimum $${settingsLoading ? '...' : minWithdrawal})`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border-border/50 focus:border-crypto-blue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="crypto">Cryptocurrency</Label>
                <Select value={cryptoType} onValueChange={setCryptoType}>
                  <SelectTrigger className="border-border/50 focus:border-crypto-blue">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cryptoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wallet">Your Wallet Address</Label>
                <Input
                  id="wallet"
                  type="text"
                  placeholder="Enter your wallet address"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="border-border/50 focus:border-crypto-blue"
                />
                <p className="text-xs text-muted-foreground">
                  Make sure this address matches the selected cryptocurrency
                </p>
              </div>

              <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h4 className="font-medium text-destructive">Important</h4>
                    <p className="text-sm text-muted-foreground">
                      Double-check your wallet address. Incorrect addresses may result in permanent loss of funds.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSubmitWithdrawal}
                className="w-full bg-destructive hover:bg-destructive/90"
                disabled={loading || !amount || !walletAddress || parseFloat(amount) < minWithdrawal}
              >
                {loading ? "Submitting..." : "Request Withdrawal"}
              </Button>
            </CardContent>
          </Card>

          {/* Withdrawal Information */}
          <Card className="bg-muted/50 border-border">
            <CardHeader>
              <CardTitle>Withdrawal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium">Processing Time</h4>
                  <p className="text-sm text-muted-foreground">
                    Withdrawals are processed within 24-72 hours after approval
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Minimum Amount</h4>
                  <p className="text-sm text-muted-foreground">
                    ${settingsLoading ? '...' : minWithdrawal} USD minimum withdrawal amount
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Fees</h4>
                  <p className="text-sm text-muted-foreground">
                    Network fees apply based on blockchain congestion
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Security</h4>
                  <p className="text-sm text-muted-foreground">
                    All withdrawals require manual approval for security
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-crypto-blue/10 border border-crypto-blue/30 rounded-lg">
                <h4 className="font-medium text-crypto-blue mb-2">Withdrawal Steps:</h4>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Enter withdrawal amount</li>
                  <li>2. Select cryptocurrency</li>
                  <li>3. Provide your wallet address</li>
                  <li>4. Submit for admin approval</li>
                  <li>5. Receive funds after processing</li>
                </ol>
              </div>

              <div className="mt-4 p-4 bg-crypto-gold/10 border border-crypto-gold/30 rounded-lg">
                <h4 className="font-medium text-crypto-gold mb-2">Support:</h4>
                <p className="text-sm text-muted-foreground">
                  Contact support if your withdrawal takes longer than expected or if you need assistance.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardWithdrawal;