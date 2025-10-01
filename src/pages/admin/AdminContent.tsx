import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Plus, 
  Trash2, 
  Edit, 
  Type, 
  Palette, 
  Globe,
  FileText,
  Settings
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContentItem {
  id: string;
  key: string;
  value: any;
  category: string;
  description?: string;
}

const defaultContent = {
  siteTitle: 'CryptoVault',
  heroTitle: 'Invest in Crypto Future',
  heroSubtitle: 'Join the revolution of digital finance. Grow your wealth with our advanced trading algorithms, expert signals, and secure investment platform designed for the crypto era.',
  footerCopyright: '© 2024 CryptoVault. All rights reserved.',
  contactEmail: 'support@cryptovault.com',
  contactPhone: '+1 (555) 123-4567',
  aboutTitle: 'About CryptoVault',
  servicesTitle: 'Our Services',
  tradingVolumeLabel: 'Trading Volume',
  activeUsersLabel: 'Active Users',
  uptimeLabel: 'Uptime'
};

const colorOptions = [
  { name: 'Crypto Blue', value: '217 91% 60%', class: 'bg-[hsl(217_91%_60%)]' },
  { name: 'Crypto Gold', value: '43 96% 56%', class: 'bg-[hsl(43_96%_56%)]' },
  { name: 'Crypto Purple', value: '271 81% 56%', class: 'bg-[hsl(271_81%_56%)]' },
  { name: 'Crypto Green', value: '142 76% 36%', class: 'bg-[hsl(142_76%_36%)]' },
  { name: 'Crypto Electric', value: '195 100% 50%', class: 'bg-[hsl(195_100%_50%)]' }
];

