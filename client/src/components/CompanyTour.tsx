import * as React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui/button";
import { useCompanyTour, TourStep } from "../contexts/CompanyTourContext";

interface TourTooltipProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  targetRect: DOMRect | null;
}

function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  targetRect,
}: TourTooltipProps) {
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState<"top" | "bottom" | "left" | "right">("left");
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isLastStep = stepIndex === totalSteps - 1;

  useEffect(() => {
    if (!tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 20;
    const arrowOffset = 16;

    let top = 0;
    let left = 0;
    let arrow: "top" | "bottom" | "left" | "right" = "left";

    // For center placement (welcome screens)
    if (!targetRect || step.placement === "center") {
      top = window.innerHeight / 2 - tooltipRect.height / 2;
      left = window.innerWidth / 2 - tooltipRect.width / 2;
      setArrowPosition("left"); // No arrow for center
      setTooltipPosition({ top, left });
      return;
    }

    const placement = step.placement || "bottom";

    switch (placement) {
      case "top":
        top = targetRect.top - tooltipRect.height - arrowOffset;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        arrow = "bottom";
        break;
      case "bottom":
        top = targetRect.bottom + arrowOffset;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        arrow = "top";
        break;
      case "left":
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - arrowOffset;
        arrow = "right";
        break;
      case "right":
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + arrowOffset;
        arrow = "left";
        break;
    }

    // Keep tooltip within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < padding) left = padding;
    if (left + tooltipRect.width > viewportWidth - padding) {
      left = viewportWidth - tooltipRect.width - padding;
    }
    if (top < padding) top = padding;
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = viewportHeight - tooltipRect.height - padding;
    }

    setArrowPosition(arrow);
    setTooltipPosition({ top, left });
  }, [targetRect, step.placement]);

  // Arrow styles based on position
  const getArrowStyles = () => {
    const arrowSize = 10;
    const base = "absolute w-0 h-0 border-solid";

    switch (arrowPosition) {
      case "top":
        return {
          className: base,
          style: {
            top: -arrowSize,
            left: "50%",
            transform: "translateX(-50%)",
            borderWidth: `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`,
            borderColor: "transparent transparent white transparent",
          },
        };
      case "bottom":
        return {
          className: base,
          style: {
            bottom: -arrowSize,
            left: "50%",
            transform: "translateX(-50%)",
            borderWidth: `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`,
            borderColor: "white transparent transparent transparent",
          },
        };
      case "left":
        return {
          className: base,
          style: {
            left: -arrowSize,
            top: "50%",
            transform: "translateY(-50%)",
            borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
            borderColor: "transparent white transparent transparent",
          },
        };
      case "right":
        return {
          className: base,
          style: {
            right: -arrowSize,
            top: "50%",
            transform: "translateY(-50%)",
            borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
            borderColor: "transparent transparent transparent white",
          },
        };
    }
  };

  const arrowStyles = getArrowStyles();
  const showArrow = targetRect && step.placement !== "center";

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[10002] animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
      }}
    >
      <div className="relative bg-white rounded-lg shadow-xl border border-gray-200 w-[300px] sm:w-[340px]">
        {/* Arrow */}
        {showArrow && (
          <div className={arrowStyles.className} style={arrowStyles.style as React.CSSProperties} />
        )}

        {/* Content */}
        <div className="p-5 space-y-3">
          <h3 className="font-bold text-base text-gray-900">{step.title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            {step.content}
          </p>
        </div>

        {/* Footer with button */}
        <div className="px-5 pb-5 flex justify-center">
          <Button
            onClick={onNext}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-2 rounded-md font-medium"
          >
            {isLastStep ? "Got it" : "Got it"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SpotlightOverlayProps {
  targetRect: DOMRect | null;
  onClick?: () => void;
}

function SpotlightOverlay({ targetRect, onClick }: SpotlightOverlayProps) {
  const padding = 4;

  if (!targetRect) {
    // Very light overlay for welcome/center messages
    return (
      <div
        className="fixed inset-0 z-[10000] bg-black/20 transition-all duration-300"
        onClick={onClick}
      />
    );
  }

  const spotlightStyle = {
    top: targetRect.top - padding,
    left: targetRect.left - padding,
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
  };

  return (
    <>
      {/* Very subtle gray overlay */}
      <div
        className="fixed inset-0 z-[10000] bg-gray-500/20 transition-all duration-300"
        onClick={onClick}
      />
      {/* Highlight border around target element */}
      <div
        className="fixed z-[10001] rounded-md pointer-events-none border-2 border-gray-400 bg-white/50"
        style={{
          top: spotlightStyle.top,
          left: spotlightStyle.left,
          width: spotlightStyle.width,
          height: spotlightStyle.height,
        }}
      />
    </>
  );
}

export function CompanyTour() {
  const {
    isRunning,
    currentStepIndex,
    currentPageSteps,
    nextStep,
    prevStep,
    skipTour,
  } = useCompanyTour();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = currentPageSteps[currentStepIndex];

  // Find and scroll to target element
  useEffect(() => {
    if (!isRunning || !currentStep) {
      setTargetRect(null);
      return;
    }

    const findElement = () => {
      // Handle "center" placement for welcome steps without target
      if (currentStep.target === "body" || currentStep.placement === "center") {
        setTargetRect(null);
        return;
      }

      const element = document.querySelector(currentStep.target);
      if (element) {
        // Scroll element into view
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });

        // Wait for scroll to complete then update rect
        setTimeout(() => {
          const rect = element.getBoundingClientRect();
          setTargetRect(rect);
        }, 300);
      } else {
        // Element not found, use center placement
        setTargetRect(null);
      }
    };

    // Small delay to allow DOM to settle
    const timer = setTimeout(findElement, 100);

    // Update position on resize/scroll
    const updatePosition = () => {
      if (currentStep.target === "body" || currentStep.placement === "center") {
        return;
      }
      const element = document.querySelector(currentStep.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      }
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isRunning, currentStep, currentStepIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isRunning) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skipTour();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, nextStep, prevStep, skipTour]);

  // Prevent body scroll when tour is active
  useEffect(() => {
    if (isRunning) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isRunning]);

  if (!isRunning || !currentStep) return null;

  return createPortal(
    <>
      <SpotlightOverlay targetRect={targetRect} />
      <TourTooltip
        step={currentStep}
        stepIndex={currentStepIndex}
        totalSteps={currentPageSteps.length}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
        targetRect={targetRect}
      />
    </>,
    document.body
  );
}

// Hook for individual pages to trigger their tour
export function useCompanyPageTour(pageId: string, steps: TourStep[], enabled: boolean = true) {
  const { hasSeenPageTour, startTour, restartTour, isRunning, currentPageTourId } = useCompanyTour();
  const hasSeenRef = useRef(false);

  // Auto-start tour on first visit (only when enabled)
  useEffect(() => {
    if (enabled && !hasSeenRef.current && !hasSeenPageTour(pageId) && steps.length > 0 && !isRunning) {
      hasSeenRef.current = true;
      // Small delay to ensure page is fully rendered
      const timer = setTimeout(() => {
        startTour(pageId, steps);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pageId, steps, hasSeenPageTour, startTour, isRunning, enabled]);

  const restart = useCallback(() => {
    restartTour(pageId, steps);
  }, [pageId, steps, restartTour]);

  return {
    restart,
    isActive: isRunning && currentPageTourId === pageId,
  };
}

