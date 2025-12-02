import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Eye, EyeOff, Lock, Mail } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if already logged in as admin
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Check if user is admin
        const { data: isAdmin } = await supabase.rpc('is_admin', { 
          check_user_id: session.user.id 
        });
        
        if (isAdmin) {
          navigate('/admin');
          return;
        }
      }
      setCheckingAuth(false);
    };

    checkExistingSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Defer the admin check to avoid deadlock
          setTimeout(async () => {
            const { data: isAdmin } = await supabase.rpc('is_admin', { 
              check_user_id: session.user.id 
            });
            
            if (isAdmin) {
              navigate('/admin');
            } else {
              // Sign out non-admin users trying to use admin login
              await supabase.auth.signOut();
              toast({
                title: "Access Denied",
                description: "This login is for administrators only.",
                variant: "destructive",
              });
            }
          }, 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (data.user) {
        // Check if user is admin
        const { data: isAdmin } = await supabase.rpc('is_admin', { 
          check_user_id: data.user.id 
        });

        if (!isAdmin) {
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: "This login is for administrators only.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        toast({
          title: "Welcome Admin",
          description: "Redirecting to admin dashboard...",
        });
        navigate('/admin');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md border-primary/20 bg-card/80 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
            <CardDescription className="text-muted-foreground">
              Secure access for administrators only
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  Authenticating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Access Admin Panel
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              This portal is restricted to authorized personnel only.
              <br />
              Unauthorized access attempts are logged.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
