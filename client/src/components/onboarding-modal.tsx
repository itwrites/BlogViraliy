import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  Check,
  Wand2,
  FormInput,
  Briefcase,
  Heart,
  Rocket,
  MessageSquareText,
  Award,
  Factory,
  Crosshair,
  Swords,
  Scan,
  Globe
} from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  siteName: string;
  onComplete?: () => void;
}

interface OnboardingData {
  businessDescription: string;
  targetAudience: string;
  brandVoice: string;
  valuePropositions: string;
  industry: string;
  competitors: string;
  suggestedTitle: string;
  suggestedMetaDescription: string;
}

type OnboardingMethod = "import" | "manual" | null;

const STEPS = [
  { id: "method", title: "Start", icon: Wand2 },
  { id: "details", title: "Business", icon: Briefcase },
  { id: "audience", title: "Audience", icon: Heart },
  { id: "review", title: "Launch", icon: Rocket },
];

const BRAND_VOICE_OPTIONS = [
  { value: "professional", label: "Professional", description: "Formal and business-focused" },
  { value: "casual", label: "Casual", description: "Relaxed and approachable" },
  { value: "authoritative", label: "Authoritative", description: "Expert and confident" },
  { value: "friendly", label: "Friendly", description: "Warm and personable" },
  { value: "technical", label: "Technical", description: "Detailed and precise" },
  { value: "conversational", label: "Conversational", description: "Natural and engaging" },
];

