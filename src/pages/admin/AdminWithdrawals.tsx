import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Check, X, TrendingDown } from "lucide-react";

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  crypto_type: string;
  wallet_address: string;
  status: string;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

export default function AdminWithdrawals() {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch withdrawals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveWithdrawal = async (withdrawalId: string) => {
    try {
      // First get the withdrawal details
      const { data: withdrawal, error: fetchError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('id', withdrawalId)
        .single();

      if (fetchError) throw fetchError;

      // Check if user has sufficient balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('net_balance')
        .eq('id', withdrawal.user_id)
        .single();

      if (!profile || profile.net_balance < withdrawal.amount) {
        throw new Error('Insufficient balance for withdrawal');
      }

      // Update withdrawal status
      const { error: updateError } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      if (updateError) throw updateError;

      // Deduct the amount from user's net_balance
      const newBalance = profile.net_balance - withdrawal.amount;
      
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ net_balance: newBalance })
        .eq('id', withdrawal.user_id);

      if (profileUpdateError) throw profileUpdateError;

      toast({
        title: "Success",
        description: `Withdrawal of $${withdrawal.amount} approved and deducted from user balance`
      });

      fetchWithdrawals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRejectWithdrawal = async (withdrawalId: string) => {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Withdrawal rejected"
      });

      fetchWithdrawals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    const matchesSearch = 
      withdrawal.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.crypto_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || withdrawal.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const totalAmount = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Withdrawal Management</h2>
          <p className="text-muted-foreground">Review and process withdrawal requests</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Pending Actions</div>
          <div className="text-2xl font-bold text-orange-500">{pendingCount}</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">{withdrawals.length} transactions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {withdrawals.filter(w => 
                w.status === 'approved' && 
                new Date(w.approved_at || '').toDateString() === new Date().toDateString()
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">Today's approvals</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by user ID, wallet, or crypto type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map(status => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== 'all' && (
                <Badge variant="secondary" className="ml-2">
                  {withdrawals.filter(w => w.status === status).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Withdrawals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawals ({filteredWithdrawals.length})</CardTitle>
          <CardDescription>Manage withdrawal requests and approvals</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">User ID</TableHead>
                  <TableHead className="whitespace-nowrap">Amount</TableHead>
                  <TableHead className="whitespace-nowrap">Crypto Type</TableHead>
                  <TableHead className="whitespace-nowrap">Wallet Address</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Created</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWithdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="font-mono text-sm">
                      {withdrawal.user_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono font-bold">
                      {formatCurrency(withdrawal.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{withdrawal.crypto_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-32 truncate">
                      {withdrawal.wallet_address}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(withdrawal.status)}>
                        {withdrawal.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(withdrawal.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {withdrawal.status === 'pending' && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApproveWithdrawal(withdrawal.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectWithdrawal(withdrawal.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {withdrawal.status !== 'pending' && (
                        <span className="text-xs text-muted-foreground">
                          {withdrawal.approved_at && formatDate(withdrawal.approved_at)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredWithdrawals.length === 0 && (
            <div className="text-center py-8 text-muted-foreground px-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'No withdrawals found matching your criteria.' 
                : 'No withdrawals found.'
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}