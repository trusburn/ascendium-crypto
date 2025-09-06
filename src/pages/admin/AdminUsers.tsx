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
import { Search, UserCheck, UserX, Eye, Shield } from "lucide-react";

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">User Management</h2>
        <p className="text-muted-foreground">Manage user accounts and permissions</p>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Total Users: {users.length}</span>
          <span>Active: {users.filter(u => !u.is_frozen).length}</span>
          <span>Frozen: {users.filter(u => u.is_frozen).length}</span>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>Manage user accounts and access controls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Invested</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.username || 'No username'}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.id.substring(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(user.net_balance)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(user.total_invested)}
                    </TableCell>
                    <TableCell className="font-mono text-green-600">
                      {formatCurrency(user.interest_earned)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_frozen ? 'destructive' : 'default'}>
                        {user.is_frozen ? 'Frozen' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={user.is_frozen ? "default" : "destructive"}
                          onClick={() => toggleUserFreeze(user.id, user.is_frozen || false)}
                        >
                          {user.is_frozen ? (
                            <UserCheck className="h-3 w-3" />
                          ) : (
                            <UserX className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No users found matching your search.' : 'No users found.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Details Modal */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>User Details: {selectedUser.username || 'No username'}</CardTitle>
            <CardDescription>Detailed information and account history</CardDescription>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedUser(null)}
              className="w-fit"
            >
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">User ID</label>
                <div className="font-mono text-sm">{selectedUser.id}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Username</label>
                <div>{selectedUser.username || 'Not set'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}>
                  {selectedUser.role}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant={selectedUser.is_frozen ? 'destructive' : 'default'}>
                  {selectedUser.is_frozen ? 'Frozen' : 'Active'}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Net Balance</label>
                <div className="font-mono">{formatCurrency(selectedUser.net_balance)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Invested</label>
                <div className="font-mono">{formatCurrency(selectedUser.total_invested)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Interest Earned</label>
                <div className="font-mono text-green-600">{formatCurrency(selectedUser.interest_earned)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Joined Date</label>
                <div>{formatDate(selectedUser.created_at)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}