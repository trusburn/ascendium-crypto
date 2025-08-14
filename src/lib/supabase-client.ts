import { supabase } from '@/integrations/supabase/client';

// User Profile operations
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  return { data, error };
};

export const updateUserProfile = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  return { data, error };
};

// Transactions operations
export const getUserTransactions = async (userId: string) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

export const createTransaction = async (transaction: {
  user_id: string;
  type: string;
  amount: number;
  description?: string;
}) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert([transaction])
    .select()
    .single();
  
  return { data, error };
};

// Deposits operations
export const getUserDeposits = async (userId: string) => {
  const { data, error } = await supabase
    .from('deposits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

export const createDeposit = async (deposit: {
  user_id: string;
  amount: number;
  crypto_type: string;
  wallet_address: string;
}) => {
  const { data, error } = await supabase
    .from('deposits')
    .insert([deposit])
    .select()
    .single();
  
  return { data, error };
};

// Withdrawals operations
export const getUserWithdrawals = async (userId: string) => {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

export const createWithdrawal = async (withdrawal: {
  user_id: string;
  amount: number;
  crypto_type: string;
  wallet_address: string;
}) => {
  const { data, error } = await supabase
    .from('withdrawals')
    .insert([withdrawal])
    .select()
    .single();
  
  return { data, error };
};

// Signals operations
export const getAllSignals = async () => {
  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .order('profit_multiplier', { ascending: true });
  
  return { data, error };
};

// Example usage functions
export const exampleUsage = {
  // Get user profile
  getProfile: async (userId: string) => {
    const { data: profile, error } = await getUserProfile(userId);
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return profile;
  },

  // Update user balance (example)
  updateBalance: async (userId: string, newBalance: number) => {
    const { data, error } = await updateUserProfile(userId, { 
      net_balance: newBalance 
    });
    if (error) {
      console.error('Error updating balance:', error);
      return false;
    }
    return true;
  },

  // Create a new deposit
  makeDeposit: async (userId: string, amount: number, cryptoType: string, walletAddress: string) => {
    const { data, error } = await createDeposit({
      user_id: userId,
      amount,
      crypto_type: cryptoType,
      wallet_address: walletAddress
    });
    
    if (error) {
      console.error('Error creating deposit:', error);
      return null;
    }
    
    // Also create a transaction record
    await createTransaction({
      user_id: userId,
      type: 'deposit',
      amount,
      description: `${cryptoType} deposit to ${walletAddress}`
    });
    
    return data;
  },

  // Get all user financial data
  getUserDashboardData: async (userId: string) => {
    const [profile, transactions, deposits, withdrawals] = await Promise.all([
      getUserProfile(userId),
      getUserTransactions(userId),
      getUserDeposits(userId),
      getUserWithdrawals(userId)
    ]);

    return {
      profile: profile.data,
      transactions: transactions.data || [],
      deposits: deposits.data || [],
      withdrawals: withdrawals.data || [],
      errors: {
        profile: profile.error,
        transactions: transactions.error,
        deposits: deposits.error,
        withdrawals: withdrawals.error
      }
    };
  }
};