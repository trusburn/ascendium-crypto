import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown, Activity, Volume2, VolumeX, Users, Search } from 'lucide-react';

interface UserWithEngine {
  id: string;
  email: string;
  username: string | null;
  engine_type: 'default' | 'rising' | 'general';
}

interface UserTradingEngine {
  id: string;
  user_id: string;
  engine_type: string;
}

const AdminTradingEngine = () => {
  const [globalEngine, setGlobalEngine] = useState<'rising' | 'general'>('rising');
  const [users, setUsers] = useState<UserWithEngine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<AudioContext | null>(null);

  // Play switch sound
  const playSound = (isUp: boolean) => {
    if (!soundEnabled) return;
    
    try {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Rising sound for "rising" engine, falling sound for "general"
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(isUp ? 400 : 600, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(isUp ? 800 : 300, ctx.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  // Fetch global engine setting
  useEffect(() => {
    const fetchGlobalEngine = async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'global_trading_engine')
        .maybeSingle();

      if (!error && data?.value) {
        setGlobalEngine(data.value as 'rising' | 'general');
      }
    };

    fetchGlobalEngine();
  }, []);

  // Fetch users with their engine settings
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        // Get all users from profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username');

        if (profilesError) throw profilesError;

        // Get engine settings
        const { data: engines, error: enginesError } = await supabase
          .from('user_trading_engines')
          .select('*');

        if (enginesError) throw enginesError;

        // Merge data
        const usersWithEngines: UserWithEngine[] = (profiles || []).map(profile => {
          const engineSetting = (engines as UserTradingEngine[] | null)?.find(e => e.user_id === profile.id);
          
          return {
            id: profile.id,
            email: profile.username || profile.id.slice(0, 8) + '...',
            username: profile.username,
            engine_type: (engineSetting?.engine_type as 'default' | 'rising' | 'general') || 'default',
          };
        });

        setUsers(usersWithEngines);
      } catch (error) {
        console.error('Error fetching users:', error);
        // Fallback: just get profiles
        const { data: profiles } = await supabase.from('profiles').select('id, username');
        const { data: engines } = await supabase.from('user_trading_engines').select('*');
        
        const usersWithEngines: UserWithEngine[] = (profiles || []).map(profile => {
          const engineSetting = (engines as UserTradingEngine[] | null)?.find(e => e.user_id === profile.id);
          return {
            id: profile.id,
            email: profile.username || 'Unknown',
            username: profile.username,
            engine_type: (engineSetting?.engine_type as 'default' | 'rising' | 'general') || 'default',
          };
        });
        
        setUsers(usersWithEngines);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Handle global engine toggle
  const handleGlobalEngineToggle = async (checked: boolean) => {
    const newEngine = checked ? 'rising' : 'general';
    
    playSound(checked);
    
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          key: 'global_trading_engine',
          value: newEngine,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;

      setGlobalEngine(newEngine);
      toast({
        title: 'Trading Engine Updated',
        description: `Global engine set to ${newEngine === 'rising' ? 'Rising Only' : 'General (Up & Down)'}`,
      });
    } catch (error) {
      console.error('Error updating global engine:', error);
      toast({
        title: 'Error',
        description: 'Failed to update global engine',
        variant: 'destructive',
      });
    }
  };

  // Handle user engine change
  const handleUserEngineChange = async (userId: string, engineType: 'default' | 'rising' | 'general') => {
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('user_trading_engines')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('user_trading_engines')
          .update({ engine_type: engineType })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('user_trading_engines')
          .insert({ user_id: userId, engine_type: engineType });

        if (error) throw error;
      }

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, engine_type: engineType } : u
      ));

      toast({
        title: 'User Engine Updated',
        description: `Engine type set to ${engineType}`,
      });
    } catch (error) {
      console.error('Error updating user engine:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user engine',
        variant: 'destructive',
      });
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Trading Engine</h1>
        <p className="text-muted-foreground">Manage trading chart engines for all users</p>
      </div>

      {/* Global Engine Switch */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Global Trading Engine
          </CardTitle>
          <CardDescription>
            Set the default trading engine for all users. Users with "Default" setting will use this engine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-6 bg-background rounded-lg border">
            <div className="flex items-center gap-6">
              {/* General Engine Label */}
              <div className={`flex items-center gap-2 transition-opacity ${globalEngine === 'general' ? 'opacity-100' : 'opacity-50'}`}>
                <div className="flex items-center gap-1 text-amber-500">
                  <TrendingDown className="h-5 w-5" />
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">General Engine</p>
                  <p className="text-xs text-muted-foreground">Up & Down movement</p>
                </div>
              </div>

              {/* Switch */}
              <div className="relative">
                <Switch
                  checked={globalEngine === 'rising'}
                  onCheckedChange={handleGlobalEngineToggle}
                  className="scale-150 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-amber-500"
                />
              </div>

              {/* Rising Engine Label */}
              <div className={`flex items-center gap-2 transition-opacity ${globalEngine === 'rising' ? 'opacity-100' : 'opacity-50'}`}>
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Rising Engine</p>
                  <p className="text-xs text-muted-foreground">Only upward movement</p>
                </div>
              </div>
            </div>

            {/* Sound Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="ml-4"
            >
              {soundEnabled ? (
                <Volume2 className="h-5 w-5 text-primary" />
              ) : (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          </div>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={globalEngine === 'rising' ? 'default' : 'secondary'} className={globalEngine === 'rising' ? 'bg-green-500' : 'bg-amber-500'}>
                {globalEngine === 'rising' ? 'RISING' : 'GENERAL'}
              </Badge>
              <span className="text-sm text-muted-foreground">is currently active globally</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {globalEngine === 'rising' 
                ? 'All user profits will only increase over time. The chart shows upward movement only.'
                : 'User profits will fluctuate based on real market movements. The chart shows both gains and losses.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* User-specific Engine Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Engine Settings
          </CardTitle>
          <CardDescription>
            Override the global engine for specific users. "Default" will use the global setting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Current Engine</TableHead>
                    <TableHead>Effective Engine</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const effectiveEngine = user.engine_type === 'default' ? globalEngine : user.engine_type;
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.username || 'No username'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              user.engine_type === 'default' ? 'border-muted-foreground' :
                              user.engine_type === 'rising' ? 'border-green-500 text-green-500' :
                              'border-amber-500 text-amber-500'
                            }>
                              {user.engine_type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {effectiveEngine === 'rising' ? (
                                <>
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                  <span className="text-green-500">Rising</span>
                                </>
                              ) : (
                                <>
                                  <div className="flex">
                                    <TrendingDown className="h-4 w-4 text-amber-500" />
                                    <TrendingUp className="h-4 w-4 text-amber-500" />
                                  </div>
                                  <span className="text-amber-500">General</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Select
                              value={user.engine_type}
                              onValueChange={(value) => handleUserEngineChange(user.id, value as 'default' | 'rising' | 'general')}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">
                                  <span className="flex items-center gap-2">
                                    <Activity className="h-3 w-3" />
                                    Default
                                  </span>
                                </SelectItem>
                                <SelectItem value="rising">
                                  <span className="flex items-center gap-2">
                                    <TrendingUp className="h-3 w-3 text-green-500" />
                                    Rising
                                  </span>
                                </SelectItem>
                                <SelectItem value="general">
                                  <span className="flex items-center gap-2">
                                    <TrendingDown className="h-3 w-3 text-amber-500" />
                                    General
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTradingEngine;
