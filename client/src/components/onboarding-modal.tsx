import { useState } from "react";
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
  Globe, 
  Pencil, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2,
  Building2,
  Users,
  Target,
  Sparkles,
  Trophy,
  FileText,
  Zap,
  Clock,
  ChevronRight
} from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  siteName: string;
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
  { id: "method", title: "Get Started", icon: Sparkles },
  { id: "details", title: "Your Business", icon: Building2 },
  { id: "audience", title: "Your Audience", icon: Users },
  { id: "review", title: "Launch", icon: CheckCircle2 },
];

const BRAND_VOICE_OPTIONS = [
  { value: "professional", label: "Professional", description: "Formal and business-focused" },
  { value: "casual", label: "Casual", description: "Relaxed and approachable" },
  { value: "authoritative", label: "Authoritative", description: "Expert and confident" },
  { value: "friendly", label: "Friendly", description: "Warm and personable" },
  { value: "technical", label: "Technical", description: "Detailed and precise" },
  { value: "conversational", label: "Conversational", description: "Natural and engaging" },
];

export function OnboardingModal({ open, onOpenChange, siteId, siteName }: OnboardingModalProps) {
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
      return response.json();
    },
    onSuccess: (data) => {
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
        title: "Website analyzed successfully",
        description: "We've extracted your business information. Review and customize as needed.",
      });
    },
    onError: (error: Error) => {
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

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
    },
  };

  const slideVariants = {
    enter: { opacity: 0, x: 40, scale: 0.98 },
    center: { 
      opacity: 1, 
      x: 0, 
      scale: 1,
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
    },
    exit: { 
      opacity: 0, 
      x: -40, 
      scale: 0.98,
      transition: { duration: 0.3 }
    },
  };

  const renderMethodSelection = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center min-h-[500px] px-4"
    >
      <motion.div variants={itemVariants} className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent mb-4">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text" data-testid="text-onboarding-title">
          Welcome to {siteName}
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto" data-testid="text-onboarding-description">
          Let's personalize your content experience. This takes just a minute.
        </p>
      </motion.div>
      
      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2 w-full max-w-2xl">
        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleMethodSelect("import")}
          className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/5 to-transparent p-8 text-left transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
          data-testid="card-import-website"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="relative space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
              <Globe className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-xl">Import from Website</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <Zap className="h-3 w-3" />
                  Recommended
                </span>
              </div>
              <p className="text-muted-foreground">
                We'll analyze your website and automatically configure everything for you.
              </p>
            </div>
            <div className="flex items-center text-sm text-primary font-medium pt-2">
              <span>Get started instantly</span>
              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleMethodSelect("manual")}
          className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-8 text-left transition-all duration-300 hover:border-border hover:shadow-lg"
          data-testid="card-manual-entry"
        >
          <div className="relative space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-muted group-hover:bg-muted/80 transition-colors duration-300">
              <Pencil className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-xl mb-2">Enter Manually</h3>
              <p className="text-muted-foreground">
                Fill in your business details step by step through a guided process.
              </p>
            </div>
            <div className="flex items-center text-sm text-muted-foreground pt-2">
              <Clock className="mr-1 h-4 w-4" />
              <span>Takes about 2 minutes</span>
            </div>
          </div>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {method === "import" && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-lg mt-10 overflow-hidden"
          >
            <div className="p-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent backdrop-blur-sm">
              <Label htmlFor="websiteUrl" className="text-base font-medium mb-3 block">
                Your Website URL
              </Label>
              <div className="flex gap-3">
                <Input
                  id="websiteUrl"
                  data-testid="input-website-url"
                  placeholder="https://yourwebsite.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  disabled={isImporting}
                  className="h-12 text-base rounded-xl border-primary/20 bg-background/50 focus:border-primary"
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
                      Analyze
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                We'll scan your website and extract business information automatically
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
      className="space-y-8 px-2"
    >
      <motion.div variants={itemVariants} className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 mb-2">
          <Building2 className="h-8 w-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          Tell us about your business
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          This helps our AI create content that perfectly matches your brand
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="businessDescription" className="text-base font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Business Description
            <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="businessDescription"
            data-testid="textarea-onboarding-business-description"
            placeholder="What does your business do? What's your mission? What makes you unique?"
            value={formData.businessDescription}
            onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
            rows={4}
            className="resize-none text-base rounded-xl border-border/50 focus:border-primary transition-colors"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label htmlFor="industry" className="text-base font-medium">Industry / Niche</Label>
            <Input
              id="industry"
              data-testid="input-onboarding-industry"
              placeholder="e.g., SaaS, E-commerce, Healthcare"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="h-12 text-base rounded-xl border-border/50 focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Brand Voice</Label>
            <Select
              value={formData.brandVoice}
              onValueChange={(value) => setFormData({ ...formData, brandVoice: value })}
            >
              <SelectTrigger data-testid="select-onboarding-brand-voice" className="h-12 text-base rounded-xl border-border/50 focus:border-primary transition-colors">
                <SelectValue placeholder="Select your tone..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {BRAND_VOICE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="rounded-lg">
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="valuePropositions" className="text-base font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            Value Propositions
          </Label>
          <Textarea
            id="valuePropositions"
            data-testid="textarea-onboarding-value-propositions"
            placeholder="What makes your offering unique? What are your key selling points?"
            value={formData.valuePropositions}
            onChange={(e) => setFormData({ ...formData, valuePropositions: e.target.value })}
            rows={3}
            className="resize-none text-base rounded-xl border-border/50 focus:border-primary transition-colors"
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
      className="space-y-8 px-2"
    >
      <motion.div variants={itemVariants} className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 mb-2">
          <Users className="h-8 w-8 text-purple-500" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          Who are you targeting?
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Understanding your audience helps us generate more relevant content
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="targetAudience" className="text-base font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Ideal Customer Profile
            <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="targetAudience"
            data-testid="textarea-onboarding-target-audience"
            placeholder="Describe your ideal customer: their role, challenges, goals, and what they're looking for..."
            value={formData.targetAudience}
            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            rows={4}
            className="resize-none text-base rounded-xl border-border/50 focus:border-primary transition-colors"
          />
          <p className="text-sm text-muted-foreground">
            Example: "Marketing managers at B2B SaaS companies who need to scale content production"
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="competitors" className="text-base font-medium">
            Competitors (Optional)
          </Label>
          <Textarea
            id="competitors"
            data-testid="textarea-onboarding-competitors"
            placeholder="List your main competitors to help differentiate your content..."
            value={formData.competitors}
            onChange={(e) => setFormData({ ...formData, competitors: e.target.value })}
            rows={2}
            className="resize-none text-base rounded-xl border-border/50 focus:border-primary transition-colors"
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
      className="space-y-8 px-2"
    >
      <motion.div variants={itemVariants} className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5 mb-2">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          You're all set!
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Review your information and launch your personalized content experience
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        {formData.businessDescription && (
          <div className="p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-muted-foreground mb-1">Business Description</p>
                <p className="text-foreground">{formData.businessDescription}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {formData.industry && (
            <div className="p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50">
              <p className="font-medium text-sm text-muted-foreground mb-1">Industry</p>
              <p className="text-foreground">{formData.industry}</p>
            </div>
          )}
          {formData.brandVoice && (
            <div className="p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50">
              <p className="font-medium text-sm text-muted-foreground mb-1">Brand Voice</p>
              <p className="text-foreground capitalize">{formData.brandVoice}</p>
            </div>
          )}
        </div>

        {formData.targetAudience && (
          <div className="p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-muted-foreground mb-1">Target Audience</p>
                <p className="text-foreground">{formData.targetAudience}</p>
              </div>
            </div>
          </div>
        )}

        {formData.valuePropositions && (
          <div className="p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-muted-foreground mb-1">Value Propositions</p>
                <p className="text-foreground">{formData.valuePropositions}</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {importedData && websiteUrl && (
        <motion.p variants={itemVariants} className="text-center text-sm text-muted-foreground">
          Imported from: {websiteUrl}
        </motion.p>
      )}
    </motion.div>
  );

  const renderStepContent = () => {
    if (!method) {
      return renderMethodSelection();
    }

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
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl min-h-[600px] max-h-[90vh] overflow-hidden p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>Site Onboarding</DialogTitle>
        </VisuallyHidden>
        
        <div className="relative w-full h-full rounded-3xl overflow-hidden bg-background/95 backdrop-blur-2xl border border-border/50 shadow-2xl">
          {/* Gradient background effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-transparent rounded-full blur-3xl" />
            <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-purple-500/5 via-transparent to-transparent rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col h-full max-h-[90vh]">
            {/* Progress header */}
            {method && (
              <div className="flex-shrink-0 px-8 pt-8 pb-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                  {STEPS.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${
                          index < currentStep
                            ? "bg-primary text-primary-foreground"
                            : index === currentStep
                            ? "bg-primary/20 text-primary border-2 border-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {index < currentStep ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <step.icon className="h-5 w-5" />
                        )}
                      </div>
                      {index < STEPS.length - 1 && (
                        <div className={`w-12 h-0.5 mx-2 rounded-full transition-all duration-300 ${
                          index < currentStep ? "bg-primary" : "bg-muted"
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    data-testid="progress-onboarding"
                  />
                </div>
              </div>
            )}

            {/* Content area */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={method ? currentStep : "method"}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer navigation */}
            {method && currentStep > 0 && (
              <div className="flex-shrink-0 px-8 py-6 border-t border-border/50 bg-background/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleBack}
                    className="rounded-xl"
                    data-testid="button-onboarding-back"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back
                  </Button>

                  {currentStep < STEPS.length - 1 ? (
                    <Button 
                      size="lg" 
                      onClick={handleNext} 
                      className="rounded-xl px-8"
                      data-testid="button-onboarding-next"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  ) : (
                    <Button 
                      size="lg"
                      onClick={handleComplete} 
                      disabled={completeMutation.isPending}
                      className="rounded-xl px-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                      data-testid="button-onboarding-complete"
                    >
                      {completeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Launching...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Launch Site
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
