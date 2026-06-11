/* Stub for the AffiliateXchange OnboardingContext.
   The AffiliateXchange demo opened a modal flow; in this app we navigate to the
   existing /register route with an optional ?email=... pre-fill. Same
   public API so the ported sections (Hero, CTA) compile unchanged. */
import { useLocation } from "wouter";

export function useOnboarding() {
  const [, setLocation] = useLocation();
  return {
    openOnboarding: (email) => {
      const target = email
        ? `/register?email=${encodeURIComponent(email)}`
        : "/register";
      setLocation(target);
    },
  };
}
