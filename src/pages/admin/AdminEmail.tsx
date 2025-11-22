import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Send, Users, User, AlertCircle, CheckCircle } from 'lucide-react';

export default function AdminEmail() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Load email settings on mount
  useEffect(() => {
    loadEmailSettings();
  }, []);
  
  const loadEmailSettings = async () => {
    try {
      const { data: emailData } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'email_from_address')
        .single();
      
      const { data: logoData } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'email_logo_url')
        .single();
      
      if (emailData?.value) setAdminEmail(emailData.value as string);
      if (logoData?.value) setLogoUrl(logoData.value as string);
    } catch (error) {
      console.error('Error loading email settings:', error);
    }
  };
  
  const handleSaveSettings = async () => {
    if (!adminEmail) {
      toast({
        title: "Missing Information",
        description: "Please provide an admin email address",
        variant: "destructive",
      });
      return;
    }
    
    setSavingSettings(true);
    try {
      // Save admin email
      await supabase
        .from('admin_settings')
        .upsert({ key: 'email_from_address', value: adminEmail });
      
      // Save logo URL
      await supabase
        .from('admin_settings')
        .upsert({ key: 'email_logo_url', value: logoUrl });
      
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
  const [emailType, setEmailType] = useState<'deposit' | 'withdrawal' | 'attention' | 'broadcast' | 'targeted' | 'verification' | 'custom'>('custom');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const handleSendEmail = async () => {
    if (!subject || !message) {
      toast({
        title: "Missing Information",
        description: "Please fill in subject and message",
        variant: "destructive",
      });
      return;
    }

    if ((emailType === 'targeted' || emailType === 'custom') && !userId && !recipientEmail) {
      toast({
        title: "Missing Recipient",
        description: "Please specify a recipient email or user ID",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('send-email', {
        body: {
          type: emailType,
          to: recipientEmail || undefined,
          userId: userId || undefined,
          subject,
          message,
          data: {
            additionalInfo: emailType === 'broadcast' ? 'This message was sent to all users.' : undefined
          }
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw response.error;
      }

      const result = response.data;

      toast({
        title: "Email Sent Successfully",
        description: `Sent to ${result.sent} recipient(s). ${result.failed > 0 ? `${result.failed} failed.` : ''}`,
      });

      // Reset form
      setSubject('');
      setMessage('');
      setRecipientEmail('');
      setUserId('');
      
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Error Sending Email",
        description: error.message || "Failed to send email",
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
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Email Management</h1>
        <p className="text-muted-foreground mt-2">Send emails to users for various activities</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Email Settings</CardTitle>
          <CardDescription>Configure sender information and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="adminEmail">Admin Email Address (Send From)</Label>
            <Input
              id="adminEmail"
              type="email"
              placeholder="admin@yourplatform.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              This email will be used as the sender and will receive contact form submissions
            </p>
          </div>
          
          <div>
            <Label htmlFor="logoUrl">Email Logo URL (Optional)</Label>
            <Input
              id="logoUrl"
              type="url"
              placeholder="https://yourplatform.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Logo image to display in email header
            </p>
          </div>
          
          <Button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="w-full"
          >
            {savingSettings ? 'Saving...' : 'Save Email Settings'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
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

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <CardHeader>
            <CardTitle className="text-primary">Email Composer</CardTitle>
            <CardDescription>Compose and send your email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="emailType">Email Type</Label>
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
                <div>
                  <Label htmlFor="recipientEmail">Recipient Email (Optional)</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    placeholder="user@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="userId">Or User ID (Optional)</Label>
                  <Input
                    id="userId"
                    placeholder="User UUID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Email subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
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
              <Send className="mr-2 h-4 w-4" />
              {loading ? 'Sending...' : 'Send Email'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Deposit/Withdrawal:</strong> Sent when financial transactions are approved</p>
          <p>• <strong>Attention Required:</strong> For urgent account matters or compliance issues</p>
          <p>• <strong>Verification:</strong> Confirms successful account verification</p>
          <p>• <strong>Broadcast:</strong> Sends to all registered users (use sparingly)</p>
          <p>• <strong>Targeted:</strong> Send to specific user by email or ID</p>
          <p>• <strong>Custom:</strong> Create your own message for any purpose</p>
        </CardContent>
      </Card>
    </div>
  );
}
