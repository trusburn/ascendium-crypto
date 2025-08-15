import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Signal, 
  CheckCircle, 
  XCircle,
  DollarSign,
  TrendingUp,
  Shield
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  crypto_type: string;
  wallet_address: string;
  status: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  crypto_type: string;
  wallet_address: string;
  status: string;
  created_at: string;
}

const AdminPanel = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch deposits
      const { data: depositsData, error: depositsError } = await supabase
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false });

      if (depositsError) {
        console.error('Error fetching deposits:', depositsError);
      } else {
        setDeposits(depositsData || []);
      }

      // Fetch withdrawals
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (withdrawalsError) {
        console.error('Error fetching withdrawals:', withdrawalsError);
      } else {
        setWithdrawals(withdrawalsData || []);
      }

      // Calculate stats
      const totalDeposits = depositsData?.reduce((sum, d) => sum + d.amount, 0) || 0;
      const totalWithdrawals = withdrawalsData?.reduce((sum, w) => sum + w.amount, 0) || 0;
      const pendingDeposits = depositsData?.filter(d => d.status === 'pending').length || 0;
      const pendingWithdrawals = withdrawalsData?.filter(w => w.status === 'pending').length || 0;

      setStats({
        totalUsers: 0, // Would need to query profiles table
        totalDeposits,
        totalWithdrawals,
        pendingDeposits,
        pendingWithdrawals,
      });

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDeposit = async (depositId: string) => {
    try {
      const { error } = await supabase
        .from('deposits')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', depositId);

      if (error) {
        throw error;
      }

      toast({
        title: "Deposit Approved",
        description: "Deposit has been approved successfully",
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error approving deposit:', error);
      toast({
        title: "Error",
        description: "Failed to approve deposit",
        variant: "destructive",
      });
    }
  };

  const handleRejectDeposit = async (depositId: string) => {
    try {
      const { error } = await supabase
        .from('deposits')
        .update({ status: 'rejected' })
        .eq('id', depositId);

      if (error) {
        throw error;
      }

      toast({
        title: "Deposit Rejected",
        description: "Deposit has been rejected",
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting deposit:', error);
      toast({
        title: "Error",
        description: "Failed to reject deposit",
        variant: "destructive",
      });
    }
  };

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      if (error) {
        throw error;
      }

      toast({
        title: "Withdrawal Approved",
        description: "Withdrawal has been approved successfully",
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast({
        title: "Error",
        description: "Failed to approve withdrawal",
        variant: "destructive",
      });
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ status: 'rejected' })
        .eq('id', withdrawalId);

      if (error) {
        throw error;
      }

      toast({
        title: "Withdrawal Rejected",
        description: "Withdrawal has been rejected",
      });

      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast({
        title: "Error",
        description: "Failed to reject withdrawal",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-crypto-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Shield className="mr-3 h-8 w-8 text-crypto-gold" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground">Manage platform operations</p>
          </div>
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            variant="outline"
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="bg-muted/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-crypto-blue" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
              <DollarSign className="h-4 w-4 text-crypto-green" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalDeposits.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
              <TrendingUp className="h-4 w-4 text-crypto-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalWithdrawals.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Deposits</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-crypto-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingDeposits}</div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingWithdrawals}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="deposits" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="signals">Signals</TabsTrigger>
          </TabsList>

          <TabsContent value="deposits">
            <Card className="bg-muted/50 border-border">
              <CardHeader>
                <CardTitle>Deposit Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deposits.map((deposit) => (
                    <div
                      key={deposit.id}
                      className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
                    >
                      <div>
                        <div className="font-medium">${deposit.amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {deposit.crypto_type.toUpperCase()} • {new Date(deposit.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Wallet: {deposit.wallet_address}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={deposit.status === 'approved' ? 'secondary' : deposit.status === 'rejected' ? 'destructive' : 'outline'}>
                          {deposit.status}
                        </Badge>
                        {deposit.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproveDeposit(deposit.id)}
                              className="bg-crypto-green hover:bg-crypto-green/90"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectDeposit(deposit.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card className="bg-muted/50 border-border">
              <CardHeader>
                <CardTitle>Withdrawal Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {withdrawals.map((withdrawal) => (
                    <div
                      key={withdrawal.id}
                      className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
                    >
                      <div>
                        <div className="font-medium">${withdrawal.amount.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {withdrawal.crypto_type.toUpperCase()} • {new Date(withdrawal.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Wallet: {withdrawal.wallet_address}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={withdrawal.status === 'approved' ? 'secondary' : withdrawal.status === 'rejected' ? 'destructive' : 'outline'}>
                          {withdrawal.status}
                        </Badge>
                        {withdrawal.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApproveWithdrawal(withdrawal.id)}
                              className="bg-crypto-green hover:bg-crypto-green/90"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectWithdrawal(withdrawal.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="bg-muted/50 border-border">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">User management features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signals">
            <Card className="bg-muted/50 border-border">
              <CardHeader>
                <CardTitle>Trading Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Signal management features coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;