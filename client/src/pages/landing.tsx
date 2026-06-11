import { lazy, Suspense, useEffect } from "react";

/**
 * Landing page = the AffiliateXchange showcase ported under
 * `client/src/landing-affexch/`. The AffexchLanding module is lazy-loaded
 * so GSAP, Three.js, and the cursor-trail effect aren't pulled into the
 * initial JS bundle for users who go straight to /browse or /login.
 *
 * Auth wiring: AffiliateXchange's `useOnboarding`/`useAuth` are stubbed in
 * landing-affexch/{auth,onboarding}/*Context.jsx to navigate to the
 * existing /login and /register routes via wouter.
 */
const AffexchLanding = lazy(async () => {
  // Side-effect import of the landing-scoped stylesheet only when the user
  // actually reaches the landing page.
  await import("../landing-affexch/styles.css");
  return import("../landing-affexch/Landing.jsx");
});

export default function Landing() {
  useEffect(() => {
    document.body.classList.add("affexch-active");
    return () => {
      document.body.classList.remove("affexch-active");
    };
  }, []);

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AffexchLanding />
    </Suspense>
  );
}
