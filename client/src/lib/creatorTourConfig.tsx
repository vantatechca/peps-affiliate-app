import * as React from "react";
import { TourStep } from "../contexts/CreatorTourContext";
import {
  LayoutDashboard,
  PanelLeft,
  Sparkles,
  Send,
  Award,
} from "lucide-react";

// AFFEXCH creator tour — only the dashboard hub gets a tour in the
// revised app. Per-feature pages are self-explanatory and don't need
// dedicated tours.
export const CREATOR_TOUR_IDS = {
  DASHBOARD: "creator-dashboard-tour",
} as const;

export const dashboardTourSteps: TourStep[] = [
  {
    target: "body",
    title: "Welcome to AFFEXCH!",
    content:
      "Quick tour: your dashboard is the hub. Each sidebar tab opens a dedicated tool — promo code, submit a link, sales tracker, milestone, guides.",
    placement: "center",
    icon: <LayoutDashboard className="h-7 w-7 text-primary" />,
  },
  {
    target: "[data-testid='nav-promo-code']",
    title: "Your Promo Code",
    content:
      "Share your unique PEP code with your audience. They redeem it at checkout on peptide merchant sites and you get the commission.",
    placement: "right",
    icon: <Sparkles className="h-7 w-7 text-primary" />,
  },
  {
    target: "[data-testid='nav-submit-a-link']",
    title: "Submit a Link",
    content:
      "Drop in any post URL (Instagram, TikTok, YouTube). Admin reviews it within ~24h. Approved links count toward your tier.",
    placement: "right",
    icon: <Send className="h-7 w-7 text-primary" />,
  },
  {
    target: "[data-testid='nav-milestone-progress']",
    title: "Climb the Tiers",
    content:
      "1 approved link = Verified. 5 = Silver. 10 = Gold. 20 = Elite. Higher tiers unlock perks.",
    placement: "right",
    icon: <Award className="h-7 w-7 text-primary" />,
  },
  {
    target: "[data-testid='sidebar-trigger'], button[aria-label='Toggle navigation menu']",
    title: "Sidebar Tip",
    content:
      "Hit the menu icon anytime to collapse the sidebar for more workspace.",
    placement: "right",
    icon: <PanelLeft className="h-7 w-7 text-primary" />,
  },
];

export function getTourSteps(pageId: string): TourStep[] {
  if (pageId === CREATOR_TOUR_IDS.DASHBOARD) return dashboardTourSteps;
  return [];
}
