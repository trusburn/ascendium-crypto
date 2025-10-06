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
import { Search, Check, X, TrendingUp } from "lucide-react";

interface Deposit {
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

export default function AdminDeposits() {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDeposits(data || []);
    } catch (error) {
      console.error('Error fetching deposits:', error);
      toast({
        title: "Error",
        description: "Failed to fetch deposits",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDeposit = async (depositId: string) => {
    try {
      // First get the deposit details
      const { data: deposit, error: fetchError } = await supabase
        .from('deposits')
        .select('*')
        .eq('id', depositId)
        .single();

      if (fetchError) throw fetchError;

      // Update deposit status
      const { error: updateError } = await supabase
        .from('deposits')
        .update({ 
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', depositId);

      if (updateError) throw updateError;

      // Credit the amount to user's base_balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('base_balance, net_balance')
        .eq('id', deposit.user_id)
        .single();

      const newBaseBalance = (profile?.base_balance || 0) + deposit.amount;
      const newNetBalance = (profile?.net_balance || 0) + deposit.amount;
      
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ 
          base_balance: newBaseBalance,
          net_balance: newNetBalance
        })
        .eq('id', deposit.user_id);

      if (profileUpdateError) throw profileUpdateError;

      toast({
        title: "Success",
        description: `Deposit of $${deposit.amount} approved and credited to user balance`
      });

      fetchDeposits();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRejectDeposit = async (depositId: string) => {
    try {
      const { error } = await supabase
        .from('deposits')
        .update({ 
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', depositId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Deposit rejected"
      });

      fetchDeposits();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredDeposits = deposits.filter(deposit => {
    const matchesSearch = 
      deposit.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.wallet_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.crypto_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || deposit.status === statusFilter;
    
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

  const pendingCount = deposits.filter(d => d.status === 'pending').length;
  const totalAmount = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);

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
          <h2 className="text-2xl font-bold">Deposit Management</h2>
          <p className="text-muted-foreground">Review and approve user deposits</p>
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
              <TrendingUp className="h-4 w-4" />
              Total Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">{deposits.length} transactions</p>
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
              {deposits.filter(d => 
                d.status === 'approved' && 
                new Date(d.approved_at || '').toDateString() === new Date().toDateString()
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
                  {deposits.filter(d => d.status === status).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Deposits Table */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Deposits ({filteredDeposits.length})</CardTitle>
          <CardDescription>Manage deposit requests and approvals</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile-optimized scroll container */}
          <div 
            className="overflow-x-scroll overflow-y-visible"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-x',
              width: '100%',
              maxWidth: '100vw',
              position: 'relative'
            }}
          >
            <Table style={{ minWidth: '1000px', width: '1000px' }}>
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
                  {filteredDeposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell className="font-mono text-sm">
                        {deposit.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-mono font-bold">
                        {formatCurrency(deposit.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{deposit.crypto_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-32 truncate">
                        {deposit.wallet_address}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(deposit.status)}>
                          {deposit.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(deposit.created_at)}
                      </TableCell>
                      <TableCell className="text-right" style={{ minWidth: '140px', paddingRight: '16px' }}>
                        {deposit.status === 'pending' && (
                          <div className="flex justify-end gap-2 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApproveDeposit(deposit.id)}
                              className="shrink-0 h-8 px-3"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              <span className="text-xs">Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectDeposit(deposit.id)}
                              className="shrink-0 h-8 px-3"
                            >
                              <X className="h-3 w-3 mr-1" />
                              <span className="text-xs">Reject</span>
                            </Button>
                          </div>
                        )}
                        {deposit.status !== 'pending' && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {deposit.approved_at && formatDate(deposit.approved_at)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            {/* Mobile scroll hint */}
            <div className="block sm:hidden text-center py-2 px-4 text-xs text-muted-foreground bg-muted/50 border-t sticky left-0 right-0">
              👉 Swipe left to see Approve/Reject buttons
            </div>
          </div>
          
          {filteredDeposits.length === 0 && (
            <div className="text-center py-8 text-muted-foreground px-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'No deposits found matching your criteria.' 
                : 'No deposits found.'
              }
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}