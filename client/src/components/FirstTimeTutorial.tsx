import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ExternalLink, Star } from "lucide-react";

export interface TutorialFeature {
  accentText: string;
  accentColor: "teal" | "purple" | "orange";
  subtitle: string;
  preview: React.ReactNode;
}

export interface TutorialConfig {
  badgeText: string;
  headline: string;
  features: TutorialFeature[];
  welcomeTitle: string;
  welcomeDescription: string;
  learnMoreText?: string;
  learnMoreLink?: string;
  ctaText: string;
}

// Legacy interface for backwards compatibility
export interface TutorialStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface FirstTimeTutorialProps {
  open: boolean;
  onComplete: () => void;
  config?: TutorialConfig;
  // Legacy props for backwards compatibility
  steps?: TutorialStep[];
  title?: string;
}

const accentColorClasses = {
  teal: "text-teal-500",
  purple: "text-purple-500",
  orange: "text-orange-500",
};

// Feature Preview Card Component
function FeaturePreviewCard({ feature }: { feature: TutorialFeature }) {
  return (
    <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg border border-border/50 bg-muted/30 min-h-[200px]">
      <div className="space-y-1">
        <p className={`font-semibold text-sm ${accentColorClasses[feature.accentColor]}`}>
          {feature.accentText}
        </p>
        <p className="text-xs text-muted-foreground">{feature.subtitle}</p>
      </div>
      <div className="flex-1 flex items-center justify-center w-full">
        {feature.preview}
      </div>
    </div>
  );
}

// Decorative Badge Component
function DecorativeBadge() {
  return (
    <div className="absolute -right-4 top-1/4 hidden lg:block">
      <div className="relative">
        <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center rotate-12 border border-primary/20">
          <Star className="h-12 w-12 text-primary fill-primary/20" />
        </div>
      </div>
    </div>
  );
}

export function FirstTimeTutorial({
  open,
  onComplete,
  config,
  steps,
  title = "Welcome!",
}: FirstTimeTutorialProps) {
  const handleComplete = () => {
    onComplete();
  };

  // If using new config-based approach
  if (config) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleComplete()}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          <div className="relative p-6 pb-0">
            <DecorativeBadge />

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold">
                Become a{" "}
                <Badge variant="default" className="text-sm px-3 py-1 mx-1">
                  {config.badgeText}
                </Badge>{" "}
                {config.headline}
              </h2>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {config.features.map((feature, index) => (
                <FeaturePreviewCard key={index} feature={feature} />
              ))}
            </div>

            {/* Welcome Section */}
            <div className="border-t border-border pt-4 mb-4">
              <h3 className="font-semibold text-base mb-2">{config.welcomeTitle}</h3>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                {config.welcomeDescription}
              </DialogDescription>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-t border-border">
            <div>
              {config.learnMoreLink && (
                <a
                  href={config.learnMoreLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  {config.learnMoreText || "Learn more"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <Button onClick={handleComplete}>
              {config.ctaText}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Legacy step-based approach (fallback for backwards compatibility)
  if (steps && steps.length > 0) {
    const [currentStep, setCurrentStep] = React.useState(0);

    const handleNext = () => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        setCurrentStep(0);
        handleComplete();
      }
    };

    const handlePrevious = () => {
      if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
      }
    };

    const handleSkip = () => {
      setCurrentStep(0);
      handleComplete();
    };

    const step = steps[currentStep];
    const isLastStep = currentStep === steps.length - 1;
    const isFirstStep = currentStep === 0;

    if (!step) return null;

    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{title}</h2>
              <span className="text-sm text-muted-foreground">
                {currentStep + 1} of {steps.length}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="py-6 space-y-4">
            {step.icon && (
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  {step.icon}
                </div>
              </div>
            )}
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <DialogDescription className="text-sm leading-relaxed">
                {step.description}
              </DialogDescription>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex-1 sm:flex-initial gap-1"
                >
                  Back
                </Button>
              )}
              {isFirstStep && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="flex-1 sm:flex-initial text-muted-foreground"
                >
                  Skip
                </Button>
              )}
            </div>
            <Button onClick={handleNext} className="flex-1 sm:flex-initial gap-1">
              {isLastStep ? "Ok, Got it!" : "Next"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
