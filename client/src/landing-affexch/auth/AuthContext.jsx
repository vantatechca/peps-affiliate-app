/* Stub for the AffiliateXchange AuthContext.
   The AffiliateXchange demo used a modal-based login; this app uses the existing
   /login route. We expose the same surface (`user`, `openLogin`) so the
   ported components compile unchanged. `user` is always null on the public
   landing — App.tsx redirects authenticated users away before they reach it. */
import { useLocation } from "wouter";

export function useAuth() {
  const [, setLocation] = useLocation();
  return {
    user: null,
    openLogin: () => setLocation("/login"),
  };
}
