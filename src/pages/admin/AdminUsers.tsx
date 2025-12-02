import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, UserCheck, UserX, Eye, Shield, StopCircle, Trash2 } from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  net_balance: number;
  total_invested: number;
  interest_earned: number;
  created_at: string;
  is_frozen?: boolean;
  role?: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch user profiles with roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          net_balance,
          total_invested,
          interest_earned,
          created_at,
          is_frozen
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Merge profiles with roles  
      const usersWithRoles = profilesData ? profilesData.map(profile => ({
        ...profile,
        role: rolesData?.find(role => role.user_id === profile.id)?.role || 'user'
      })) : [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserFreeze = async (userId: string, currentFrozenState: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_frozen: !currentFrozenState } as any)
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${!currentFrozenState ? 'frozen' : 'unfrozen'} successfully`
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const stopUserTrading = async (userId: string, username: string) => {
    try {
      const { data: activeTrades, error: fetchError } = await supabase
        .from('trades')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (fetchError) throw fetchError;

      if (!activeTrades || activeTrades.length === 0) {
        toast({
          title: "No Active Trades",
          description: `${username || 'User'} has no active trades to stop`,
        });
        return;
      }

      const { error } = await supabase
        .from('trades')
        .update({ status: 'stopped' })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;

      toast({
        title: "Trading Stopped",
        description: `Stopped ${activeTrades.length} active trade(s) for ${username || 'user'}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string, username: string) => {
    try {
      // Delete in order to respect foreign key constraints
      // 1. Delete trades
      await supabase.from('trades').delete().eq('user_id', userId);
      
      // 2. Delete purchased signals
      await supabase.from('purchased_signals').delete().eq('user_id', userId);
      
      // 3. Delete transactions
      await supabase.from('transactions').delete().eq('user_id', userId);
      
      // 4. Delete deposits
      await supabase.from('deposits').delete().eq('user_id', userId);
      
      // 5. Delete withdrawals
      await supabase.from('withdrawals').delete().eq('user_id', userId);
      
      // 6. Delete user trading engines
      await supabase.from('user_trading_engines').delete().eq('user_id', userId);
      
      // 7. Delete user roles
      await supabase.from('user_roles').delete().eq('user_id', userId);
      
      // 8. Delete profile (this is the main user data in public schema)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      toast({
        title: "User Deleted",
        description: `Successfully deleted ${username || 'user'} and all associated data`,
      });

      // Refresh the user list
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      day: 'numeric'
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
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">User Management</h2>
        <p className="text-sm text-muted-foreground">Manage user accounts and permissions</p>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Total: {users.length}</span>
          <span>Active: {users.filter(u => !u.is_frozen).length}</span>
          <span>Frozen: {users.filter(u => u.is_frozen).length}</span>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Users ({filteredUsers.length})</CardTitle>
          <CardDescription className="text-sm">Manage user accounts and access controls</CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">User</TableHead>
                    <TableHead className="whitespace-nowrap">Role</TableHead>
                    <TableHead className="whitespace-nowrap">Balance</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">Invested</TableHead>
                    <TableHead className="whitespace-nowrap hidden md:table-cell">Earnings</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap hidden lg:table-cell">Joined</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{user.username || 'No username'}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.id.substring(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCurrency(user.net_balance)}
                      </TableCell>
                      <TableCell className="font-mono text-sm hidden sm:table-cell">
                        {formatCurrency(user.total_invested)}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-green-600 hidden md:table-cell">
                        {formatCurrency(user.interest_earned)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_frozen ? 'destructive' : 'default'} className="text-xs whitespace-nowrap">
                          {user.is_frozen ? 'Frozen' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm hidden lg:table-cell">{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedUser(user)}
                            className="h-8 w-8 p-0"
                            title="View Details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => stopUserTrading(user.id, user.username)}
                            className="h-8 w-8 p-0 bg-orange-500/20 hover:bg-orange-500/30 text-orange-500"
                            title="Stop Trading"
                          >
                            <StopCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={user.is_frozen ? "default" : "destructive"}
                            onClick={() => toggleUserFreeze(user.id, user.is_frozen || false)}
                            className="h-8 w-8 p-0"
                            title={user.is_frozen ? "Unfreeze User" : "Freeze User"}
                          >
                            {user.is_frozen ? (
                              <UserCheck className="h-3 w-3" />
                            ) : (
                              <UserX className="h-3 w-3" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 w-8 p-0"
                                title="Delete User"
                                disabled={user.role === 'admin'}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{user.username || 'this user'}</strong>? 
                                  This will permanently remove all their data including trades, transactions, 
                                  deposits, and withdrawals. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser(user.id, user.username)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchTerm ? 'No users found matching your search.' : 'No users found.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Details Modal */}
      {selectedUser && (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg sm:text-xl">User Details: {selectedUser.username || 'No username'}</CardTitle>
                <CardDescription className="text-sm">Detailed information and account history</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedUser(null)}
                className="w-fit"
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">User ID</label>
                <div className="font-mono text-xs sm:text-sm break-all">{selectedUser.id}</div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Username</label>
                <div className="text-sm">{selectedUser.username || 'Not set'}</div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Role</label>
                <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                  {selectedUser.role}
                </Badge>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant={selectedUser.is_frozen ? 'destructive' : 'default'} className="text-xs">
                  {selectedUser.is_frozen ? 'Frozen' : 'Active'}
                </Badge>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Net Balance</label>
                <div className="font-mono text-sm">{formatCurrency(selectedUser.net_balance)}</div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Total Invested</label>
                <div className="font-mono text-sm">{formatCurrency(selectedUser.total_invested)}</div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Interest Earned</label>
                <div className="font-mono text-sm text-green-600">{formatCurrency(selectedUser.interest_earned)}</div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">Joined Date</label>
                <div className="text-sm">{formatDate(selectedUser.created_at)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}