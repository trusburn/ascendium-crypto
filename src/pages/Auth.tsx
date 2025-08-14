import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bitcoin3D } from '@/components/Bitcoin3D';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Check if user is already authenticated
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkUser();
  }, [navigate]);

  const validateForm = (isSignUp: boolean) => {
    const newErrors: {[key: string]: string} = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Sign up specific validations
    if (isSignUp) {
      if (!formData.username) {
        newErrors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(false)) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Login Failed",
            description: "Invalid email or password. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Welcome Back!",
          description: "You have successfully signed in.",
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: formData.username,
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: "Account Exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account.",
        });
        // Clear form
        setFormData({
          email: '',
          password: '',
          username: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20">
        <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-hero-gradient"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,hsl(var(--crypto-blue)/0.1)_0%,transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--crypto-purple)/0.1)_0%,transparent_50%)]"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Side - 3D Bitcoin */}
              <div className="hidden lg:flex justify-center">
                <div className="relative">
                  <Bitcoin3D />
                  <div className="absolute -top-4 -right-4 animate-crypto-float">
                    <div className="bg-crypto-green/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm text-crypto-green border border-crypto-green/30">
                      Secure Login
                    </div>
                  </div>
                  <div className="absolute -bottom-4 -left-4 animate-crypto-float" style={{animationDelay: '2s'}}>
                    <div className="bg-crypto-blue/20 backdrop-blur-sm rounded-full px-3 py-1 text-sm text-crypto-blue border border-crypto-blue/30">
                      Protected
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Auth Forms */}
              <div className="w-full max-w-md mx-auto">
                <div className="text-center mb-8">
                  <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                    <span className="bg-crypto-gradient bg-clip-text text-transparent">
                      Welcome to CryptoVault
                    </span>
                  </h1>
                  <p className="text-muted-foreground">
                    Join thousands of investors growing their wealth with crypto
                  </p>
                </div>

                <Card className="bg-background/50 backdrop-blur-sm border border-border/50">
                  <CardContent className="p-8">
                    <Tabs defaultValue="signin" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="signin">Sign In</TabsTrigger>
                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="signin">
                        <form onSubmit={handleSignIn} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Email</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="email"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                className={`pl-10 border-border/50 focus:border-crypto-blue ${errors.email ? 'border-red-500' : ''}`}
                              />
                            </div>
                            {errors.email && (
                              <div className="flex items-center space-x-1 text-red-500 text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <span>{errors.email}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Password</label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                className={`pl-10 pr-10 border-border/50 focus:border-crypto-blue ${errors.password ? 'border-red-500' : ''}`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            {errors.password && (
                              <div className="flex items-center space-x-1 text-red-500 text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <span>{errors.password}</span>
                              </div>
                            )}
                          </div>
                          
                          <Button 
                            type="submit" 
                            className="w-full bg-crypto-gradient hover:opacity-90 text-background"
                            disabled={isLoading}
                          >
                            {isLoading ? "Signing In..." : "Sign In"}
                          </Button>
                        </form>
                      </TabsContent>
                      
                      <TabsContent value="signup">
                        <form onSubmit={handleSignUp} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Username</label>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="text"
                                placeholder="Choose a username"
                                value={formData.username}
                                onChange={(e) => handleInputChange('username', e.target.value)}
                                className={`pl-10 border-border/50 focus:border-crypto-blue ${errors.username ? 'border-red-500' : ''}`}
                              />
                            </div>
                            {errors.username && (
                              <div className="flex items-center space-x-1 text-red-500 text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <span>{errors.username}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Email</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="email"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                className={`pl-10 border-border/50 focus:border-crypto-blue ${errors.email ? 'border-red-500' : ''}`}
                              />
                            </div>
                            {errors.email && (
                              <div className="flex items-center space-x-1 text-red-500 text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <span>{errors.email}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Password</label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                className={`pl-10 pr-10 border-border/50 focus:border-crypto-blue ${errors.password ? 'border-red-500' : ''}`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            {errors.password && (
                              <div className="flex items-center space-x-1 text-red-500 text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <span>{errors.password}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Confirm Password</label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="password"
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                className={`pl-10 border-border/50 focus:border-crypto-blue ${errors.confirmPassword ? 'border-red-500' : ''}`}
                              />
                            </div>
                            {errors.confirmPassword && (
                              <div className="flex items-center space-x-1 text-red-500 text-sm">
                                <AlertCircle className="h-4 w-4" />
                                <span>{errors.confirmPassword}</span>
                              </div>
                            )}
                          </div>
                          
                          <Button 
                            type="submit" 
                            className="w-full bg-crypto-gradient hover:opacity-90 text-background"
                            disabled={isLoading}
                          >
                            {isLoading ? "Creating Account..." : "Create Account"}
                          </Button>
                        </form>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <div className="text-center mt-6 text-sm text-muted-foreground">
                  By continuing, you agree to our{' '}
                  <a href="#" className="text-crypto-blue hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-crypto-blue hover:underline">Privacy Policy</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Auth;