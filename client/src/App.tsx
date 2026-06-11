import { Switch, Route, useLocation, Link } from "wouter";
import { useState } from "react";
import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { AdminTopNav } from "./components/AdminTopNav";
import { MobileNavMenu } from "./components/MobileNavMenu";
import { CreatorCommunityChatFab } from "./components/CreatorCommunityChatFab";
import { CookieConsent } from "./components/CookieConsent";
import { AffexchCursor } from "./components/AffexchCursor";
import { AffexchBootLoader } from "./components/AffexchBootLoader";
import { AffexchStarfield } from "./components/AffexchStarfield";
import { useAuth } from "./hooks/useAuth";
import { NotificationCenter } from "./components/NotificationCenter";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
// Badge no longer needed (was for message-icon unread counter)
import { Button } from "./components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./components/ui/dropdown-menu";
import { Settings as SettingsIcon, ChevronDown, LogOut, User } from "lucide-react";
import logoUrl from "./assets/logo.png";

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = "none";
};
import { proxiedSrc } from "./lib/image";
import NotFound from "./pages/not-found";
import Landing from "./pages/landing";
import CreatorDashboard from "./pages/creator-dashboard";
import CreatorPromoCodePage from "./pages/creator-promo-code";
import CreatorSalesPage from "./pages/creator-sales";
import CreatorMilestonePage from "./pages/creator-milestone";
import CreatorLinksPage from "./pages/creator-links";
import CreatorSubmitLinkPage from "./pages/creator-submit-link";
import CreatorGuidesPage from "./pages/creator-guides";
import CreatorPayoutsPage from "./pages/creator-payouts";
import AdminPayoutsPage from "./pages/admin-payouts";
// Legacy SaaS creator pages removed — AFFEXCH model has no per-offer apply flow:
// Browse, OfferDetail, Applications, ApplicationDetail, Analytics, Messages,
// Favorites, CreatorRetainers, CreatorRetainerDetail (all deleted).
import Settings from "./pages/settings";
import ProfileManagement from "./pages/profile-management";
// Phase 6.5: payment/wallet/invoice/sales UI pages removed alongside backend Stripe + email integrations.
import Notifications from "./pages/notifications";
import NotificationDetail from "./pages/notification-detail";
// Company-role portal pages removed — out of scope for AFFEXCH (handoff §3).
// Admin still views companies as vendor records via AdminCompanies/AdminMerchantDetail.
import AdminDashboard from "./pages/admin-dashboard";
import AdminCompanies from "./pages/admin-companies";
import AdminMerchantDetail from "./pages/admin-merchant-detail";
import AdminOffers from "./pages/admin-offers";
import AdminOfferDetail from "./pages/admin-offer-detail";
import AdminCreators from "./pages/admin-creators";
import AdminCreatorDetail from "./pages/admin-creator-detail";
import AdminAuditLogs from "./pages/admin-audit-logs";
import AdminContentLinks from "./pages/admin-content-links";
import AdminAnalytics from "./pages/admin-analytics";
// Phase 9: onboarding wizards removed (collected payment-method info that no longer exists).
// CompanyProfile is kept — public peptide-vendor profile view (read-only for affiliates).
import CompanyProfile from "./pages/company-profile";
import Login from "./pages/login";
import Register from "./pages/register";
import SelectRole from "./pages/select-role";
import PrivacyPolicy from "./pages/privacy-policy";
import TermsOfService from "./pages/terms-of-service";
import CookiePolicy from "./pages/cookie-policy";
import About from "./pages/about";
import OAuthCallback from "./pages/oauth-callback";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/reset-password";
import HelpAffiliateMarketingTips from "./pages/help-affiliate-marketing-tips";
import HelpAffiliateLinksGuide from "./pages/help-affiliate-links-guide";
import HelpCommissionGuide from "./pages/help-commission-guide";
import HelpSuccessStories from "./pages/help-success-stories";
import { HeaderContentProvider, useHeaderContent } from "./components/HeaderContentContext";