export default function AdminContent() {
  const [content, setContent] = useState<Record<string, any>>(defaultContent);
  const [colors, setColors] = useState<Record<string, string>>({
    primary: '217 91% 60%',
    secondary: '271 81% 56%',
    accent: '43 96% 56%'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [newContentKey, setNewContentKey] = useState('');
  const [newContentValue, setNewContentValue] = useState('');
  const [newContentCategory, setNewContentCategory] = useState('general');
  const { toast } = useToast();

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setIsInitialLoading(true);
    try {
      // First verify user is authenticated and is an admin
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session');
        toast({
          title: "Authentication Required",
          description: "Please log in as an admin to access this page",
          variant: "destructive"
        });
        setIsInitialLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .or('key.like.content_%,key.like.color_%');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Loaded admin settings:', data);

      const contentData: Record<string, any> = { ...defaultContent };
      const colorData: Record<string, string> = { 
        primary: '217 91% 60%',
        secondary: '271 81% 56%',
        accent: '43 96% 56%'
      };

      data?.forEach((item) => {
        if (item.key.startsWith('content_')) {
          const key = item.key.replace('content_', '');
          contentData[key] = typeof item.value === 'string' ? item.value : JSON.stringify(item.value);
        } else if (item.key.startsWith('color_')) {
          const key = item.key.replace('color_', '');
          colorData[key] = typeof item.value === 'string' ? item.value : String(item.value);
        }
      });

      console.log('Parsed content:', contentData);
      console.log('Parsed colors:', colorData);

      setContent(contentData);
      setColors(colorData);
    } catch (error: any) {
      console.error('Error loading content:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load content settings",
        variant: "destructive"
      });
    } finally {
      setIsInitialLoading(false);
    }
  };


  const saveContent = async () => {
    setIsSaving(true);
    try {
      // Verify authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in as an admin to save changes",
          variant: "destructive"
        });
        return;
      }
      // Save content items
      const contentItems = Object.entries(content).map(([key, value]) => ({
        key: `content_${key}`,
        value,
        updated_at: new Date().toISOString()
      }));

      // Save color items
      const colorItems = Object.entries(colors).map(([key, value]) => ({
        key: `color_${key}`,
        value,
        updated_at: new Date().toISOString()
      }));

      const allItems = [...contentItems, ...colorItems];

      // Process items in batches for better performance
      const batchSize = 10;
      for (let i = 0; i < allItems.length; i += batchSize) {
        const batch = allItems.slice(i, i + batchSize);
        const { error } = await supabase
          .from('admin_settings')
          .upsert(batch, { onConflict: 'key' });
        
        if (error) {
          console.error('Batch upsert error:', error);
          throw error;
        }
      }

      // Reload content to reflect changes
      await loadContent();

      toast({
        title: "Success",
        description: "Content settings saved successfully"
      });
    } catch (error: any) {
      console.error('Error saving content:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save content settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateContent = (key: string, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const updateColor = (key: string, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const addNewContent = () => {
    if (newContentKey && newContentValue) {
      setContent(prev => ({ ...prev, [newContentKey]: newContentValue }));
      setNewContentKey('');
      setNewContentValue('');
      toast({
        title: "Success",
        description: "New content item added"
      });
    }
  };

  const deleteContent = async (key: string) => {
    const newContent = { ...content };
    delete newContent[key];
    setContent(newContent);
    
    // Also delete from database
    try {
      await supabase
        .from('admin_settings')
        .delete()
        .eq('key', `content_${key}`);
      
      toast({
        title: "Success",
        description: "Content item deleted"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete content item",
        variant: "destructive"
      });
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading content settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">
            Manage site content, branding, and visual elements
          </p>
        </div>
        <Button onClick={saveContent} disabled={isSaving} className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 h-auto gap-1">
          <TabsTrigger value="content" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Content</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Colors</span>
          </TabsTrigger>
          <TabsTrigger value="footer" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Footer</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Site Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroTitle">Hero Title</Label>
                    <Input
                      id="heroTitle"
                      value={content.heroTitle}
                      onChange={(e) => updateContent('heroTitle', e.target.value)}
                      placeholder="Main hero title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aboutTitle">About Title</Label>
                    <Input
                      id="aboutTitle"
                      value={content.aboutTitle}
                      onChange={(e) => updateContent('aboutTitle', e.target.value)}
                      placeholder="About section title"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                  <Textarea
                    id="heroSubtitle"
                    value={content.heroSubtitle}
                    onChange={(e) => updateContent('heroSubtitle', e.target.value)}
                    placeholder="Hero section subtitle"
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tradingVolumeLabel">Trading Volume Label</Label>
                    <Input
                      id="tradingVolumeLabel"
                      value={content.tradingVolumeLabel}
                      onChange={(e) => updateContent('tradingVolumeLabel', e.target.value)}
                      placeholder="Trading Volume"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="activeUsersLabel">Active Users Label</Label>
                    <Input
                      id="activeUsersLabel"
                      value={content.activeUsersLabel}
                      onChange={(e) => updateContent('activeUsersLabel', e.target.value)}
                      placeholder="Active Users"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uptimeLabel">Uptime Label</Label>
                    <Input
                      id="uptimeLabel"
                      value={content.uptimeLabel}
                      onChange={(e) => updateContent('uptimeLabel', e.target.value)}
                      placeholder="Uptime"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add New Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Custom Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newKey">Content Key</Label>
                    <Input
                      id="newKey"
                      value={newContentKey}
                      onChange={(e) => setNewContentKey(e.target.value)}
                      placeholder="e.g., customTitle"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newCategory">Category</Label>
                    <Input
                      id="newCategory"
                      value={newContentCategory}
                      onChange={(e) => setNewContentCategory(e.target.value)}
                      placeholder="general"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newValue">Content Value</Label>
                  <Textarea
                    id="newValue"
                    value={newContentValue}
                    onChange={(e) => setNewContentValue(e.target.value)}
                    placeholder="Enter content value..."
                  />
                </div>
                <Button onClick={addNewContent} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Content
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Existing Content Items */}
          <Card>
            <CardHeader>
              <CardTitle>All Content Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(content).map(([key, value]) => (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{key}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground break-words">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteContent(key)}
                      className="w-full sm:w-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Brand Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteTitle">Site Title</Label>
                  <Input
                    id="siteTitle"
                    value={content.siteTitle}
                    onChange={(e) => updateContent('siteTitle', e.target.value)}
                    placeholder="CryptoVault"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servicesTitle">Services Title</Label>
                  <Input
                    id="servicesTitle"
                    value={content.servicesTitle}
                    onChange={(e) => updateContent('servicesTitle', e.target.value)}
                    placeholder="Our Services"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Color Scheme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                {Object.entries(colors).map(([key, value]) => (
                  <div key={key} className="space-y-3">
                    <Label className="capitalize">{key} Color</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {colorOptions.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => updateColor(key, color.value)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            value === color.value
                              ? 'border-primary shadow-lg'
                              : 'border-border hover:border-muted-foreground'
                          }`}
                        >
                          <div className={`w-full h-8 rounded ${color.class} mb-2`}></div>
                          <div className="text-xs font-medium">{color.name}</div>
                        </button>
                      ))}
                    </div>
                    <Input
                      value={value}
                      onChange={(e) => updateColor(key, e.target.value)}
                      placeholder="HSL color value"
                      className="font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Footer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="footerCopyright">Copyright Text</Label>
                <Input
                  id="footerCopyright"
                  value={content.footerCopyright}
                  onChange={(e) => updateContent('footerCopyright', e.target.value)}
                  placeholder="© 2024 CryptoVault. All rights reserved."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={content.contactEmail}
                    onChange={(e) => updateContent('contactEmail', e.target.value)}
                    placeholder="support@cryptovault.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={content.contactPhone}
                    onChange={(e) => updateContent('contactPhone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
