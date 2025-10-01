import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    reg_id: ''
  });
  
  const [adminFormData, setAdminFormData] = useState({
    email: '',
    password: ''
  });
  const [tab, setTab] = useState<'signin' | 'signup' | 'admin'>('signin');

  useEffect(() => {
    // Initialize tab from URL (#admin or ?tab=admin)
    const hash = window.location.hash.replace('#', '');
    const params = new URLSearchParams(window.location.search);
    const qp = params.get('tab');
    const initial = (qp || hash) as 'signin' | 'signup' | 'admin' | null;
    if (initial && ['signin', 'signup', 'admin'].includes(initial)) {
      setTab(initial as 'signin' | 'signup' | 'admin');
    }

    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
        return;
      }
      const local = localStorage.getItem('localUserSession');
      if (local) {
        navigate('/');
      }
    };
    checkUser();
  }, [navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAdminInputChange = (field: string, value: string) => {
    setAdminFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const users = JSON.parse(localStorage.getItem('localUsers') || '[]');
      const found = users.find((u: any) => u.email === formData.email && u.password === formData.password);

      if (!found) {
        throw new Error('Invalid email or password.');
      }

      localStorage.setItem('localUserSession', JSON.stringify({ id: found.id, email: found.email, full_name: found.full_name }));

      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.',
      });

      navigate('/');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: 'Sign In Failed',
        description: error.message || 'Failed to sign in. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simple admin credential check
      if (adminFormData.email !== 'admin@gmail.com' || adminFormData.password !== '214365') {
        throw new Error('Invalid admin credentials');
      }

      // Set admin session
      localStorage.setItem('adminSession', 'true');
      localStorage.setItem('adminEmail', adminFormData.email);
      
      toast({
        title: "Welcome Admin!",
        description: "You have been signed in as administrator.",
      });

      navigate('/');
    } catch (error: any) {
      console.error('Admin login error:', error);
      toast({
        title: "Admin Login Failed",
        description: error.message || "Invalid admin credentials",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const users = JSON.parse(localStorage.getItem('localUsers') || '[]');
      const exists = users.some((u: any) => u.email === formData.email);
      if (exists) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }

      const id = (crypto && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `local-${Date.now()}`;
      const newUser = {
        id,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        reg_id: formData.reg_id,
      };

      localStorage.setItem('localUsers', JSON.stringify([...users, newUser]));
      localStorage.setItem('localUserSession', JSON.stringify({ id, email: newUser.email, full_name: newUser.full_name }));

      toast({
        title: 'Welcome!',
        description: 'Your account has been created and you are signed in.',
      });
      navigate('/');
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: 'Sign Up Failed',
        description: error.message || 'Failed to create account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        formData.email,
        {
          redirectTo: `${window.location.origin}/auth`
        }
      );

      if (error) throw error;

      toast({
        title: "Reset Link Sent",
        description: "Check your email for a password reset link.",
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to send reset email.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
              LPU Events
            </CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as 'signin' | 'signup' | 'admin')} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your.email@lpu.in"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm"
                    onClick={handleForgotPassword}
                    disabled={loading}
                  >
                    Forgot your password?
                  </Button>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your full name"
                        value={formData.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-regid">Registration ID</Label>
                      <Input
                        id="signup-regid"
                        type="text"
                        placeholder="12100001"
                        value={formData.reg_id}
                        onChange={(e) => handleInputChange('reg_id', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your.email@lpu.in"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password (min. 6 characters)"
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="admin">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Admin Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@gmail.com"
                      value={adminFormData.email}
                      onChange={(e) => handleAdminInputChange('email', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Admin Password</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter admin password"
                        value={adminFormData.password}
                        onChange={(e) => handleAdminInputChange('password', e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Admin Sign In'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>For demo purposes:</p>
              <p className="text-xs">Admin login: admin@gmail.com / 214365</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;