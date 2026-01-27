import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, UserPlus, Mail, Lock, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const prefersReducedMotion = useReducedMotion();


  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!username) {
      newErrors.username = "Username is required";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const res = await apiRequest("POST", "/api/auth/register", {
        email,
        username,
        password,
        confirmPassword,
      });

      const data = await res.json();

      if (data.success) {
        toast({ title: "Account created successfully!" });
        setIsLoading(false);
        // Redirect to site config with onboarding for their auto-created site
        if (data.starterSite?.id) {
          setLocation(`/admin/sites/${data.starterSite.id}/settings`);
        } else {
          // Fallback to owner dashboard if no site was created
          setLocation("/owner");
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Registration failed";
      
      // Parse error messages
      if (errorMessage.includes("Username already exists")) {
        setErrors({ username: "Username already exists" });
      } else if (errorMessage.includes("Email already exists")) {
        setErrors({ email: "Email already exists" });
      } else if (errorMessage.includes("All fields are required")) {
        toast({ 
          title: "Error", 
          description: "Please fill in all fields",
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Error", 
          description: errorMessage,
          variant: "destructive" 
        });
      }
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-900 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-blue-600/25 via-indigo-500/20 to-transparent rounded-full blur-3xl"
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
          className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/20 via-blue-400/15 to-transparent rounded-full blur-3xl"
          animate={{ 
            rotate: [360, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ 
            rotate: { duration: 50, repeat: Infinity, ease: "linear" },
            scale: { duration: 10, repeat: Infinity, ease: "easeInOut" }
          }}
        />
        {/* Gradient overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-indigo-500/15 to-slate-400/10" />
      </div>

      <motion.div
        variants={prefersReducedMotion ? {} : containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md"
      >
        {/* Signup Card */}
        <div className="rounded-3xl bg-white border border-border shadow-xl overflow-hidden">
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
                  data-testid="text-signup-title"
                >
                  Create account
                </h1>
                <p className="text-muted-foreground/80 mt-1">
                  Join Blog Autopilot today
                </p>
              </div>
            </motion.div>

            {/* Signup Form */}
            <motion.form variants={itemVariants} onSubmit={handleSignup} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-muted-foreground/80">
                  Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    data-testid="input-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) {
                        setErrors({ ...errors, email: "" });
                      }
                    }}
                    disabled={isLoading}
                    className="h-12 text-base rounded-xl bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-muted-foreground/80">
                  Username
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    data-testid="input-username"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errors.username) {
                        setErrors({ ...errors, username: "" });
                      }
                    }}
                    disabled={isLoading}
                    className="h-12 text-base rounded-xl bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
                  />
                  {errors.username && (
                    <p className="text-xs text-red-500 mt-1">{errors.username}</p>
                  )}
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-muted-foreground/80">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="input-password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) {
                        setErrors({ ...errors, password: "" });
                      }
                    }}
                    disabled={isLoading}
                    className="h-12 text-base rounded-xl bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
                  />
                  {errors.password && (
                    <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                  )}
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-muted-foreground/80">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    data-testid="input-confirm-password"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) {
                        setErrors({ ...errors, confirmPassword: "" });
                      }
                    }}
                    disabled={isLoading}
                    className="h-12 text-base rounded-xl bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-12 text-base rounded-xl font-medium"
                data-testid="button-signup"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" />
                    Sign Up
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
            <p className="text-center text-xs text-muted-foreground/80">
              Already have an account?{" "}
              <a
                href="/admin"
                data-testid="link-login"
                className="font-medium text-foreground hover:text-muted-foreground transition-colors"
              >
                Sign in
              </a>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
