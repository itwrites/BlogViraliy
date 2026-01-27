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
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isAdmin, isOwner, isLoading: authLoading } = useAuth();
  const siteContext = useSiteContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Redirect function for already-authenticated users visiting /login
  const redirectAuthenticatedUser = async () => {
    if (siteContext && siteContext.id) {
      setLocation(`/admin/sites/${siteContext.id}`);
    } else if (isAdmin) {
      setLocation("/admin");
    } else {
      // Owner or Editor - fetch their site
      try {
        const endpoint = isOwner ? "/api/owner/sites" : "/api/editor/sites";
        const res = await apiRequest("GET", endpoint);
        const sites = await res.json();
        if (sites && sites.length > 0) {
          setLocation(`/admin/sites/${sites[0].id}`);
        } else if (isOwner) {
          // Owner with no sites - go to owner dashboard (shouldn't happen normally)
          setLocation("/owner");
        } else {
          toast({ 
            title: "No sites assigned", 
            description: "Please contact an administrator to get access to a site.",
            variant: "destructive" 
          });
        }
      } catch {
        setLocation("/");
      }
    }
  };

  // Redirect if already authenticated (visiting /login with active session)
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      redirectAuthenticatedUser();
    }
  }, [authLoading, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      const data = await res.json();
      
      if (data.success) {
        // Invalidate auth cache
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        
        toast({ title: "Login successful" });
        
        // Redirect based on site info from login response
        if (data.site?.id) {
          setLocation(`/admin/sites/${data.site.id}`);
        } else if (data.user?.role === "admin") {
          setLocation("/admin");
        } else {
          // Fallback - should rarely happen
          setLocation("/owner");
        }
      }
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-blue-400/5 via-purple-400/5 to-transparent rounded-full blur-3xl"
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
          className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-purple-400/5 via-pink-400/5 to-transparent rounded-full blur-3xl"
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
        <div className="rounded-3xl bg-white/95 backdrop-blur-2xl border border-border shadow-xl overflow-hidden">
          <div className="p-8 space-y-8">
            {/* Logo & Header */}
            <motion.div variants={itemVariants} className="text-center space-y-4">
              <img 
                src="/assets/blog-autopilot-mark.svg" 
                alt="Blog Autopilot" 
                className="w-[70px] h-[70px] mx-auto"
                data-testid="img-brand-logo"
              />
              <div>
                <h1 
                  className="text-2xl font-semibold tracking-tight text-foreground"
                  data-testid="text-login-title"
                >
                  Welcome back
                </h1>
                <p className="text-muted-foreground/80 mt-1">
                  Sign in to Blog Autopilot
                </p>
              </div>
            </motion.div>

            {/* Login Form */}
            <motion.form variants={itemVariants} onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-muted-foreground/80">
                  Username
                </Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="h-12 text-base rounded-xl bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-muted-foreground/80">
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
                  className="h-12 text-base rounded-xl bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-12 text-base rounded-xl font-medium"
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
            className="px-8 py-4 border-t border-border bg-muted/30"
          >
            <p className="text-center text-xs text-muted-foreground/70">
              Blog Autopilot CMS
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
