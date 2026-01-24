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
  Scan
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
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-40" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 flex items-center justify-center">
            <Wand2 className="h-12 w-12 text-white" />
          </div>
        </motion.div>
        
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-white" data-testid="text-onboarding-title">
            Welcome to {siteName}
          </h1>
          <p className="text-lg text-white/60 max-w-lg mx-auto leading-relaxed" data-testid="text-onboarding-description">
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
          className="group relative overflow-hidden rounded-2xl p-px bg-gradient-to-br from-blue-500/50 via-purple-500/50 to-pink-500/50"
          data-testid="card-import-website"
        >
          <div className="relative h-full rounded-2xl bg-black/90 backdrop-blur-xl p-7 text-left">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            
            <div className="relative space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-all duration-300">
                  <Scan className="h-7 w-7 text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-white">Import from Website</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/10 text-[11px] font-medium text-white/80">
                    <Wand2 className="h-3 w-3" />
                    AI-Powered
                  </span>
                </div>
              </div>
              
              <p className="text-white/50 text-sm leading-relaxed">
                We'll analyze your existing website and automatically extract all your business information.
              </p>
              
              <div className="flex items-center text-sm text-blue-400 font-medium pt-1">
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
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
          data-testid="card-manual-entry"
        >
          <div className="relative h-full p-7 text-left">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            
            <div className="relative space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-all duration-300">
                  <FormInput className="h-7 w-7 text-white/60" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-white">Enter Manually</h3>
                  <span className="text-xs text-white/40 mt-1">~2 minutes</span>
                </div>
              </div>
              
              <p className="text-white/50 text-sm leading-relaxed">
                Fill in your business details step by step through a guided process.
              </p>
              
              <div className="flex items-center text-sm text-white/60 font-medium pt-1 group-hover:text-white/80 transition-colors">
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
            <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
              <Label htmlFor="websiteUrl" className="text-sm font-medium text-white/80 mb-3 block">
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
                  className="h-12 text-base rounded-xl bg-black/50 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:ring-blue-500/20"
                />
                <Button 
                  onClick={handleImport} 
                  disabled={isImporting || !websiteUrl.trim()}
                  size="lg"
                  className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0"
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
              <p className="text-xs text-white/40 mt-3">
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-white/10">
          <Briefcase className="h-8 w-8 text-blue-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Tell us about your business
          </h2>
          <p className="text-white/50 mt-2 max-w-md mx-auto">
            This powers AI to create content that perfectly matches your brand
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="businessDescription" className="text-sm font-medium text-white/80 flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-white/40" />
            Business Description
            <span className="text-red-400">*</span>
          </Label>
          <Textarea
            id="businessDescription"
            data-testid="textarea-onboarding-business-description"
            placeholder="What does your business do? What's your mission? What makes you unique?"
            value={formData.businessDescription}
            onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
            rows={4}
            className="resize-none text-base rounded-xl bg-black/50 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:ring-blue-500/20"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <Label htmlFor="industry" className="text-sm font-medium text-white/80 flex items-center gap-2">
              <Factory className="h-4 w-4 text-white/40" />
              Industry / Niche
            </Label>
            <Input
              id="industry"
              data-testid="input-onboarding-industry"
              placeholder="e.g., SaaS, E-commerce, Healthcare"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="h-12 text-base rounded-xl bg-black/50 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:ring-blue-500/20"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-white/80">Brand Voice</Label>
            <Select
              value={formData.brandVoice}
              onValueChange={(value) => setFormData({ ...formData, brandVoice: value })}
            >
              <SelectTrigger 
                data-testid="select-onboarding-brand-voice" 
                className="h-12 text-base rounded-xl bg-black/50 border-white/10 text-white focus:border-blue-500/50 focus:ring-blue-500/20"
              >
                <SelectValue placeholder="Select your tone..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-black/95 backdrop-blur-xl border-white/10">
                {BRAND_VOICE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="rounded-lg text-white focus:bg-white/10 focus:text-white">
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-white/50">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="valuePropositions" className="text-sm font-medium text-white/80 flex items-center gap-2">
            <Award className="h-4 w-4 text-white/40" />
            Value Propositions
          </Label>
          <Textarea
            id="valuePropositions"
            data-testid="textarea-onboarding-value-propositions"
            placeholder="What makes your offering unique? What are your key selling points?"
            value={formData.valuePropositions}
            onChange={(e) => setFormData({ ...formData, valuePropositions: e.target.value })}
            rows={3}
            className="resize-none text-base rounded-xl bg-black/50 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:ring-blue-500/20"
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-white/10">
          <Heart className="h-8 w-8 text-purple-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Who are you targeting?
          </h2>
          <p className="text-white/50 mt-2 max-w-md mx-auto">
            Understanding your audience helps AI generate more relevant content
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="targetAudience" className="text-sm font-medium text-white/80 flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-white/40" />
            Ideal Customer Profile
            <span className="text-red-400">*</span>
          </Label>
          <Textarea
            id="targetAudience"
            data-testid="textarea-onboarding-target-audience"
            placeholder="Describe your ideal customer: their role, challenges, goals, and what they're looking for..."
            value={formData.targetAudience}
            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            rows={4}
            className="resize-none text-base rounded-xl bg-black/50 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20"
          />
          <p className="text-xs text-white/40">
            Example: "Marketing managers at B2B SaaS companies who need to scale content production"
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="competitors" className="text-sm font-medium text-white/80 flex items-center gap-2">
            <Swords className="h-4 w-4 text-white/40" />
            Competitors (Optional)
          </Label>
          <Textarea
            id="competitors"
            data-testid="textarea-onboarding-competitors"
            placeholder="List your main competitors to help differentiate your content..."
            value={formData.competitors}
            onChange={(e) => setFormData({ ...formData, competitors: e.target.value })}
            rows={2}
            className="resize-none text-base rounded-xl bg-black/50 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20"
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
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5 border border-white/10">
          <Rocket className="h-8 w-8 text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Ready to launch!
          </h2>
          <p className="text-white/50 mt-2 max-w-md mx-auto">
            Review your information before we set up your content engine
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        {formData.businessDescription && (
          <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Business</p>
                <p className="text-white/90">{formData.businessDescription}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {formData.industry && (
            <div className="p-4 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Industry</p>
              <p className="text-white/90">{formData.industry}</p>
            </div>
          )}
          {formData.brandVoice && (
            <div className="p-4 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Brand Voice</p>
              <p className="text-white/90 capitalize">{formData.brandVoice}</p>
            </div>
          )}
        </div>

        {formData.targetAudience && (
          <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Heart className="h-5 w-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Target Audience</p>
                <p className="text-white/90">{formData.targetAudience}</p>
              </div>
            </div>
          </div>
        )}

        {formData.valuePropositions && (
          <div className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Award className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-1">Value Propositions</p>
                <p className="text-white/90">{formData.valuePropositions}</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {importedData && websiteUrl && (
        <motion.p variants={itemVariants} className="text-center text-xs text-white/30">
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
      <DialogContent className="max-w-4xl min-h-[650px] max-h-[90vh] overflow-hidden p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>Site Onboarding</DialogTitle>
        </VisuallyHidden>
        
        {/* Main Container with Dark Glassmorphism */}
        <div className="relative w-full h-full rounded-3xl overflow-hidden bg-black/95 backdrop-blur-3xl border border-white/10 shadow-2xl shadow-black/50">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div 
              className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl"
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
              className="absolute -bottom-1/3 -left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-purple-500/15 via-pink-500/10 to-transparent rounded-full blur-3xl"
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

          <div className="relative z-10 flex flex-col h-full max-h-[90vh]">
            {/* Progress Header */}
            {method && (
              <div className="flex-shrink-0 px-8 pt-8 pb-4">
                <div className="flex items-center justify-center gap-2 mb-5">
                  {STEPS.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-500 ${
                          index < currentStep
                            ? "bg-gradient-to-br from-green-500 to-green-600"
                            : index === currentStep
                            ? "bg-gradient-to-br from-blue-500 to-purple-500"
                            : "bg-white/5 border border-white/10"
                        }`}
                      >
                        {index < currentStep ? (
                          <Check className="h-5 w-5 text-white" />
                        ) : (
                          <step.icon className={`h-5 w-5 ${index === currentStep ? "text-white" : "text-white/40"}`} />
                        )}
                        {index === currentStep && (
                          <motion.div
                            className="absolute inset-0 rounded-xl border-2 border-white/30"
                            animate={{ scale: [1, 1.15, 1], opacity: [1, 0, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                      </motion.div>
                      {index < STEPS.length - 1 && (
                        <div className={`w-8 h-0.5 mx-1.5 rounded-full transition-all duration-500 ${
                          index < currentStep ? "bg-green-500" : "bg-white/10"
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="text-center mb-2">
                  <p className="text-xs font-medium text-white/40 uppercase tracking-widest">
                    Step {currentStep + 1} of {STEPS.length}
                  </p>
                </div>
              </div>
            )}

            {/* Content Area */}
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

            {/* Footer Navigation */}
            {method && currentStep > 0 && (
              <div className="flex-shrink-0 px-8 py-6 border-t border-white/5 bg-black/30 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleBack}
                    className="rounded-xl text-white/60 hover:text-white hover:bg-white/10"
                    data-testid="button-onboarding-back"
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back
                  </Button>

                  {currentStep < STEPS.length - 1 ? (
                    <Button 
                      size="lg" 
                      onClick={handleNext} 
                      className="rounded-xl px-8 bg-white/10 hover:bg-white/20 border border-white/10 text-white"
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
                      className="rounded-xl px-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0 text-white shadow-lg shadow-green-500/25"
                      data-testid="button-onboarding-complete"
                    >
                      {completeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Launching...
                        </>
                      ) : (
                        <>
                          <Rocket className="mr-2 h-5 w-5" />
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
