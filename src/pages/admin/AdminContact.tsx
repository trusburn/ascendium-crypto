import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ContactSettings {
  hero_title: string;
  hero_description: string;
  support_email: string;
  support_phone: string;
  office_address: string;
  office_city: string;
  office_zip: string;
  business_hours_weekday: string;
  business_hours_saturday: string;
  business_hours_sunday: string;
  emergency_phone: string;
  emergency_description: string;
  form_title: string;
  form_button_text: string;
  recipient_email: string;
}

const defaultSettings: ContactSettings = {
  hero_title: 'Get in Touch',
  hero_description: 'Have questions about crypto investing? Need help with your account? Our expert team is here to assist you 24/7 with all your investment needs.',
  support_email: 'support@cryptovault.com',
  support_phone: '+1 (555) 123-4567',
  office_address: '123 Wall Street, Suite 500',
  office_city: 'New York',
  office_zip: 'NY 10005',
  business_hours_weekday: 'Monday - Friday: 9:00 AM - 6:00 PM EST',
  business_hours_saturday: 'Saturday: 10:00 AM - 4:00 PM EST',
  business_hours_sunday: 'Sunday: Closed',
  emergency_phone: '+1 (555) 911-HELP',
  emergency_description: 'For urgent account or security issues',
  form_title: 'Send Us a Message',
  form_button_text: 'Send Message',
  recipient_email: 'admin@cryptovault.com',
};

export default function AdminContact() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ContactSettings>(defaultSettings);

  const { isLoading } = useQuery({
    queryKey: ['contact-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('key, value')
        .like('key', 'contact_%');

      if (error) throw error;

      if (data && data.length > 0) {
        const settings: Partial<ContactSettings> = {};
        data.forEach((item) => {
          const key = item.key.replace('contact_', '') as keyof ContactSettings;
          settings[key] = item.value as string;
        });
        setFormData({ ...defaultSettings, ...settings });
      }

      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (settings: ContactSettings) => {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key: `contact_${key}`,
        value,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert({ key: update.key, value: update.value }, { onConflict: 'key' });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-settings'] });
      toast({
        title: 'Success',
        description: 'Contact settings updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update contact settings',
        variant: 'destructive',
      });
      console.error('Update error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (field: keyof ContactSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contact Page Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage contact information, messaging settings, and all text content on the contact page
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hero Section */}
        <Card>
          <CardHeader>
            <CardTitle>Hero Section</CardTitle>
            <CardDescription>Main title and description at the top of the contact page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hero_title">Hero Title</Label>
              <Input
                id="hero_title"
                value={formData.hero_title}
                onChange={(e) => handleChange('hero_title', e.target.value)}
                placeholder="Get in Touch"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero_description">Hero Description</Label>
              <Textarea
                id="hero_description"
                value={formData.hero_description}
                onChange={(e) => handleChange('hero_description', e.target.value)}
                placeholder="Description text"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Email, phone, and office details displayed on the page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="support_email">Support Email</Label>
                <Input
                  id="support_email"
                  type="email"
                  value={formData.support_email}
                  onChange={(e) => handleChange('support_email', e.target.value)}
                  placeholder="support@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support_phone">Support Phone</Label>
                <Input
                  id="support_phone"
                  value={formData.support_phone}
                  onChange={(e) => handleChange('support_phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="office_address">Office Address</Label>
              <Input
                id="office_address"
                value={formData.office_address}
                onChange={(e) => handleChange('office_address', e.target.value)}
                placeholder="123 Wall Street, Suite 500"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="office_city">Office City</Label>
                <Input
                  id="office_city"
                  value={formData.office_city}
                  onChange={(e) => handleChange('office_city', e.target.value)}
                  placeholder="New York"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="office_zip">Office ZIP/Postal Code</Label>
                <Input
                  id="office_zip"
                  value={formData.office_zip}
                  onChange={(e) => handleChange('office_zip', e.target.value)}
                  placeholder="NY 10005"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>Operating hours displayed on the contact page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_hours_weekday">Weekday Hours</Label>
              <Input
                id="business_hours_weekday"
                value={formData.business_hours_weekday}
                onChange={(e) => handleChange('business_hours_weekday', e.target.value)}
                placeholder="Monday - Friday: 9:00 AM - 6:00 PM EST"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_hours_saturday">Saturday Hours</Label>
              <Input
                id="business_hours_saturday"
                value={formData.business_hours_saturday}
                onChange={(e) => handleChange('business_hours_saturday', e.target.value)}
                placeholder="Saturday: 10:00 AM - 4:00 PM EST"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_hours_sunday">Sunday Hours</Label>
              <Input
                id="business_hours_sunday"
                value={formData.business_hours_sunday}
                onChange={(e) => handleChange('business_hours_sunday', e.target.value)}
                placeholder="Sunday: Closed"
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
            <CardDescription>Emergency support information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emergency_phone">Emergency Phone</Label>
              <Input
                id="emergency_phone"
                value={formData.emergency_phone}
                onChange={(e) => handleChange('emergency_phone', e.target.value)}
                placeholder="+1 (555) 911-HELP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_description">Emergency Description</Label>
              <Input
                id="emergency_description"
                value={formData.emergency_description}
                onChange={(e) => handleChange('emergency_description', e.target.value)}
                placeholder="For urgent account or security issues"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Form Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Form Settings</CardTitle>
            <CardDescription>Configure form text and email recipient</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form_title">Form Title</Label>
              <Input
                id="form_title"
                value={formData.form_title}
                onChange={(e) => handleChange('form_title', e.target.value)}
                placeholder="Send Us a Message"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form_button_text">Submit Button Text</Label>
              <Input
                id="form_button_text"
                value={formData.form_button_text}
                onChange={(e) => handleChange('form_button_text', e.target.value)}
                placeholder="Send Message"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipient_email">Recipient Email (where messages are sent)</Label>
              <Input
                id="recipient_email"
                type="email"
                value={formData.recipient_email}
                onChange={(e) => handleChange('recipient_email', e.target.value)}
                placeholder="admin@example.com"
              />
              <p className="text-sm text-muted-foreground">
                All contact form submissions will be sent to this email address
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormData(defaultSettings)}
            disabled={updateMutation.isPending}
          >
            Reset to Defaults
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