export function OnboardingModal({ open, onOpenChange, siteId, siteName, onComplete }: OnboardingModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [method, setMethod] = useState<OnboardingMethod>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importedData, setImportedData] = useState<OnboardingData | null>(null);
  
  const [formData, setFormData] = useState<OnboardingData>({
    businessDescription: "",
    targetAudience: "",
    brandVoice: "",
    valuePropositions: "",
    industry: "",
    competitors: "",
    suggestedTitle: "",
    suggestedMetaDescription: "",
  });

  const scrapeMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", `/api/sites/${siteId}/onboarding/scrape`, { url });
      const data = await response.json();
      console.log("[Onboarding] Scrape response:", data);
      return data;
    },
    onSuccess: (data) => {
      console.log("[Onboarding] Setting form data from scrape:", data);
      setImportedData(data);
      setFormData({
        businessDescription: data.businessDescription || "",
        targetAudience: data.targetAudience || "",
        brandVoice: data.brandVoice || "",
        valuePropositions: data.valuePropositions || "",
        industry: data.industry || "",
        competitors: data.competitors || "",
        suggestedTitle: data.suggestedTitle || "",
        suggestedMetaDescription: data.suggestedMetaDescription || "",
      });
      setIsImporting(false);
      setCurrentStep(1);
      toast({
        title: "Website analyzed",
        description: "We've extracted your business information. Review and customize as needed.",
      });
    },
    onError: (error: Error) => {
      console.error("[Onboarding] Scrape error:", error);
      setIsImporting(false);
      toast({
        title: "Import failed",
        description: error.message || "Could not analyze the website. Please try again or enter details manually.",
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        businessDescription: formData.businessDescription,
        targetAudience: formData.targetAudience,
        brandVoice: formData.brandVoice,
        valuePropositions: formData.valuePropositions,
        industry: formData.industry,
        competitors: formData.competitors,
        onboardingSourceUrl: method === "import" ? websiteUrl : undefined,
        siteName: formData.suggestedTitle || undefined,
      };
      const response = await apiRequest("POST", `/api/sites/${siteId}/onboarding/complete`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sites", siteId] });
      queryClient.invalidateQueries({ queryKey: ["/api/sites"] });
      toast({
        title: "You're all set!",
        description: "Your site is configured and ready to create amazing content.",
      });
      onOpenChange(false);
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!websiteUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter your website URL to import.",
        variant: "destructive",
      });
      return;
    }
    setIsImporting(true);
    scrapeMutation.mutate(websiteUrl);
  };

  const handleMethodSelect = (selectedMethod: OnboardingMethod) => {
    setMethod(selectedMethod);
    if (selectedMethod === "manual") {
      setCurrentStep(1);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.suggestedTitle.trim()) {
          toast({
            title: "Site name required",
            description: "Please enter a name for your site to continue.",
            variant: "destructive",
          });
          return false;
        }
        if (!formData.businessDescription.trim()) {
          toast({
            title: "Business description required",
            description: "Please provide a description of your business to continue.",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case 2:
        if (!formData.targetAudience.trim()) {
          toast({
            title: "Target audience required",
            description: "Please describe your target audience to continue.",
            variant: "destructive",
          });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setMethod(null);
    }
  };

  const handleComplete = () => {
    if (!formData.suggestedTitle.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a site name before completing setup.",
        variant: "destructive",
      });
      setCurrentStep(1);
      return;
    }
    if (!formData.businessDescription.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a business description before completing setup.",
        variant: "destructive",
      });
      setCurrentStep(1);
      return;
    }
    completeMutation.mutate();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    },
  };

  const slideVariants = {
    enter: { opacity: 0, x: 60, filter: "blur(4px)" },
    center: { 
      opacity: 1, 
      x: 0, 
      filter: "blur(0px)",
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    },
    exit: { 
      opacity: 0, 
      x: -60, 
      filter: "blur(4px)",
      transition: { duration: 0.3 }
    },
  };

  const renderMethodSelection = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center min-h-[520px] px-6"
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} className="text-center space-y-5 mb-10">
        <motion.div 
          className="relative inline-flex"
          animate={{ 
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-primary/20 to-primary/10 rounded-3xl blur-2xl opacity-20" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-muted/70 to-white backdrop-blur-xl border border-border flex items-center justify-center shadow-lg">
            <Wand2 className="h-12 w-12 text-foreground" />
          </div>
        </motion.div>
        
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-foreground" data-testid="text-onboarding-title">
            Welcome to {siteName}
          </h1>
          <p className="text-lg text-muted-foreground/80 max-w-lg mx-auto leading-relaxed" data-testid="text-onboarding-description">
            Let's personalize your content engine. This takes just a minute.
          </p>
        </div>
      </motion.div>
      
      {/* Method Cards */}
      <motion.div variants={itemVariants} className="grid gap-5 md:grid-cols-2 w-full max-w-2xl">
        {/* Import Card */}
        <motion.button
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleMethodSelect("import")}
          className="group relative overflow-hidden rounded-2xl p-px bg-gradient-to-br from-primary/40 via-primary/25 to-primary/10"
          data-testid="card-import-website"
        >
          <div className="relative h-full rounded-2xl bg-white backdrop-blur-xl p-7 text-left">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            
            <div className="relative space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-border flex items-center justify-center group-hover:border-primary/30 transition-all duration-300">
                  <Scan className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-foreground">Import from Website</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-border text-[11px] font-medium text-foreground">
                    <Wand2 className="h-3 w-3" />
                    AI-Powered
                  </span>
                </div>
              </div>
              
              <p className="text-muted-foreground/80 text-sm leading-relaxed">
                We'll analyze your existing website and automatically extract all your business information.
              </p>
              
              <div className="flex items-center text-sm text-primary font-medium pt-1">
                <span>Get started instantly</span>
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </motion.button>

        {/* Manual Card */}
        <motion.button
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleMethodSelect("manual")}
          className="group relative overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
          data-testid="card-manual-entry"
        >
          <div className="relative h-full p-7 text-left">
            <div className="absolute inset-0 bg-gradient-to-br from-muted/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            
            <div className="relative space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center group-hover:border-muted transition-all duration-300">
                  <FormInput className="h-7 w-7 text-muted-foreground/80" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">Enter Manually</h3>
                  <span className="text-xs text-muted-foreground/70 mt-1">~2 minutes</span>
                </div>
              </div>
              
              <p className="text-muted-foreground/80 text-sm leading-relaxed">
                Fill in your business details step by step through a guided process.
              </p>
              
              <div className="flex items-center text-sm text-muted-foreground/80 font-medium pt-1 group-hover:text-foreground transition-colors">
                <span>Start from scratch</span>
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </motion.button>
      </motion.div>

      {/* Import URL Input */}
      <AnimatePresence>
        {method === "import" && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-xl mt-5 overflow-hidden"
          >
            <div className="p-6 rounded-2xl bg-white border border-border shadow-sm">
              <Label htmlFor="websiteUrl" className="text-sm font-medium text-foreground mb-3 block">
                Enter your website URL
              </Label>
              <div className="flex gap-3">
                <Input
                  id="websiteUrl"
                  data-testid="input-website-url"
                  placeholder="https://yourwebsite.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={isImporting}
                  className="h-12 text-base rounded-xl bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
                />
                <Button 
                  onClick={handleImport} 
                  disabled={isImporting || !websiteUrl.trim()}
                  size="lg"
                  className="h-12 px-6 rounded-xl"
                  data-testid="button-import-website"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Scan className="mr-2 h-5 w-5" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-3">
                We'll scan your website and extract business information using AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderBusinessDetails = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 px-4"
    >
      <motion.div variants={itemVariants} className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/12 to-primary/5 border border-border">
          <Briefcase className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Tell us about your business
          </h2>
          <p className="text-muted-foreground/80 mt-2 max-w-md mx-auto">
            This powers AI to create content that perfectly matches your brand
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="siteName" className="text-sm font-medium text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground/70" />
            Site Name
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="siteName"
            data-testid="input-onboarding-site-name"
            placeholder="My Awesome Blog"
            value={formData.suggestedTitle}
            onChange={(e) => setFormData({ ...formData, suggestedTitle: e.target.value })}
            className="h-12 text-base rounded-xl bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
          />
          <p className="text-xs text-muted-foreground/70">This will be your site's display name</p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="businessDescription" className="text-sm font-medium text-foreground flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-muted-foreground/70" />
            Business Description
            <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="businessDescription"
            data-testid="textarea-onboarding-business-description"
            placeholder="What does your business do? What's your mission? What makes you unique?"
            value={formData.businessDescription}
            onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
            rows={4}
            className="resize-none text-base rounded-xl bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <Label htmlFor="industry" className="text-sm font-medium text-foreground flex items-center gap-2">
              <Factory className="h-4 w-4 text-muted-foreground/70" />
              Industry / Niche
            </Label>
            <Input
              id="industry"
              data-testid="input-onboarding-industry"
              placeholder="e.g., SaaS, E-commerce, Healthcare"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="h-12 text-base rounded-xl bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Brand Voice</Label>
            <Select
              value={formData.brandVoice}
              onValueChange={(value) => setFormData({ ...formData, brandVoice: value })}
            >
              <SelectTrigger 
                data-testid="select-onboarding-brand-voice" 
                className="h-12 text-base rounded-xl bg-white border-border text-foreground focus:border-primary/40 focus:ring-primary/20"
              >
                <SelectValue placeholder="Select your tone..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-white border-border">
                {BRAND_VOICE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="rounded-lg text-foreground focus:bg-muted">
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground/80">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="valuePropositions" className="text-sm font-medium text-foreground flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground/70" />
            Value Propositions
          </Label>
          <Textarea
            id="valuePropositions"
            data-testid="textarea-onboarding-value-propositions"
            placeholder="What makes your offering unique? What are your key selling points?"
            value={formData.valuePropositions}
            onChange={(e) => setFormData({ ...formData, valuePropositions: e.target.value })}
            rows={3}
            className="resize-none text-base rounded-xl bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
          />
        </div>
      </motion.div>
    </motion.div>
  );

  const renderAudience = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 px-4"
    >
      <motion.div variants={itemVariants} className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 border border-border">
          <Heart className="h-8 w-8 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Who are you targeting?
          </h2>
          <p className="text-muted-foreground/80 mt-2 max-w-md mx-auto">
            Understanding your audience helps AI generate more relevant content
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="targetAudience" className="text-sm font-medium text-foreground flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-muted-foreground/70" />
            Ideal Customer Profile
            <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="targetAudience"
            data-testid="textarea-onboarding-target-audience"
            placeholder="Describe your ideal customer: their role, challenges, goals, and what they're looking for..."
            value={formData.targetAudience}
            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            rows={4}
            className="resize-none text-base rounded-xl bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
          />
          <p className="text-xs text-muted-foreground/70">
            Example: "Marketing managers at B2B SaaS companies who need to scale content production"
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="competitors" className="text-sm font-medium text-foreground flex items-center gap-2">
            <Swords className="h-4 w-4 text-muted-foreground/70" />
            Competitors (Optional)
          </Label>
          <Textarea
            id="competitors"
            data-testid="textarea-onboarding-competitors"
            placeholder="List your main competitors to help differentiate your content..."
            value={formData.competitors}
            onChange={(e) => setFormData({ ...formData, competitors: e.target.value })}
            rows={3}
            className="resize-none text-base rounded-xl bg-white border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:ring-primary/20"
          />
        </div>
      </motion.div>
    </motion.div>
  );

  const renderReview = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 px-4"
    >
      <motion.div variants={itemVariants} className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 border border-border">
          <Rocket className="h-8 w-8 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Ready to launch!
          </h2>
          <p className="text-muted-foreground/80 mt-2 max-w-md mx-auto">
            Review your settings and start creating amazing content
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground/80 mb-2">Site Name</h4>
          <p className="text-foreground text-lg font-semibold">{formData.suggestedTitle || <span className="text-muted-foreground/70 italic">Not provided</span>}</p>
        </div>

        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground/80 mb-2">Business Description</h4>
          <p className="text-foreground">{formData.businessDescription || <span className="text-muted-foreground/70 italic">Not provided</span>}</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h4 className="text-sm font-medium text-muted-foreground/80 mb-2">Industry</h4>
            <p className="text-foreground">{formData.industry || <span className="text-muted-foreground/70 italic">Not specified</span>}</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <h4 className="text-sm font-medium text-muted-foreground/80 mb-2">Brand Voice</h4>
            <p className="text-foreground capitalize">{formData.brandVoice || <span className="text-muted-foreground/70 italic">Not specified</span>}</p>
          </div>
        </div>
        
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground/80 mb-2">Target Audience</h4>
          <p className="text-foreground">{formData.targetAudience || <span className="text-muted-foreground/70 italic">Not provided</span>}</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="pt-4">
        <Button 
          onClick={handleComplete} 
          disabled={completeMutation.isPending}
          size="lg"
          className="w-full h-14 rounded-xl text-base font-medium"
          data-testid="button-complete-onboarding"
        >
          {completeMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              <Check className="mr-2 h-5 w-5" />
              Complete Setup
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );

  const renderStep = () => {
    if (!method) return renderMethodSelection();
    
    switch (currentStep) {
      case 0:
        return renderMethodSelection();
      case 1:
        return renderBusinessDetails();
      case 2:
        return renderAudience();
      case 3:
        return renderReview();
      default:
        return renderMethodSelection();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 flex flex-col bg-background border border-border">
        <VisuallyHidden>
          <DialogTitle>Site Onboarding</DialogTitle>
        </VisuallyHidden>
        
        {/* Progress bar */}
        {method && currentStep > 0 && (
          <div className="border-b border-border bg-white p-4">
            <div className="flex items-center justify-between max-w-md mx-auto">
              {STEPS.slice(1).map((step, index) => {
                const stepIndex = index + 1;
                const isActive = currentStep === stepIndex;
                const isCompleted = currentStep > stepIndex;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center gap-2 ${
                      isActive ? "text-foreground" : isCompleted ? "text-emerald-600" : "text-muted-foreground/70"
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isActive ? "bg-primary text-white" : 
                        isCompleted ? "bg-emerald-100 text-emerald-600" : 
                        "bg-muted text-muted-foreground/70"
                      }`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : stepIndex}
                      </div>
                      <span className="text-sm font-medium hidden sm:block">{step.title}</span>
                    </div>
                    {index < STEPS.length - 2 && (
                      <div className={`w-12 h-0.5 mx-2 ${
                        isCompleted ? "bg-emerald-300" : "bg-border"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 py-8 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        {method && currentStep > 0 && currentStep < 3 && (
          <div className="border-t border-border bg-white p-4 flex justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="gap-2"
              data-testid="button-next"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
