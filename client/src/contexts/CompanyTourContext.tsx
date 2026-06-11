import * as React from "react";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

const COMPANY_TOUR_STORAGE_KEY = "affiliatexchange_company_tour_completed";
const COMPANY_TOUR_SEEN_PAGES_KEY = "affiliatexchange_company_tour_seen_pages";

export interface TourStep {
  target: string; // CSS selector for the element to highlight
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  disableBeacon?: boolean;
  spotlightClicks?: boolean;
  icon?: ReactNode; // Icon to display in the tooltip
}

export interface PageTourConfig {
  pageId: string;
  pageName: string;
  steps: TourStep[];
}

interface CompanyTourContextType {
  // Global tour state
  hasCompletedInitialTour: boolean;
  currentPageTourId: string | null;
  isRunning: boolean;
  currentStepIndex: number;
  currentPageSteps: TourStep[];

  // Actions
  startTour: (pageId: string, steps: TourStep[]) => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  restartTour: (pageId: string, steps: TourStep[]) => void;
  hasSeenPageTour: (pageId: string) => boolean;
  markPageTourSeen: (pageId: string) => void;
  resetAllTours: () => void;
}

const CompanyTourContext = createContext<CompanyTourContextType | undefined>(undefined);

export function CompanyTourProvider({ children }: { children: React.ReactNode }) {
  const [hasCompletedInitialTour, setHasCompletedInitialTour] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COMPANY_TOUR_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [seenPages, setSeenPages] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(COMPANY_TOUR_SEEN_PAGES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [currentPageTourId, setCurrentPageTourId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentPageSteps, setCurrentPageSteps] = useState<TourStep[]>([]);

  const hasSeenPageTour = useCallback((pageId: string) => {
    return seenPages.includes(pageId);
  }, [seenPages]);

  const markPageTourSeen = useCallback((pageId: string) => {
    setSeenPages(prev => {
      if (prev.includes(pageId)) return prev;
      const updated = [...prev, pageId];
      try {
        localStorage.setItem(COMPANY_TOUR_SEEN_PAGES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });

    // Mark initial tour as completed after first page tour
    if (!hasCompletedInitialTour) {
      setHasCompletedInitialTour(true);
      try {
        localStorage.setItem(COMPANY_TOUR_STORAGE_KEY, "true");
      } catch {
        // Ignore storage errors
      }
    }
  }, [hasCompletedInitialTour]);

  const startTour = useCallback((pageId: string, steps: TourStep[]) => {
    if (steps.length === 0) return;
    setCurrentPageTourId(pageId);
    setCurrentPageSteps(steps);
    setCurrentStepIndex(0);
    setIsRunning(true);
  }, []);

  const stopTour = useCallback(() => {
    if (currentPageTourId) {
      markPageTourSeen(currentPageTourId);
    }
    setIsRunning(false);
    setCurrentStepIndex(0);
    setCurrentPageTourId(null);
    setCurrentPageSteps([]);
  }, [currentPageTourId, markPageTourSeen]);

  const skipTour = useCallback(() => {
    if (currentPageTourId) {
      markPageTourSeen(currentPageTourId);
    }
    setIsRunning(false);
    setCurrentStepIndex(0);
    setCurrentPageTourId(null);
    setCurrentPageSteps([]);
  }, [currentPageTourId, markPageTourSeen]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < currentPageSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      stopTour();
    }
  }, [currentStepIndex, currentPageSteps.length, stopTour]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const restartTour = useCallback((pageId: string, steps: TourStep[]) => {
    // Remove from seen pages to allow restart
    setSeenPages(prev => {
      const updated = prev.filter(id => id !== pageId);
      try {
        localStorage.setItem(COMPANY_TOUR_SEEN_PAGES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
    startTour(pageId, steps);
  }, [startTour]);

  const resetAllTours = useCallback(() => {
    setSeenPages([]);
    setHasCompletedInitialTour(false);
    setIsRunning(false);
    setCurrentStepIndex(0);
    setCurrentPageTourId(null);
    setCurrentPageSteps([]);
    try {
      localStorage.removeItem(COMPANY_TOUR_STORAGE_KEY);
      localStorage.removeItem(COMPANY_TOUR_SEEN_PAGES_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  return (
    <CompanyTourContext.Provider
      value={{
        hasCompletedInitialTour,
        currentPageTourId,
        isRunning,
        currentStepIndex,
        currentPageSteps,
        startTour,
        stopTour,
        nextStep,
        prevStep,
        skipTour,
        restartTour,
        hasSeenPageTour,
        markPageTourSeen,
        resetAllTours,
      }}
    >
      {children}
    </CompanyTourContext.Provider>
  );
}

export function useCompanyTour() {
  const context = useContext(CompanyTourContext);
  if (context === undefined) {
    // Return a safe default no-op implementation when provider is not present
    // This allows the hook to be used in shared components across different user roles
    return {
      hasCompletedInitialTour: true,
      currentPageTourId: null,
      isRunning: false,
      currentStepIndex: 0,
      currentPageSteps: [],
      startTour: () => {},
      stopTour: () => {},
      nextStep: () => {},
      prevStep: () => {},
      skipTour: () => {},
      restartTour: () => {},
      hasSeenPageTour: () => true,
      markPageTourSeen: () => {},
      resetAllTours: () => {},
    };
  }
  return context;
}
