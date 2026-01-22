import { WizardSteps } from "@/components/setup-wizard/wizard-steps";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Site } from "@shared/schema";
import { useState } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { useSiteMode } from "@/hooks/use-site-mode";
import { Step1Branding } from "@/components/setup-wizard/step-1-branding";
import { Step2Design } from "@/components/setup-wizard/step-2-design";
import { Step3Business } from "@/components/setup-wizard/step-3-business";
import { Step4Content } from "@/components/setup-wizard/step-4-content";
import { Step5Launch } from "@/components/setup-wizard/step-5-launch";
import { apiRequest } from "@/lib/queryClient";

// Placeholder components for other steps
const Stepplaceholder = ({ title, onNext }: { title: string, onNext: () => void }) => (
    <div className="space-y-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-muted-foreground">Component coming soon...</p>
        <Button onClick={onNext}>Next Step</Button>
    </div>
);

interface SetupWizardProps {
    site: Site;
}

const STEPS = [
    { title: "Domain & Branding", description: "Identity and basics" },
    { title: "Template & Design", description: "Look and feel" },
    { title: "Business Context", description: "Tailor AI content" },
    { title: "Content Strategy", description: "Automation rules" },
    { title: "Launch Check", description: "Review and go live" },
];

export function SetupWizard({ site }: SetupWizardProps) {
    const { setMode } = useSiteMode(site.id);
    // Initialize with wizardProgress from DB or 1
    const [currentStep, setCurrentStep] = useState(site.wizardProgress && site.wizardProgress > 0 ? (site.wizardProgress + 1 > 5 ? 5 : site.wizardProgress + 1) : 1);

    const updateProgress = async (step: number) => {
        try {
            await apiRequest("PATCH", `/api/sites/${site.id}`, {
                wizardProgress: step
            });
        } catch (e) {
            console.error("Failed to save wizard progress", e);
        }
    };

    const handleNext = () => {
        const nextStep = currentStep + 1;
        if (nextStep <= STEPS.length + 1) {
            setCurrentStep(Math.min(nextStep, STEPS.length));
            updateProgress(nextStep - 1);
        }
    };

    const handleStepClick = (step: number) => {
        // Only allow navigating to previous steps or current step
        // Or if we want to allow jumping forward if already completed?
        // Let's simplistic: allow jumping to any step <= stored progress + 1
        const maxAllowed = (site.wizardProgress || 0) + 1;
        // Also allow if we are just clicking previous steps even if not fully done
        // Actually, just allow navigation to any step provided previous ones are done
        // But for now, let's just use current logic
        setCurrentStep(step);
    };

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Sidebar */}
            <aside className="w-80 border-r bg-muted/30 flex flex-col">
                <div className="p-6 border-b">
                    <div className="flex items-center gap-2 font-bold text-xl mb-1">
                        <span className="bg-primary text-primary-foreground w-8 h-8 rounded-lg flex items-center justify-center">B</span>
                        Blog Virality
                    </div>
                    <p className="text-xs text-muted-foreground ml-10">Admin Setup</p>
                </div>

                <ScrollArea className="flex-1 px-6 py-8">
                    <WizardSteps
                        currentStep={currentStep}
                        totalSteps={STEPS.length}
                        steps={STEPS}
                        onStepClick={handleStepClick}
                    />
                </ScrollArea>

                <div className="p-6 border-t bg-background/50 backdrop-blur-sm">
                    <div className="flex flex-col gap-2">
                        <p className="text-xs text-center text-muted-foreground mb-2">Need more control?</p>
                        <ModeToggle mode="beginner" onModeChange={(m) => setMode(m)} className="mx-auto" />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-background">
                <div className="h-full max-w-5xl mx-auto p-12">
                    {currentStep === 1 && <Step1Branding site={site} onNext={handleNext} />}
                    {currentStep === 2 && <Step2Design site={site} onNext={handleNext} />}
                    {currentStep === 3 && <Step3Business site={site} onNext={handleNext} />}
                    {currentStep === 4 && <Step4Content site={site} onNext={handleNext} />}
                    {currentStep === 5 && <Step5Launch site={site} onNext={handleNext} />}
                </div>
            </main>
        </div>
    );
}
