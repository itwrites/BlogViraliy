import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSiteContext } from "@/components/base-path-provider";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, LogIn } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated, isAdmin, user, isLoading: authLoading } = useAuth();
  const siteContext = useSiteContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (loginSuccess && !authLoading && isAuthenticated) {
      if (siteContext && siteContext.id) {
        setLocation(`/editor/sites/${siteContext.id}/posts`);
      } else if (isAdmin) {
        setLocation("/admin");
      } else {
        setLocation("/editor");
      }
    }
  }, [loginSuccess, authLoading, isAuthenticated, isAdmin, siteContext, setLocation]);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl"
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            rotate: { duration: 60, repeat: Infinity, ease: "linear" },
            scale: { duration: 8, repeat: Infinity, ease: "easeInOut" }
          }}
        />
        <motion.div 
          className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-purple-500/15 via-pink-500/10 to-transparent rounded-full blur-3xl"
          animate={{ 
            rotate: [360, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ 
            rotate: { duration: 50, repeat: Infinity, ease: "linear" },
            scale: { duration: 10, repeat: Infinity, ease: "easeInOut" }
          }}
        />
      </div>

      <motion.div
        variants={prefersReducedMotion ? {} : containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md"
      >
        {/* Login Card */}
        <div className="rounded-3xl bg-black/80 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
          <div className="p-8 space-y-8">
            {/* Logo & Header */}
            <motion.div variants={itemVariants} className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
                <svg 
                  width="32" 
                  height="32" 
                  viewBox="0 0 48 48" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  data-testid="img-brand-logo"
                >
                  <path 
                    d="M24 4L44 40H4L24 4Z" 
                    fill="white" 
                    stroke="white" 
                    strokeWidth="2"
                    strokeLinejoin="miter"
                  />
                </svg>
              </div>
              <div>
                <h1 
                  className="text-2xl font-semibold tracking-tight text-white"
                  data-testid="text-login-title"
                >
                  Welcome back
                </h1>
                <p className="text-white/50 mt-1">
                  Sign in to Blog Virality
                </p>
              </div>
            </motion.div>

            {/* Login Form */}
            <motion.form variants={itemVariants} onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-white/70">
                  Username
                </Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="h-12 text-base rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:ring-blue-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-white/70">
                  Password
                </Label>
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-12 text-base rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:ring-blue-500/20"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-12 text-base rounded-xl bg-white text-black hover:bg-white/90 font-medium"
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    Sign In
                  </>
                )}
              </Button>
            </motion.form>
          </div>

          {/* Footer */}
          <motion.div 
            variants={itemVariants}
            className="px-8 py-4 border-t border-white/5 bg-white/[0.02]"
          >
            <p className="text-center text-xs text-white/30">
              Blog Virality CMS
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
