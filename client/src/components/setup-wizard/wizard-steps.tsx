import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardStepsProps {
    currentStep: number;
    totalSteps: number;
    steps: { title: string; description: string }[];
    onStepClick?: (step: number) => void;
}

export function WizardSteps({ currentStep, steps, onStepClick }: WizardStepsProps) {
    return (
        <div className="w-full max-w-xs space-y-8">
            <div className="space-y-2">
                <h2 className="text-lg font-semibold tracking-tight">Setup Guide</h2>
                <p className="text-sm text-muted-foreground">Follow these steps to launch your blog.</p>
            </div>

            <div className="relative space-y-0">
                <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-muted -z-10" />

                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;
                    const isFuture = stepNumber > currentStep;

                    return (
                        <div
                            key={index}
                            className={cn(
                                "group flex gap-4 pt-6 pb-2 relative bg-background",
                                onStepClick && !isFuture ? "cursor-pointer" : ""
                            )}
                            onClick={() => onStepClick && !isFuture ? onStepClick(stepNumber) : undefined}
                        >
                            <div className={cn(
                                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                                isCompleted ? "bg-primary border-primary text-primary-foreground" :
                                    isCurrent ? "bg-background border-primary ring-4 ring-primary/20" :
                                        "bg-background border-muted-foreground/30 text-muted-foreground"
                            )}>
                                {isCompleted ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <span className="text-xs font-medium">{stepNumber}</span>
                                )}
                            </div>
                            <div className="flex flex-col pt-1">
                                <span className={cn(
                                    "text-sm font-medium leading-none transition-colors",
                                    isFuture ? "text-muted-foreground" : "text-foreground"
                                )}>
                                    {step.title}
                                </span>
                                <span className="text-xs text-muted-foreground mt-1">
                                    {step.description}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
