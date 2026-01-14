import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Trade {
  id: string;
  trade_type: string;
  trade_direction: string | null;
  trading_pair: string | null;
  initial_amount: number;
  current_profit: number;
  status: string;
  started_at: string;
  last_updated: string;
  entry_price: number | null;
  current_price: number | null;
  signal_id: string;
  signal?: {
    name: string;
  };
}

const DashboardTradeHistory = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTrades: 0,
    totalProfit: 0,
    totalLoss: 0,
    winRate: 0,
  });

  useEffect(() => {
    if (user) {
      fetchTrades();
    }
  }, [user]);

  const fetchTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select(`
          *,
          signal:signals(name)
        `)
        .eq('user_id', user?.id)
        .in('status', ['stopped', 'liquidated'])
        .order('last_updated', { ascending: false });

      if (error) throw error;

      const tradesData = data || [];
      setTrades(tradesData);

      // Calculate stats
      const totalProfit = tradesData
        .filter(t => t.current_profit > 0)
        .reduce((sum, t) => sum + t.current_profit, 0);
      const totalLoss = tradesData
        .filter(t => t.current_profit < 0)
        .reduce((sum, t) => sum + Math.abs(t.current_profit), 0);
      const winningTrades = tradesData.filter(t => t.current_profit > 0).length;

      setStats({
        totalTrades: tradesData.length,
        totalProfit,
        totalLoss,
        winRate: tradesData.length > 0 ? (winningTrades / tradesData.length) * 100 : 0,
      });
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Trade History</h1>
          <p className="text-muted-foreground">View all your completed trades</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-xl font-bold">{stats.totalTrades}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Profit</p>
                  <p className="text-xl font-bold text-green-500">{formatCurrency(stats.totalProfit)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-500/10">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Loss</p>
                  <p className="text-xl font-bold text-red-500">{formatCurrency(stats.totalLoss)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-xl font-bold">{stats.winRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trades Table */}
        <Card>
          <CardHeader>
            <CardTitle>Completed Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading trades...</div>
            ) : trades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No completed trades yet. Start trading to see your history here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead className="text-right">Entry</TableHead>
                      <TableHead className="text-right">Exit</TableHead>
                      <TableHead className="text-right">P/L</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade) => {
                      // Calculate trade duration
                      const startDate = new Date(trade.started_at);
                      const endDate = new Date(trade.last_updated);
                      const durationMs = endDate.getTime() - startDate.getTime();
                      const hours = Math.floor(durationMs / (1000 * 60 * 60));
                      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                      const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                      
                      return (
                        <TableRow key={trade.id}>
                          <TableCell className="font-medium">
                            {trade.trading_pair || trade.signal?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={
                                (trade.trade_direction || trade.trade_type) === 'buy' 
                                  ? 'border-green-500 text-green-500' 
                                  : 'border-red-500 text-red-500'
                              }
                            >
                              {(trade.trade_direction || trade.trade_type || 'buy').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(trade.initial_amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {trade.entry_price ? `$${trade.entry_price.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {trade.current_price ? `$${trade.current_price.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            <span className={trade.current_profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                              {trade.current_profit >= 0 ? '+' : ''}{formatCurrency(trade.current_profit)}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {durationStr}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={trade.status === 'liquidated' ? 'destructive' : 'secondary'}
                            >
                              {trade.status === 'liquidated' ? 'Liquidated' : 'Closed'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DashboardTradeHistory;
