import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  FileText
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
  { id: "method", title: "Choose Method", icon: Sparkles },
  { id: "details", title: "Business Details", icon: Building2 },
  { id: "audience", title: "Your Audience", icon: Users },
  { id: "review", title: "Review & Save", icon: CheckCircle2 },
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
        title: "Website analyzed",
        description: "We've extracted your business information. Review and edit as needed.",
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
        title: "Onboarding complete!",
        description: "Your site is now set up and ready to go.",
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
      case 1: // Business Details
        if (!formData.businessDescription.trim()) {
          toast({
            title: "Business description required",
            description: "Please provide a description of your business to continue.",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case 2: // Audience
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
    // Final validation before completing
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

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  const renderMethodSelection = () => (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight" data-testid="text-onboarding-title">
          Welcome to {siteName}
        </h2>
        <p className="text-muted-foreground max-w-md" data-testid="text-onboarding-description">
          Let's set up your site. How would you like to get started?
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 w-full max-w-2xl">
        <Card 
          className="cursor-pointer hover-elevate transition-all duration-200 border-2"
          onClick={() => handleMethodSelect("import")}
          data-testid="card-import-website"
        >
          <CardContent className="flex flex-col items-center p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Import from Website</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We'll analyze your existing website and auto-fill your business profile
              </p>
            </div>
            <div className="flex items-center text-sm text-primary font-medium">
              Recommended <Sparkles className="ml-1 h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover-elevate transition-all duration-200 border-2"
          onClick={() => handleMethodSelect("manual")}
          data-testid="card-manual-entry"
        >
          <CardContent className="flex flex-col items-center p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Pencil className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Enter Manually</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Fill in your business details step by step
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Takes about 5 minutes
            </div>
          </CardContent>
        </Card>
      </div>

      {method === "import" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Your Website URL</Label>
            <div className="flex gap-2">
              <Input
                id="websiteUrl"
                data-testid="input-website-url"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={isImporting}
              />
              <Button 
                onClick={handleImport} 
                disabled={isImporting || !websiteUrl.trim()}
                data-testid="button-import-website"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Import
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              We'll scan your website to understand your business and pre-fill the form
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );

  const renderBusinessDetails = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-xl font-semibold tracking-tight flex items-center justify-center gap-2">
          <Building2 className="h-5 w-5" />
          Tell us about your business
        </h2>
        <p className="text-muted-foreground">
          This information helps AI generate content that matches your brand
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="businessDescription">
            <FileText className="inline h-4 w-4 mr-1" />
            Business Description
          </Label>
          <Textarea
            id="businessDescription"
            data-testid="textarea-onboarding-business-description"
            placeholder="Describe what your business does, your mission, and what makes you unique..."
            value={formData.businessDescription}
            onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
            rows={4}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="industry">Industry / Niche</Label>
            <Input
              id="industry"
              data-testid="input-onboarding-industry"
              placeholder="e.g., SaaS, E-commerce, Healthcare..."
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Brand Voice</Label>
            <Select
              value={formData.brandVoice}
              onValueChange={(value) => setFormData({ ...formData, brandVoice: value })}
            >
              <SelectTrigger data-testid="select-onboarding-brand-voice">
                <SelectValue placeholder="Select a tone..." />
              </SelectTrigger>
              <SelectContent>
                {BRAND_VOICE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground ml-2">- {option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="valuePropositions">
            <Trophy className="inline h-4 w-4 mr-1" />
            Value Propositions
          </Label>
          <Textarea
            id="valuePropositions"
            data-testid="textarea-onboarding-value-propositions"
            placeholder="What makes your offering unique? List your key selling points..."
            value={formData.valuePropositions}
            onChange={(e) => setFormData({ ...formData, valuePropositions: e.target.value })}
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  const renderAudience = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-xl font-semibold tracking-tight flex items-center justify-center gap-2">
          <Users className="h-5 w-5" />
          Who are you targeting?
        </h2>
        <p className="text-muted-foreground">
          Understanding your audience helps generate more relevant content
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="targetAudience">
            <Target className="inline h-4 w-4 mr-1" />
            Target Audience (ICP)
          </Label>
          <Textarea
            id="targetAudience"
            data-testid="textarea-onboarding-target-audience"
            placeholder="Describe your ideal customer: their role, challenges, goals, and what they're looking for..."
            value={formData.targetAudience}
            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Example: "Marketing managers at B2B SaaS companies who need to scale content production"
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="competitors">Competitors</Label>
          <Textarea
            id="competitors"
            data-testid="textarea-onboarding-competitors"
            placeholder="List your main competitors (optional)..."
            value={formData.competitors}
            onChange={(e) => setFormData({ ...formData, competitors: e.target.value })}
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            Helps AI understand your market positioning and differentiate your content
          </p>
        </div>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-xl font-semibold tracking-tight flex items-center justify-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Review your information
        </h2>
        <p className="text-muted-foreground">
          Make sure everything looks good before we set up your site
        </p>
      </div>

      <div className="grid gap-4">
        {formData.businessDescription && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Business Description</p>
                  <p className="text-sm text-muted-foreground mt-1">{formData.businessDescription}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {formData.industry && (
            <Card>
              <CardContent className="p-4">
                <p className="font-medium text-sm">Industry</p>
                <p className="text-sm text-muted-foreground mt-1">{formData.industry}</p>
              </CardContent>
            </Card>
          )}
          {formData.brandVoice && (
            <Card>
              <CardContent className="p-4">
                <p className="font-medium text-sm">Brand Voice</p>
                <p className="text-sm text-muted-foreground mt-1 capitalize">{formData.brandVoice}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {formData.targetAudience && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Target Audience</p>
                  <p className="text-sm text-muted-foreground mt-1">{formData.targetAudience}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {formData.valuePropositions && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Trophy className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Value Propositions</p>
                  <p className="text-sm text-muted-foreground mt-1">{formData.valuePropositions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {importedData && websiteUrl && (
        <div className="text-center text-xs text-muted-foreground">
          Imported from: {websiteUrl}
        </div>
      )}
    </div>
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          {method && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {STEPS.map((step, index) => (
                    <div
                      key={step.id}
                      className={`flex items-center gap-1 text-sm ${
                        index <= currentStep ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <step.icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{step.title}</span>
                      {index < STEPS.length - 1 && (
                        <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Progress value={progress} className="h-1" data-testid="progress-onboarding" />
            </div>
          )}

          <AnimatePresence mode="wait" custom={currentStep}>
            <motion.div
              key={method ? currentStep : "method"}
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          {method && currentStep > 0 && (
            <div className="flex items-center justify-between mt-8 pt-4 border-t">
              <Button
                variant="ghost"
                onClick={handleBack}
                data-testid="button-onboarding-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button onClick={handleNext} data-testid="button-onboarding-next">
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={handleComplete} 
                  disabled={completeMutation.isPending}
                  data-testid="button-onboarding-complete"
                >
                  {completeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle2 className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
