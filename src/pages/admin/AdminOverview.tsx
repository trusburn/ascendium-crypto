import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, TrendingDown, AlertCircle, DollarSign } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  totalDepositAmount: number;
  totalWithdrawalAmount: number;
  recentActivity: Array<{
    type: string;
    amount?: number;
    status: string;
    created_at: string;
  }>;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalDepositAmount: 0,
    totalWithdrawalAmount: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch all stats in parallel
      const [
        { data: depositsData },
        { data: withdrawalsData },
        { data: usersData }
      ] = await Promise.all([
        supabase.from('deposits').select('amount, status, created_at'),
        supabase.from('withdrawals').select('amount, status, created_at'),
        supabase.from('profiles').select('id')
      ]);

      // Calculate deposit stats
      const totalDeposits = depositsData?.length || 0;
      const pendingDeposits = depositsData?.filter(d => d.status === 'pending').length || 0;
      const totalDepositAmount = depositsData?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;

      // Calculate withdrawal stats
      const totalWithdrawals = withdrawalsData?.length || 0;
      const pendingWithdrawals = withdrawalsData?.filter(w => w.status === 'pending').length || 0;
      const totalWithdrawalAmount = withdrawalsData?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;

      // Recent activity (last 10 items)
      const recentDeposits = depositsData?.slice(0, 5).map(d => ({
        type: 'deposit',
        amount: d.amount,
        status: d.status,
        created_at: d.created_at
      })) || [];

      const recentWithdrawals = withdrawalsData?.slice(0, 5).map(w => ({
        type: 'withdrawal',
        amount: w.amount,
        status: w.status,
        created_at: w.created_at
      })) || [];

      const recentActivity = [...recentDeposits, ...recentWithdrawals]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setStats({
        totalUsers: usersData?.length || 0,
        totalDeposits,
        totalWithdrawals,
        pendingDeposits,
        pendingWithdrawals,
        totalDepositAmount,
        totalWithdrawalAmount,
        recentActivity
      });

    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System Overview</h2>
        <p className="text-muted-foreground">Monitor key metrics and recent activity</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalDepositAmount)}</div>
            <p className="text-xs text-muted-foreground">{stats.totalDeposits} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalWithdrawalAmount)}</div>
            <p className="text-xs text-muted-foreground">{stats.totalWithdrawals} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDeposits + stats.pendingWithdrawals}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingDeposits} deposits, {stats.pendingWithdrawals} withdrawals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest transactions and user actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {activity.type === 'deposit' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <div className="font-medium capitalize">{activity.type}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(activity.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-medium">{formatCurrency(activity.amount || 0)}</div>
                  <Badge 
                    variant={
                      activity.status === 'approved' ? 'default' : 
                      activity.status === 'pending' ? 'secondary' : 
                      'destructive'
                    }
                  >
                    {activity.status}
                  </Badge>
                </div>
              </div>
            ))}
            {stats.recentActivity.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}