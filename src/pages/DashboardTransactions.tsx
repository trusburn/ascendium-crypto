import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowUpRight, ArrowDownLeft, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  status?: string;
  crypto_type?: string;
  wallet_address?: string;
}

const DashboardTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;

      try {
        // Fetch from all three sources
        const [transactionsRes, depositsRes, withdrawalsRes] = await Promise.all([
          supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id),
          supabase
            .from('deposits')
            .select('*')
            .eq('user_id', user.id),
          supabase
            .from('withdrawals')
            .select('*')
            .eq('user_id', user.id)
        ]);

        if (transactionsRes.error) {
          console.error('Error fetching transactions:', transactionsRes.error);
        }
        
        if (depositsRes.error) {
          console.error('Error fetching deposits:', depositsRes.error);
        }
        
        if (withdrawalsRes.error) {
          console.error('Error fetching withdrawals:', withdrawalsRes.error);
        }

        // Combine all transactions
        const allTransactions: Transaction[] = [];

        // Add regular transactions
        if (transactionsRes.data) {
          allTransactions.push(...transactionsRes.data.map(tx => ({
            id: tx.id,
            type: tx.type,
            amount: Number(tx.amount),
            description: tx.description || tx.type,
            created_at: tx.created_at,
            status: 'completed'
          })));
        }

        // Add deposits
        if (depositsRes.data) {
          allTransactions.push(...depositsRes.data.map(deposit => ({
            id: deposit.id,
            type: 'deposit',
            amount: Number(deposit.amount),
            description: `${deposit.crypto_type} Deposit`,
            created_at: deposit.created_at,
            status: deposit.status,
            crypto_type: deposit.crypto_type,
            wallet_address: deposit.wallet_address
          })));
        }

        // Add withdrawals
        if (withdrawalsRes.data) {
          allTransactions.push(...withdrawalsRes.data.map(withdrawal => ({
            id: withdrawal.id,
            type: 'withdrawal',
            amount: Number(withdrawal.amount),
            description: `${withdrawal.crypto_type} Withdrawal`,
            created_at: withdrawal.created_at,
            status: withdrawal.status,
            crypto_type: withdrawal.crypto_type,
            wallet_address: withdrawal.wallet_address
          })));
        }

        // Sort by date (newest first)
        allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setTransactions(allTransactions);
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "Failed to load transactions",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'deposit':
        return <ArrowUpRight className="h-4 w-4 text-crypto-green" />;
      case 'withdrawal':
        return <ArrowDownLeft className="h-4 w-4 text-destructive" />;
      case 'trade_closed':
        return <DollarSign className="h-4 w-4 text-crypto-gold" />;
      default:
        return <DollarSign className="h-4 w-4 text-crypto-blue" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'deposit':
        return <Badge className="bg-crypto-green/20 text-crypto-green border-crypto-green">Deposit</Badge>;
      case 'withdrawal':
        return <Badge variant="destructive">Withdrawal</Badge>;
      case 'trade_closed':
        return <Badge className="bg-crypto-gold/20 text-crypto-gold border-crypto-gold">Trade Closed</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="secondary" className="bg-orange-500/20 text-orange-500 border-orange-500">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-crypto-green/20 text-crypto-green border-crypto-green">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'completed':
        return <Badge className="bg-crypto-green/20 text-crypto-green border-crypto-green">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-crypto-blue"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">View your transaction history</p>
        </div>

        <Card className="bg-muted/50 border-border">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No transactions yet</h3>
                <p className="text-muted-foreground">Your transactions will appear here once you start trading</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-background rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-muted rounded-full">
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h4 className="font-medium">{transaction.description || transaction.type}</h4>
                          {getTransactionBadge(transaction.type)}
                          {getStatusBadge(transaction.status)}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>{new Date(transaction.created_at).toLocaleDateString()}</p>
                          {transaction.crypto_type && transaction.wallet_address && (
                            <p className="truncate max-w-xs">
                              {transaction.crypto_type} • {transaction.wallet_address.slice(0, 6)}...{transaction.wallet_address.slice(-4)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${
                        transaction.type.toLowerCase() === 'deposit' 
                          ? 'text-crypto-green' 
                          : transaction.type.toLowerCase() === 'withdrawal'
                          ? 'text-destructive'
                          : transaction.type.toLowerCase() === 'trade_closed'
                          ? (transaction.amount >= 0 ? 'text-crypto-green' : 'text-destructive')
                          : 'text-foreground'
                      }`}>
                        {transaction.type.toLowerCase() === 'deposit' ? '+' : 
                         transaction.type.toLowerCase() === 'withdrawal' ? '-' :
                         transaction.type.toLowerCase() === 'trade_closed' ? (transaction.amount >= 0 ? '+' : '') : ''}
                        ${Math.abs(transaction.amount).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardTransactions;