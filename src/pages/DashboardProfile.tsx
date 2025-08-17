import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Phone, 
  Edit, 
  Camera, 
  Save,
  Shield,
  Clock,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface ProfileData {
  id: string;
  username: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  net_balance: number;
  total_invested: number;
  interest_earned: number;
  commissions: number;
  account_status: string;
  kyc_status: string;
}

const DashboardProfile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    location: '',
    bio: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      const profileWithDefaults: ProfileData = {
        id: profile.id,
        username: profile.username || 'Anonymous User',
        email: user?.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        created_at: profile.created_at,
        net_balance: profile.net_balance || 0,
        total_invested: profile.total_invested || 0,
        interest_earned: profile.interest_earned || 0,
        commissions: profile.commissions || 0,
        account_status: 'Active',
        kyc_status: 'Pending'
      };

      setProfileData(profileWithDefaults);
      setFormData({
        username: profileWithDefaults.username,
        phone: profileWithDefaults.phone,
        location: profileWithDefaults.location,
        bio: profileWithDefaults.bio
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          phone: formData.phone,
          location: formData.location,
          bio: formData.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      setEditing(false);
      await fetchProfileData();
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAccountLevel = (totalInvested: number) => {
    if (totalInvested >= 100000) return { level: 'Diamond', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' };
    if (totalInvested >= 50000) return { level: 'Platinum', color: 'text-gray-400', bgColor: 'bg-gray-400/10' };
    if (totalInvested >= 25000) return { level: 'Gold', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' };
    if (totalInvested >= 10000) return { level: 'Silver', color: 'text-gray-300', bgColor: 'bg-gray-300/10' };
    return { level: 'Bronze', color: 'text-orange-600', bgColor: 'bg-orange-600/10' };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-crypto-blue"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profileData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const accountLevel = getAccountLevel(profileData.total_invested);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">Manage your account information and preferences</p>
          </div>
          <Button
            onClick={() => editing ? handleSave() : setEditing(true)}
            className="gap-2"
          >
            {editing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            {editing ? 'Save Changes' : 'Edit Profile'}
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Overview */}
          <div className="lg:col-span-1 space-y-6">
            {/* Avatar and Basic Info */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="relative inline-block mb-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profileData.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {getInitials(profileData.username)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <h2 className="text-xl font-semibold">{profileData.username}</h2>
                <p className="text-muted-foreground">{profileData.email}</p>
                
                <div className="flex justify-center gap-2 mt-4">
                  <Badge className={`${accountLevel.bgColor} ${accountLevel.color} border-0`}>
                    {accountLevel.level} Member
                  </Badge>
                  <Badge variant={profileData.account_status === 'Active' ? 'default' : 'secondary'}>
                    {profileData.account_status}
                  </Badge>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Joined
                    </span>
                    <span>{new Date(profileData.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      KYC Status
                    </span>
                    <Badge variant={profileData.kyc_status === 'Verified' ? 'default' : 'secondary'}>
                      {profileData.kyc_status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Wallet className="h-4 w-4" />
                    Net Balance
                  </span>
                  <span className="font-semibold">${profileData.net_balance.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4" />
                    Total Invested
                  </span>
                  <span className="font-semibold">${profileData.total_invested.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-crypto-green" />
                    Interest Earned
                  </span>
                  <span className="font-semibold text-crypto-green">
                    ${profileData.interest_earned.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    Commissions
                  </span>
                  <span className="font-semibold">${profileData.commissions.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                            disabled={!editing}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            value={profileData.email}
                            disabled
                            className="pl-10 bg-muted"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            disabled={!editing}
                            className="pl-10"
                            placeholder="Enter phone number"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData({...formData, location: e.target.value})}
                            disabled={!editing}
                            className="pl-10"
                            placeholder="Enter location"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        disabled={!editing}
                        className="w-full p-3 border border-border rounded-md bg-background disabled:bg-muted disabled:opacity-50 min-h-[100px] resize-none"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 border border-border rounded-lg">
                      <h4 className="font-medium mb-2">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Add an extra layer of security to your account
                      </p>
                      <Button variant="outline">Enable 2FA</Button>
                    </div>
                    
                    <div className="p-4 border border-border rounded-lg">
                      <h4 className="font-medium mb-2">Change Password</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Update your password regularly for better security
                      </p>
                      <Button variant="outline">Change Password</Button>
                    </div>
                    
                    <div className="p-4 border border-border rounded-lg">
                      <h4 className="font-medium mb-2">Login Sessions</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        View and manage your active login sessions
                      </p>
                      <Button variant="outline">View Sessions</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="preferences" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 border border-border rounded-lg">
                      <h4 className="font-medium mb-2">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Choose what notifications you want to receive
                      </p>
                      <Button variant="outline">Manage Notifications</Button>
                    </div>
                    
                    <div className="p-4 border border-border rounded-lg">
                      <h4 className="font-medium mb-2">Trading Preferences</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Customize your trading experience
                      </p>
                      <Button variant="outline">Configure Trading</Button>
                    </div>
                    
                    <div className="p-4 border border-border rounded-lg">
                      <h4 className="font-medium mb-2">Privacy Settings</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Control your data and privacy preferences
                      </p>
                      <Button variant="outline">Privacy Settings</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardProfile;