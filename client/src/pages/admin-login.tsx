import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { motion, useReducedMotion } from "framer-motion";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated, isAdmin, user, isLoading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (loginSuccess && !authLoading && isAuthenticated) {
      if (isAdmin) {
        setLocation("/admin");
      } else {
        setLocation("/editor");
      }
    }
  }, [loginSuccess, authLoading, isAuthenticated, isAdmin, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(username, password);
      toast({ title: "Login successful" });
      setLoginSuccess(true);
    } catch (error) {
      toast({ title: "Login failed", description: "Invalid credentials", variant: "destructive" });
      setIsLoading(false);
    }
  };

  const animationProps = prefersReducedMotion 
    ? { initial: {}, animate: {}, transition: {} }
    : { 
        initial: { opacity: 0, y: 20, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
      };

  const staggerProps = (delay: number) => prefersReducedMotion 
    ? { initial: {}, animate: {}, transition: {} }
    : { 
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { delay, duration: 0.4 }
      };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ 
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif",
        background: "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%)"
      }}
    >
      <motion.div {...animationProps}>
        <Card className="w-full max-w-md backdrop-blur-xl bg-card/80 border-border/50 shadow-2xl shadow-black/5">
          <CardHeader className="space-y-2 pb-6">
            <motion.div {...staggerProps(0.15)}>
              <CardTitle 
                className="text-2xl font-medium tracking-tight" 
                data-testid="text-login-title"
                style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif" }}
              >
                Blog Virality
              </CardTitle>
            </motion.div>
            <motion.div {...staggerProps(0.2)}>
              <CardDescription 
                className="text-muted-foreground/80"
                data-testid="text-login-description"
              >
                Enter your credentials to access the dashboard
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <motion.div className="space-y-2" {...staggerProps(0.25)}>
                <Label 
                  htmlFor="username" 
                  data-testid="label-username"
                  className="text-sm font-medium"
                >
                  Username
                </Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="h-11 bg-background/50 border-border/60 focus:border-primary/50 transition-all duration-300"
                />
              </motion.div>
              <motion.div className="space-y-2" {...staggerProps(0.3)}>
                <Label 
                  htmlFor="password" 
                  data-testid="label-password"
                  className="text-sm font-medium"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 bg-background/50 border-border/60 focus:border-primary/50 transition-all duration-300"
                />
              </motion.div>
              <motion.div {...staggerProps(0.35)}>
                <Button 
                  type="submit" 
                  className="w-full h-11 font-medium transition-all duration-300" 
                  disabled={isLoading || loginSuccess}
                  data-testid="button-login"
                >
                  {isLoading || loginSuccess ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : "Sign In"}
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
