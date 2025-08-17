import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Smartphone, 
  Mail, 
  DollarSign, 
  Clock,
  Download,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const DashboardSettings = () => {
  const [notifications, setNotifications] = useState({
    emailDeposits: true,
    emailWithdrawals: true,
    emailSignals: true,
    emailProfit: true,
    pushDeposits: true,
    pushWithdrawals: true,
    pushSignals: false,
    pushProfit: true,
    smsEnabled: false,
    smsImportant: true
  });

  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    loginAlerts: true,
    sessionTimeout: '30',
    apiAccess: false,
    ipWhitelist: ''
  });

  const [preferences, setPreferences] = useState({
    theme: 'dark',
    language: 'en',
    currency: 'USD',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    defaultView: 'dashboard'
  });

  const [trading, setTrading] = useState({
    autoInvest: false,
    autoInvestAmount: '100',
    riskLevel: 'medium',
    profitReinvest: true,
    stopLoss: true,
    stopLossPercent: '10'
  });

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Settings Updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const handleSecurityChange = (key: string, value: boolean | string) => {
    setSecurity(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Security Updated",
      description: "Your security settings have been saved.",
    });
  };

  const handlePreferenceChange = (key: string, value: string) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Preferences Updated",
      description: "Your preferences have been saved.",
    });
  };

  const handleTradingChange = (key: string, value: boolean | string) => {
    setTrading(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Trading Settings Updated",
      description: "Your trading preferences have been saved.",
    });
  };

  const exportData = () => {
    toast({
      title: "Data Export",
      description: "Your data export has been initiated. You will receive an email when ready.",
    });
  };

  const deleteAccount = () => {
    toast({
      title: "Account Deletion",
      description: "Please contact support to delete your account.",
      variant: "destructive",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Deposit Confirmations</Label>
                    <p className="text-sm text-muted-foreground">Get notified when your deposits are processed</p>
                  </div>
                  <Switch
                    checked={notifications.emailDeposits}
                    onCheckedChange={(checked) => handleNotificationChange('emailDeposits', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Withdrawal Updates</Label>
                    <p className="text-sm text-muted-foreground">Receive updates on your withdrawal requests</p>
                  </div>
                  <Switch
                    checked={notifications.emailWithdrawals}
                    onCheckedChange={(checked) => handleNotificationChange('emailWithdrawals', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Trading Signals</Label>
                    <p className="text-sm text-muted-foreground">Get notified about new trading signals</p>
                  </div>
                  <Switch
                    checked={notifications.emailSignals}
                    onCheckedChange={(checked) => handleNotificationChange('emailSignals', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Profit Reports</Label>
                    <p className="text-sm text-muted-foreground">Weekly profit and performance reports</p>
                  </div>
                  <Switch
                    checked={notifications.emailProfit}
                    onCheckedChange={(checked) => handleNotificationChange('emailProfit', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Push Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Deposit Alerts</Label>
                    <p className="text-sm text-muted-foreground">Instant push notifications for deposits</p>
                  </div>
                  <Switch
                    checked={notifications.pushDeposits}
                    onCheckedChange={(checked) => handleNotificationChange('pushDeposits', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Withdrawal Alerts</Label>
                    <p className="text-sm text-muted-foreground">Instant push notifications for withdrawals</p>
                  </div>
                  <Switch
                    checked={notifications.pushWithdrawals}
                    onCheckedChange={(checked) => handleNotificationChange('pushWithdrawals', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Signal Alerts</Label>
                    <p className="text-sm text-muted-foreground">Push notifications for new signals</p>
                  </div>
                  <Switch
                    checked={notifications.pushSignals}
                    onCheckedChange={(checked) => handleNotificationChange('pushSignals', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={security.twoFactorEnabled}
                      onCheckedChange={(checked) => handleSecurityChange('twoFactorEnabled', checked)}
                    />
                    <Button variant="outline" size="sm">Setup</Button>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Login Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified of new login attempts</p>
                  </div>
                  <Switch
                    checked={security.loginAlerts}
                    onCheckedChange={(checked) => handleSecurityChange('loginAlerts', checked)}
                  />
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Session Timeout (minutes)</Label>
                    <Select value={security.sessionTimeout} onValueChange={(value) => handleSecurityChange('sessionTimeout', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>API Access</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={security.apiAccess}
                        onCheckedChange={(checked) => handleSecurityChange('apiAccess', checked)}
                      />
                      <Button variant="outline" size="sm" disabled={!security.apiAccess}>
                        Manage Keys
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance & Localization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select value={preferences.theme} onValueChange={(value) => handlePreferenceChange('theme', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={preferences.language} onValueChange={(value) => handlePreferenceChange('language', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={preferences.currency} onValueChange={(value) => handlePreferenceChange('currency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="BTC">BTC - Bitcoin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={preferences.timezone} onValueChange={(value) => handlePreferenceChange('timezone', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="EST">EST - Eastern</SelectItem>
                        <SelectItem value="PST">PST - Pacific</SelectItem>
                        <SelectItem value="GMT">GMT - Greenwich</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trading */}
          <TabsContent value="trading" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Trading Automation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Investment</Label>
                    <p className="text-sm text-muted-foreground">Automatically invest in signals</p>
                  </div>
                  <Switch
                    checked={trading.autoInvest}
                    onCheckedChange={(checked) => handleTradingChange('autoInvest', checked)}
                  />
                </div>
                {trading.autoInvest && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Auto-Investment Amount ($)</Label>
                      <Input
                        value={trading.autoInvestAmount}
                        onChange={(e) => handleTradingChange('autoInvestAmount', e.target.value)}
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Risk Level</Label>
                      <Select value={trading.riskLevel} onValueChange={(value) => handleTradingChange('riskLevel', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low Risk</SelectItem>
                          <SelectItem value="medium">Medium Risk</SelectItem>
                          <SelectItem value="high">High Risk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Profit Reinvestment</Label>
                    <p className="text-sm text-muted-foreground">Automatically reinvest profits</p>
                  </div>
                  <Switch
                    checked={trading.profitReinvest}
                    onCheckedChange={(checked) => handleTradingChange('profitReinvest', checked)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Stop Loss</Label>
                    <p className="text-sm text-muted-foreground">Automatically sell to limit losses</p>
                  </div>
                  <Switch
                    checked={trading.stopLoss}
                    onCheckedChange={(checked) => handleTradingChange('stopLoss', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Data Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-medium mb-2">Export Account Data</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Download a copy of all your account data and transaction history
                  </p>
                  <Button onClick={exportData} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                  <h4 className="font-medium mb-2 text-destructive">Delete Account</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <Button onClick={deleteAccount} variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DashboardSettings;