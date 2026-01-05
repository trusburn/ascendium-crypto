import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Send, Users, User, AlertCircle, CheckCircle, Settings, Loader2 } from 'lucide-react';

interface UserOption {
  id: string;
  email: string;
  username: string | null;
}

export default function AdminEmail() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  
  // Email settings
  const [adminEmail, setAdminEmail] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Email composer
  const [emailType, setEmailType] = useState<string>('custom');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  
  useEffect(() => {
    loadEmailSettings();
    loadUsers();
  }, []);
  
  const loadEmailSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', ['email_from_address', 'email_logo_url', 'admin_contact_email']);
      
      if (error) throw error;
      
      if (data) {
        data.forEach(item => {
          const value = typeof item.value === 'string' ? item.value : String(item.value || '');
          if (item.key === 'email_from_address') setAdminEmail(value);
          if (item.key === 'email_logo_url') setLogoUrl(value);
          if (item.key === 'admin_contact_email') setContactEmail(value);
        });
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };
  
  const loadUsers = async () => {
    try {
      // Get profiles with user IDs
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username')
        .order('username');
      
      if (error) throw error;
      
      // We'll use the profile data - emails need to be fetched via admin API in edge function
      setUsers((profiles || []).map(p => ({
        id: p.id,
        email: '', // Will be shown as "User: {username || id}"
        username: p.username
      })));
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };
  
  const handleSaveSettings = async () => {
    if (!adminEmail) {
      toast({
        title: "Missing Information",
        description: "Please provide a sender email address",
        variant: "destructive",
      });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid sender email address",
        variant: "destructive",
      });
      return;
    }
    
    if (contactEmail && !emailRegex.test(contactEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid contact email address",
        variant: "destructive",
      });
      return;
    }
    
    setSavingSettings(true);
    try {
      // Save all settings
      const settings = [
        { key: 'email_from_address', value: JSON.stringify(adminEmail) },
        { key: 'email_logo_url', value: JSON.stringify(logoUrl) },
        { key: 'admin_contact_email', value: JSON.stringify(contactEmail || adminEmail) }
      ];
      
      for (const setting of settings) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert(
            { key: setting.key, value: JSON.parse(setting.value), updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );
        
        if (error) throw error;
      }
      
      toast({
        title: "Settings Saved",
        description: "Email settings updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendEmail = async () => {
    // Validate required fields
    if (!emailType) {
      toast({
        title: "Missing Email Type",
        description: "Please select an email type",
        variant: "destructive",
      });
      return;
    }
    
    if (!subject?.trim()) {
      toast({
        title: "Missing Subject",
        description: "Please enter an email subject",
        variant: "destructive",
      });
      return;
    }

    if (!message?.trim()) {
      toast({
        title: "Missing Message",
        description: "Please enter an email message",
        variant: "destructive",
      });
      return;
    }

    // Validate recipient for non-broadcast emails
    if (emailType !== 'broadcast') {
      if (!selectedUserId && !recipientEmail?.trim()) {
        toast({
          title: "Missing Recipient",
          description: "Please select a user or enter a recipient email address",
          variant: "destructive",
        });
        return;
      }
      
      // Validate email format if direct email provided
      if (recipientEmail?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const payload = {
        type: emailType,
        to: recipientEmail?.trim() || undefined,
        userId: selectedUserId || undefined,
        subject: subject.trim(),
        message: message.trim(),
        data: {
          additionalInfo: emailType === 'broadcast' ? 'This message was sent to all users.' : undefined
        }
      };

      console.log('Sending email with payload:', payload);

      const response = await supabase.functions.invoke('send-email', {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('Email response:', response);

      if (response.error) {
        // Extract error message from response
        let errorMessage = 'Failed to send email';
        if (response.error.message) {
          errorMessage = response.error.message;
        }
        throw new Error(errorMessage);
      }

      const result = response.data;

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to send email');
      }

      toast({
        title: "Email Sent Successfully",
        description: `Sent to ${result.sent} recipient(s)${result.failed > 0 ? `. ${result.failed} failed.` : ''}`,
      });

      // Reset form
      setSubject('');
      setMessage('');
      setRecipientEmail('');
      setSelectedUserId('');
      setEmailType('custom');
      
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Error Sending Email",
        description: error.message || "Failed to send email. Please check the logs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPresetContent = (type: string) => {
    switch (type) {
      case 'deposit':
        return {
          subject: 'Deposit Confirmation',
          message: 'Your deposit has been successfully processed and credited to your account.'
        };
      case 'withdrawal':
        return {
          subject: 'Withdrawal Processed',
          message: 'Your withdrawal request has been approved and processed successfully.'
        };
      case 'attention':
        return {
          subject: 'Important Account Notice',
          message: 'We need your attention regarding your account. Please review the details below.'
        };
      case 'verification':
        return {
          subject: 'Account Verification Complete',
          message: 'Congratulations! Your account has been successfully verified.'
        };
      case 'broadcast':
        return {
          subject: 'Platform Update',
          message: 'We have important updates to share with all our users.'
        };
      default:
        return { subject: '', message: '' };
    }
  };

  const handleTypeChange = (type: any) => {
    setEmailType(type);
    const preset = getPresetContent(type);
    setSubject(preset.subject);
    setMessage(preset.message);
    
    // Clear recipient fields when switching to broadcast
    if (type === 'broadcast') {
      setRecipientEmail('');
      setSelectedUserId('');
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setRecipientEmail(''); // Clear direct email when selecting user
  };

  if (loadingSettings) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Email Management</h1>
        <p className="text-muted-foreground mt-2">Configure email settings and send emails to users</p>
      </div>

      {/* Email Settings Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Email Settings
          </CardTitle>
          <CardDescription>Configure sender information and branding for all outgoing emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Sender Email Address *</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="noreply@yourplatform.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This email will appear as the "From" address on all outgoing emails
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Form Recipient Email</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="support@yourplatform.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Contact form submissions will be sent to this email (defaults to sender email)
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Email Logo URL (Optional)</Label>
            <Input
              id="logoUrl"
              type="url"
              placeholder="https://yourplatform.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Logo image to display in email headers
            </p>
          </div>
          
          <Button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="w-full sm:w-auto"
          >
            {savingSettings ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Email Settings'
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Pre-configured email templates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => handleTypeChange('deposit')}
              variant={emailType === 'deposit' ? 'default' : 'secondary'}
              className="w-full justify-start bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border border-primary/20"
            >
              <CheckCircle className="mr-2 h-4 w-4 text-primary" />
              Deposit Confirmation
            </Button>
            <Button
              onClick={() => handleTypeChange('withdrawal')}
              variant={emailType === 'withdrawal' ? 'default' : 'secondary'}
              className="w-full justify-start bg-gradient-to-r from-accent/10 to-accent/5 hover:from-accent/20 hover:to-accent/10 border border-accent/20"
            >
              <CheckCircle className="mr-2 h-4 w-4 text-accent" />
              Withdrawal Notification
            </Button>
            <Button
              onClick={() => handleTypeChange('attention')}
              variant={emailType === 'attention' ? 'default' : 'secondary'}
              className="w-full justify-start bg-gradient-to-r from-destructive/10 to-destructive/5 hover:from-destructive/20 hover:to-destructive/10 border border-destructive/20"
            >
              <AlertCircle className="mr-2 h-4 w-4 text-destructive" />
              Attention Required
            </Button>
            <Button
              onClick={() => handleTypeChange('verification')}
              variant={emailType === 'verification' ? 'default' : 'secondary'}
              className="w-full justify-start bg-gradient-to-r from-green-500/10 to-green-500/5 hover:from-green-500/20 hover:to-green-500/10 border border-green-500/20"
            >
              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
              Account Verification
            </Button>
            <Button
              onClick={() => handleTypeChange('broadcast')}
              variant={emailType === 'broadcast' ? 'default' : 'secondary'}
              className="w-full justify-start bg-gradient-to-r from-blue-500/10 to-blue-500/5 hover:from-blue-500/20 hover:to-blue-500/10 border border-blue-500/20"
            >
              <Users className="mr-2 h-4 w-4 text-blue-500" />
              Broadcast to All Users
            </Button>
            <Button
              onClick={() => handleTypeChange('custom')}
              variant={emailType === 'custom' ? 'default' : 'secondary'}
              className="w-full justify-start bg-gradient-to-r from-muted/10 to-muted/5 hover:from-muted/20 hover:to-muted/10 border border-muted-foreground/20"
            >
              <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
              Custom Email
            </Button>
          </CardContent>
        </Card>

        {/* Email Composer */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <CardHeader>
            <CardTitle className="text-primary">Email Composer</CardTitle>
            <CardDescription>Compose and send your email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emailType">Email Type *</Label>
              <Select value={emailType} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Email</SelectItem>
                  <SelectItem value="deposit">Deposit Confirmation</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal Notification</SelectItem>
                  <SelectItem value="attention">Attention Required</SelectItem>
                  <SelectItem value="verification">Account Verification</SelectItem>
                  <SelectItem value="broadcast">Broadcast to All</SelectItem>
                  <SelectItem value="targeted">Targeted User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {emailType !== 'broadcast' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="userSelect">
                    Select User {emailType !== 'broadcast' && '*'}
                  </Label>
                  <Select value={selectedUserId} onValueChange={handleUserSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select a user"} />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <span>{user.username || user.id.substring(0, 8) + '...'}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or enter email directly</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">Direct Email Address</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    placeholder="user@example.com"
                    value={recipientEmail}
                    onChange={(e) => {
                      setRecipientEmail(e.target.value);
                      setSelectedUserId(''); // Clear user selection when typing email
                    }}
                  />
                </div>
              </>
            )}

            {emailType === 'broadcast' && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-500 font-medium">
                  <Users className="h-4 w-4" />
                  Broadcast Mode
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  This email will be sent to all registered users.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Email message content..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
              />
            </div>

            <Button
              onClick={handleSendEmail}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Email Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Deposit/Withdrawal:</strong> Sent when financial transactions are approved or rejected</p>
          <p>• <strong>Attention Required:</strong> For urgent account matters or compliance issues</p>
          <p>• <strong>Verification:</strong> Confirms successful account verification</p>
          <p>• <strong>Broadcast:</strong> Sends to all registered users (use sparingly)</p>
          <p>• <strong>Targeted:</strong> Send to specific user by selecting from dropdown or entering email</p>
          <p>• <strong>Custom:</strong> Create your own message for any purpose</p>
        </CardContent>
      </Card>
    </div>
  );
}