// Public routes that don't require authentication
function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/select-role" component={SelectRole} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      <Route path="/cookie-policy" component={CookiePolicy} />
      <Route path="/about" component={About} />
      <Route path="/oauth-callback" component={OAuthCallback} />
      <Route component={Landing} />
    </Switch>
  );
}

function AuthenticatedLayout({ user, unreadCount, onLogout, children, hideHeader = false }: { user: any; unreadCount: number; onLogout: () => void; children: ReactNode; hideHeader?: boolean }) {
  const style = {
    "--sidebar-width": "14rem",
    "--sidebar-width-icon": "3rem",
  };

  const { headerContent } = useHeaderContent();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        {!isAdmin && <AppSidebar />}
        <div className="flex flex-col flex-1 overflow-hidden">

          {!hideHeader && (
            <div className="sticky top-0 z-50 bg-background border-b">
              <div className="max-w-screen-2xl mx-auto px-3 sm:px-4">
                <div className="flex items-center gap-3 py-1.5 sm:py-2">
                  <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                    {/* Mobile hamburger — opens MobileNavMenu (a standalone component, not the shadcn Sidebar drawer) */}
                    <button
                      type="button"
                      onClick={() => setMobileNavOpen(true)}
                      aria-label="Open menu"
                      className="md:hidden h-11 w-11 flex items-center justify-center rounded-md border border-border text-foreground hover:bg-primary/10 active:bg-primary/15 transition-colors"
                    >
                      <Menu className="h-5 w-5" />
                    </button>
                    {/* AFFEXCH brand chip — mobile only for creators (their sidebar shows it on desktop);
                        admins see no sidebar so we render the brand chip on every breakpoint. */}
                    <Link href="/" className={`${isAdmin ? "flex" : "md:hidden flex"} items-center gap-1.5 min-w-0 shrink-0`}>
                      <img src={logoUrl} alt="AffiliateXchange" onError={hideOnError} className="h-6 w-6 rounded-md object-cover shrink-0 fx-logo-glow" />
                      <span className="font-bold text-sm tracking-wider text-primary truncate fx-glitch">AFFEXCH</span>
                    </Link>
                  </div>

                  {/* Center: admin top nav */}
                  {isAdmin && (
                    <div className="hidden md:flex shrink-0 justify-center">
                      <AdminTopNav />
                    </div>
                  )}

                  {/* Right Side Navigation Icons */}
                  <div className={`flex items-center gap-1.5 sm:gap-2 ${isAdmin ? "flex-1 justify-end" : ""}`}>
                    {/* Messages icon removed — /messages page deleted in AFFEXCH revision. */}

                    {/* Notification Center with Dropdown */}
                    <NotificationCenter />

                    {/* Profile Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 sm:gap-1.5 md:gap-2 hover:opacity-80 transition-opacity focus:outline-none">
                          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border-2 border-primary/20 flex-shrink-0">
                            <AvatarImage
                              src={proxiedSrc(user?.profileImageUrl) || ''}
                              alt={user?.firstName || user?.email || 'User'}
                              referrerPolicy="no-referrer"
                            />
                            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-[10px] sm:text-xs">
                              {(user?.firstName || user?.email || 'User').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left max-w-[100px] sm:max-w-[120px] md:max-w-[160px] min-w-0 hidden sm:block">
                            <p className="text-[11px] sm:text-xs font-medium leading-none text-foreground truncate">
                              {user?.firstName || user?.email || 'User'}
                            </p>
                            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{user?.role === 'admin' ? 'Admin' : 'Creator'}</p>
                          </div>
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem className="flex items-center gap-2 font-medium">
                          <Avatar className="h-8 w-8 border border-primary/20">
                            <AvatarImage
                              src={proxiedSrc(user?.profileImageUrl) || ''}
                              alt={user?.firstName || user?.email || 'User'}
                              referrerPolicy="no-referrer"
                            />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {(user?.firstName || user?.email || 'User').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-semibold text-foreground truncate">
                              {user?.firstName || user?.email || 'User'}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">{user?.email || 'No email'}</span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/profile-management" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Profile Management
                          </Link>
                        </DropdownMenuItem>
                        {user?.role !== 'admin' && (
                          <DropdownMenuItem asChild>
                            <Link href="/settings" className="flex items-center gap-2">
                              <SettingsIcon className="h-4 w-4" />
                              Settings
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive hover:!text-destructive" onClick={onLogout}>
                          <LogOut className="h-4 w-4" />
                          Log out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {headerContent && (
                <div className="border-t bg-background">
                  <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 py-1.5 sm:py-2">
                    {headerContent}
                  </div>
                </div>
              )}
            </div>
          )}

          <main className="flex-1 overflow-y-auto">
            <div className="container max-w-screen-2xl mx-auto p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
      {/* Mobile menu overlay (replaces the shadcn Sidebar's mobile Sheet) */}
      <MobileNavMenu open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      {/* Community chat launcher — creator role only, anchored bottom-left */}
      {user?.role === 'creator' && <CreatorCommunityChatFab />}
    </SidebarProvider>
  );
}

// Protected routes that require authentication
function ProtectedRouter() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();

  // Handle OAuth callback page separately (no sidebar/layout needed)
  if (location.startsWith('/oauth-callback')) {
    return <OAuthCallback />;
  }

  // Conversations / unread-count queries removed — /messages page is gone in the
  // AFFEXCH revision. AuthenticatedLayout still accepts the prop for now but it's 0.
  const unreadCount = 0;

  // /payments/* and /retainers/* were removed in the AFFEXCH revision —
  // nothing currently needs the header hidden, but keep the prop wired so
  // future per-page chrome controls have an obvious knob.
  const hideHeader = false;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  // Redirect to login if not authenticated
  if (!isLoading && !isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  // Show loading state
  if (isLoading) {
    return <AffexchBootLoader />;
  }

  // Wrap company users with tour provider
  const content = (
    <HeaderContentProvider>
      <AuthenticatedLayout user={user} unreadCount={unreadCount} onLogout={handleLogout} hideHeader={hideHeader}>
        <Switch>
          {/* Creator (affiliate) routes — AFFEXCH-only flow. The dashboard at /
              renders all 6 sections (promo code, sales, milestone, links, submit
              link, guides). Help pages are static content. */}
          {user?.role === 'creator' && (
            <>
              <Route path="/" component={CreatorDashboard} />
              <Route path="/creator/dashboard" component={CreatorDashboard} />
              <Route path="/creator/promo-code" component={CreatorPromoCodePage} />
              <Route path="/creator/sales" component={CreatorSalesPage} />
              <Route path="/creator/milestone" component={CreatorMilestonePage} />
              <Route path="/creator/links" component={CreatorLinksPage} />
              <Route path="/creator/submit-link" component={CreatorSubmitLinkPage} />
              <Route path="/creator/payouts" component={CreatorPayoutsPage} />
              <Route path="/creator/guides" component={CreatorGuidesPage} />
              <Route path="/help/affiliate-marketing-tips" component={HelpAffiliateMarketingTips} />
              <Route path="/help/affiliate-links-guide" component={HelpAffiliateLinksGuide} />
              <Route path="/help/commission-guide" component={HelpCommissionGuide} />
              <Route path="/help/success-stories" component={HelpSuccessStories} />
              {/* Legacy URL redirects — these pages were removed in the AFFEXCH
                  revision; send users back to the dashboard if they hit them */}
              <Route path="/browse">{() => { window.location.replace("/"); return null; }}</Route>
              <Route path="/offers">{() => { window.location.replace("/"); return null; }}</Route>
              <Route path="/applications">{() => { window.location.replace("/creator/links"); return null; }}</Route>
              <Route path="/analytics">{() => { window.location.replace("/creator/sales"); return null; }}</Route>
              <Route path="/favorites">{() => { window.location.replace("/"); return null; }}</Route>
              <Route path="/messages">{() => { window.location.replace("/"); return null; }}</Route>
            </>
          )}

          {/* Company role routes removed — out of scope (handoff §3). Dormant
              company users won't see anything if they log in; they'd land on the
              404 catchall, which is the desired behavior for the deprecated role. */}

          {/* Admin Routes */}
          {user?.role === 'admin' && (
            <>
              <Route path="/" component={AdminDashboard} />
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/dashboard" component={AdminDashboard} />
              <Route path="/admin/merchants" component={AdminCompanies} />
              <Route path="/admin/merchants/:id" component={AdminMerchantDetail} />
              {/* Legacy URLs from the pre-merchant rename — redirect so any
                  bookmark or in-app link still works. */}
              <Route path="/admin/companies">{() => { window.location.replace("/admin/merchants"); return null; }}</Route>
              <Route path="/admin/companies/:id">
                {(params) => { window.location.replace(`/admin/merchants/${params.id}`); return null; }}
              </Route>
              <Route path="/admin/offers" component={AdminOffers} />
              <Route path="/admin/offers/:id" component={AdminOfferDetail} />
              <Route path="/admin-offer-detail/:id" component={AdminOfferDetail} />
              <Route path="/admin/creators" component={AdminCreators} />
              <Route path="/admin/creators/:id" component={AdminCreatorDetail} />
              <Route path="/admin/content-links" component={AdminContentLinks} />
              <Route path="/admin/audit-logs" component={AdminAuditLogs} />
              <Route path="/admin/payouts" component={AdminPayoutsPage} />
              <Route path="/admin/analytics" component={AdminAnalytics} />
              <Route path="/admin/users" component={AdminDashboard} />
            </>
          )}

          {/* Shared Routes */}
          <Route path="/profile-management" component={ProfileManagement} />
          {user?.role !== 'admin' && (
            <Route path="/settings" component={Settings} />
          )}
          <Route path="/notifications" component={Notifications} />
          <Route path="/notifications/:id" component={NotificationDetail} />
          <Route path="/company-profile/:id" component={CompanyProfile} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/terms-of-service" component={TermsOfService} />
          <Route path="/about" component={About} />

          {/* Fallback */}
          <Route component={NotFound} />
        </Switch>
      </AuthenticatedLayout>
    </HeaderContentProvider>
  );

  return content;
}

function Router() {
  const [location] = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Define public routes
  const publicRoutes = ['/login', '/register', '/select-role', '/forgot-password', '/reset-password', '/privacy-policy', '/terms-of-service', '/cookie-policy', '/about'];
  const isPublicRoute = publicRoutes.includes(location);

  // While loading, show a loading state
  if (isLoading) {
    return <AffexchBootLoader />;
  }

  // \u2705 FIX: Check authentication first before routing
  // If authenticated, always show protected router (even for "/" route)
  if (isAuthenticated) {
    return <ProtectedRouter />;
  }

  // If not authenticated and on public route, show public router
  if (isPublicRoute) {
    return <PublicRouter />;
  }

  // If not authenticated and on "/" show landing
  if (location === '/') {
    return <PublicRouter />;
  }

  // Otherwise redirect to login
  window.location.href = "/login";
  return null;
}

function GlobalBackdrop() {
  const [location] = useLocation();
  // The AffiliateXchange landing renders its own atmosphere layers (fx-grain, fx-scanlines,
  // fx-vignette) plus a custom Cursor and Frame. Skip the global backdrop on "/"
  // so we don't double up.
  if (location === "/") return null;
  return <AffexchStarfield />;
}

function GlobalCursor() {
  const [location] = useLocation();
  // Landing mounts its own Cursor — skip there to avoid double-rendering.
  if (location === "/") return null;
  return <AffexchCursor />;
}


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GlobalBackdrop />
        <GlobalCursor />
        <Toaster />
        <Router />
        <CookieConsent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
