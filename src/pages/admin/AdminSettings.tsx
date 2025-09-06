import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Database, 
  Shield, 
  Bell, 
  Globe, 
  Save,
  RefreshCw
} from "lucide-react";

interface SystemSettings {
  maintenance_mode: boolean;
  registration_enabled: boolean;
  minimum_deposit: number;
  minimum_withdrawal: number;
  max_daily_withdrawal: number;
  platform_fee_percentage: number;
  notification_email: string;
  auto_approve_deposits: boolean;
  auto_approve_withdrawals: boolean;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    maintenance_mode: false,
    registration_enabled: true,
    minimum_deposit: 10,
    minimum_withdrawal: 5,
    max_daily_withdrawal: 10000,
    platform_fee_percentage: 2.5,
    notification_email: "",
    auto_approve_deposits: false,
    auto_approve_withdrawals: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Fetch settings from admin_settings table
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value');

      if (error) {
        console.error('Error fetching settings:', error);
        // Don't throw error, use defaults instead
        return;
      }

      const settingsObject: any = {};
      
      data?.forEach(setting => {
        settingsObject[setting.key] = setting.value;
      });

      // Merge with defaults
      setSettings(prevSettings => ({
        ...prevSettings,
        ...settingsObject
      }));

    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Convert settings object to key-value pairs for storage
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value as any, // Cast to handle Json type
        updated_at: new Date().toISOString()
      }));

      // Upsert each setting
      for (const setting of settingsArray) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert(setting, { onConflict: 'key' });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Settings saved successfully"
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const syncTradingProfits = async () => {
    try {
      const { error } = await supabase.rpc('sync_trading_profits');
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "Trading profits synchronized successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
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
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">System Settings</h2>
          <p className="text-muted-foreground">Configure platform settings and parameters</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            System Status
          </CardTitle>
          <CardDescription>Control platform availability and access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Maintenance Mode</Label>
              <p className="text-xs text-muted-foreground">Temporarily disable platform access</p>
            </div>
            <Switch
              checked={settings.maintenance_mode}
              onCheckedChange={(checked) => updateSetting('maintenance_mode', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">User Registration</Label>
              <p className="text-xs text-muted-foreground">Allow new user signups</p>
            </div>
            <Switch
              checked={settings.registration_enabled}
              onCheckedChange={(checked) => updateSetting('registration_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Financial Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Financial Parameters
          </CardTitle>
          <CardDescription>Configure transaction limits and fees</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Deposit ($)</Label>
              <Input
                type="number"
                value={settings.minimum_deposit}
                onChange={(e) => updateSetting('minimum_deposit', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum Withdrawal ($)</Label>
              <Input
                type="number"
                value={settings.minimum_withdrawal}
                onChange={(e) => updateSetting('minimum_withdrawal', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Daily Withdrawal ($)</Label>
              <Input
                type="number"
                value={settings.max_daily_withdrawal}
                onChange={(e) => updateSetting('max_daily_withdrawal', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Platform Fee (%)</Label>
              <Input
                type="number"
                value={settings.platform_fee_percentage}
                onChange={(e) => updateSetting('platform_fee_percentage', parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Automation & Approval
          </CardTitle>
          <CardDescription>Configure automatic approval settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-Approve Deposits</Label>
              <p className="text-xs text-muted-foreground">Automatically approve deposit requests</p>
            </div>
            <Switch
              checked={settings.auto_approve_deposits}
              onCheckedChange={(checked) => updateSetting('auto_approve_deposits', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-Approve Withdrawals</Label>
              <p className="text-xs text-muted-foreground">Automatically approve withdrawal requests</p>
            </div>
            <Switch
              checked={settings.auto_approve_withdrawals}
              onCheckedChange={(checked) => updateSetting('auto_approve_withdrawals', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>Configure system notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Notification Email</Label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={settings.notification_email}
              onChange={(e) => updateSetting('notification_email', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Receive notifications for important system events
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            System Actions
          </CardTitle>
          <CardDescription>Perform system maintenance tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={syncTradingProfits}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Sync Trading Profits
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Status Overview */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">Current Status</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-medium">Platform Status</div>
              <Badge variant={settings.maintenance_mode ? "destructive" : "default"}>
                {settings.maintenance_mode ? "Maintenance" : "Operational"}
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium">Registration</div>
              <Badge variant={settings.registration_enabled ? "default" : "secondary"}>
                {settings.registration_enabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium">Min Deposit</div>
              <div className="font-mono">${settings.minimum_deposit}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Platform Fee</div>
              <div className="font-mono">{settings.platform_fee_percentage}%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}