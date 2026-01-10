import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, DollarSign, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface UserProfile {
  id: string;
  username: string;
  btc_balance: number;
  eth_balance: number;
  usdt_balance: number;
  interest_earned: number;
  commissions: number;
  net_balance: number;
}

const BALANCE_TYPES = [
  { value: 'btc_balance', label: 'Bitcoin (BTC)', icon: '₿' },
  { value: 'eth_balance', label: 'Ethereum (ETH)', icon: 'Ξ' },
  { value: 'usdt_balance', label: 'Tether (USDT)', icon: '₮' },
  { value: 'interest_earned', label: 'Interest Earned', icon: '💰' },
  { value: 'commissions', label: 'Commissions', icon: '🎁' },
];

export default function AdminBalanceAdjust() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [balanceType, setBalanceType] = useState("");
  const [action, setAction] = useState<"increase" | "decrease">("increase");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm.length > 0) {
      const filtered = users.filter(u =>
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
      setShowDropdown(true);
    } else {
      setFilteredUsers([]);
      setShowDropdown(false);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, btc_balance, eth_balance, usdt_balance, interest_earned, commissions, net_balance')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
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

  const selectUser = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setSearchTerm(userProfile.username || userProfile.id.substring(0, 8));
    setShowDropdown(false);
  };

  const refreshSelectedUser = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, btc_balance, eth_balance, usdt_balance, interest_earned, commissions, net_balance')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setSelectedUser(data);
      setUsers(prev => prev.map(u => u.id === userId ? data : u));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      toast({ title: "Error", description: "Please select a user", variant: "destructive" });
      return;
    }
    if (!balanceType) {
      toast({ title: "Error", description: "Please select a balance type", variant: "destructive" });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Error", description: "Amount must be greater than 0", variant: "destructive" });
      return;
    }
    if (!reason.trim()) {
      toast({ title: "Error", description: "Reason is required", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);

      const { data, error } = await supabase.rpc('admin_adjust_user_balance', {
        p_admin_id: user?.id,
        p_user_id: selectedUser.id,
        p_balance_type: balanceType,
        p_action: action,
        p_amount: parseFloat(amount),
        p_reason: reason.trim()
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; message?: string };

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error || "Failed to adjust balance",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: result.message || "Balance adjusted successfully"
      });

      // Refresh the selected user's data
      await refreshSelectedUser(selectedUser.id);

      // Reset form
      setAmount("");
      setReason("");
    } catch (error: any) {
      console.error('Error adjusting balance:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to adjust balance",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  const getCurrentBalance = () => {
    if (!selectedUser || !balanceType) return null;
    return selectedUser[balanceType as keyof UserProfile] as number;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 sm:p-0">
      <div>
        <h2 className="text-2xl font-bold">Adjust User Balance</h2>
        <p className="text-muted-foreground">Increase or decrease user balances with full audit logging</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Adjustment Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Balance Adjustment
            </CardTitle>
            <CardDescription>
              All adjustments are logged and visible in transaction history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Search */}
              <div className="space-y-2 relative">
                <Label htmlFor="user-search">Select User</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="user-search"
                    placeholder="Search by username or user ID..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (!e.target.value) setSelectedUser(null);
                    }}
                    onFocus={() => searchTerm && setShowDropdown(true)}
                    className="pl-9"
                  />
                </div>
                {showDropdown && filteredUsers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => selectUser(u)}
                        className="w-full px-4 py-2 text-left hover:bg-accent flex justify-between items-center"
                      >
                        <span className="font-medium">{u.username || 'No username'}</span>
                        <span className="text-xs text-muted-foreground">{u.id.substring(0, 8)}...</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Balance Type */}
              <div className="space-y-2">
                <Label>Balance Type</Label>
                <Select value={balanceType} onValueChange={setBalanceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select balance type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BALANCE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Type */}
              <div className="space-y-2">
                <Label>Action</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={action === "increase" ? "default" : "outline"}
                    onClick={() => setAction("increase")}
                    className="flex-1"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Increase
                  </Button>
                  <Button
                    type="button"
                    variant={action === "decrease" ? "destructive" : "outline"}
                    onClick={() => setAction("decrease")}
                    className="flex-1"
                  >
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Decrease
                  </Button>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-7"
                  />
                </div>
                {selectedUser && balanceType && (
                  <p className="text-sm text-muted-foreground">
                    Current {BALANCE_TYPES.find(t => t.value === balanceType)?.label}: {formatCurrency(getCurrentBalance() || 0)}
                  </p>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Required)</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter a detailed reason for this adjustment..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This reason will appear in the user's transaction history
                </p>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={submitting || !selectedUser || !balanceType || !amount || !reason.trim()}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {action === "increase" ? <TrendingUp className="h-4 w-4 mr-2" /> : <TrendingDown className="h-4 w-4 mr-2" />}
                    {action === "increase" ? "Add" : "Deduct"} {amount ? `$${parseFloat(amount).toFixed(2)}` : "Amount"}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Selected User Info */}
        {selectedUser && (
          <Card>
            <CardHeader>
              <CardTitle>User Balances</CardTitle>
              <CardDescription>
                {selectedUser.username || 'No username'} ({selectedUser.id.substring(0, 8)}...)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {BALANCE_TYPES.map((type) => {
                  const value = selectedUser[type.value as keyof UserProfile] as number;
                  const isSelected = balanceType === type.value;
                  return (
                    <div
                      key={type.value}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{type.icon}</span>
                        <span className="font-medium">{type.label}</span>
                      </div>
                      <span className="font-mono text-lg">{formatCurrency(value)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Net Balance</span>
                  <span className="font-mono text-xl font-bold text-primary">
                    {formatCurrency(selectedUser.net_balance)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
