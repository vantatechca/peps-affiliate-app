import * as React from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useCreatorTour } from "../contexts/CreatorTourContext";
import { useLocation } from "wouter";
import { getTourSteps, CREATOR_TOUR_IDS } from "../lib/creatorTourConfig";

// Map routes to tour IDs. Only the dashboard tour survived the AFFEXCH
// revision — the rest of the routes (browse / applications / analytics /
// retainers / favorites / payment-settings) were removed.
const routeToTourId: Record<string, string> = {
  "/": CREATOR_TOUR_IDS.DASHBOARD,
  "/creator/dashboard": CREATOR_TOUR_IDS.DASHBOARD,
};

function getTourIdFromPath(path: string): string | null {
  if (routeToTourId[path]) return routeToTourId[path];
  if (path === "/") return CREATOR_TOUR_IDS.DASHBOARD;
  return null;
}

export function CreatorTourButton() {
  const { restartTour, isRunning } = useCreatorTour();
  const [location] = useLocation();

  const handleRestartTour = () => {
    const tourId = getTourIdFromPath(location);
    if (tourId) {
      const steps = getTourSteps(tourId);
      if (steps.length > 0) {
        restartTour(tourId, steps);
      }
    }
  };

  const tourId = getTourIdFromPath(location);
  const hasTour = tourId && getTourSteps(tourId).length > 0;

  if (!hasTour) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRestartTour}
      disabled={isRunning}
      className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
    >
      <HelpCircle className="h-4 w-4" />
      <span>Restart Page Tour</span>
    </Button>
  );
}

// Wrapper component that safely handles the case when CreatorTourProvider is not available
export function CreatorTourButtonSafe() {
  try {
    return <CreatorTourButton />;
  } catch {
    // Context not available (not a creator user)
    return null;
  }
}
