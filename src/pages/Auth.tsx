import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gauge, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Try sign in first
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        // 2. If invalid credentials, attempt signup
        if (signInError.message === 'Invalid login credentials') {
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: email.split('@')[0] } },
          });
          if (signUpError) throw signUpError;

          // 3. Sign in after successful signup
          const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
          if (retryError) throw retryError;

          toast.success('Account created and signed in!');
        } else {
          throw signInError;
        }
      }

      navigate('/events');
    } catch (err: any) {
      toast.error(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gauge className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">
              Stint<span className="text-primary">Lab</span>
            </span>
          </div>
          <CardTitle className="text-lg">Sign In</CardTitle>
          <CardDescription>
            Enter your credentials — a new account will be created automatically if needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : 'Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
