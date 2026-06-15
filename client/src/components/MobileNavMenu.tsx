import { Fragment, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "wouter";
import {
  Home,
  TrendingUp,
  BarChart3,
  Building2,
  Users,
  ScrollText,
  CheckCircle,
  Sparkles,
  Award,
  Link as LinkIcon,
  Send,
  BookOpen,
  Wallet,
  X,
} from "lucide-react";
import logoUrl from "../assets/logo.png";

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = "none";
};
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";

// AFFEXCH Phase 9 mobile menu — standalone component, doesn't depend on shadcn
// Sidebar primitives. Renders as a full-screen overlay below the topbar when
// open. Tap a menu item or the X to close.

type Item = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  url?: string;
  onClick?: () => void;
  /** Render a separator line above this item in the mobile menu. */
  separatorBefore?: boolean;
};

// AFFEXCH creator nav — feature tabs that mirror the dashboard sections.
// Notifications / Profile / Settings live in the topbar avatar dropdown.
const CREATOR_ITEMS: Item[] = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Promo Code", url: "/creator/promo-code", icon: Sparkles },
  { title: "Sales Tracker", url: "/creator/sales", icon: TrendingUp },
  { title: "Milestone Progress", url: "/creator/milestone", icon: Award },
  { title: "My Links", url: "/creator/links", icon: LinkIcon },
  { title: "Submit a Link", url: "/creator/submit-link", icon: Send },
  { title: "Payouts", url: "/creator/payouts", icon: Wallet },
  // Community Chat — reached via bottom-right FAB on the authenticated shell.
  { title: "Guides", url: "/creator/guides", icon: BookOpen, separatorBefore: true },
];

// Note: company role is out of scope for AFFEXCH (see docs/AFFEXCH_SESSION_HANDOFF.md §3).
// Only admin and creator (affiliate) roles get a mobile menu.

const ADMIN_ITEMS: Item[] = [
  { title: "Dashboard", url: "/admin", icon: Home },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Merchants", url: "/admin/merchants", icon: Building2 },
  { title: "Creators", url: "/admin/creators", icon: Users },
  { title: "Link Approval", url: "/admin/content-links", icon: CheckCircle },
  { title: "Payouts", url: "/admin/payouts", icon: Wallet },
  { title: "Audit Trail", url: "/admin/audit-logs", icon: ScrollText },
];

interface MobileNavMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNavMenu({ open, onClose }: MobileNavMenuProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Close on route change
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  if (typeof document === "undefined") return null;

  const u = user as { role?: string } | null;
  const items = u?.role === "admin" ? ADMIN_ITEMS : CREATOR_ITEMS;
  const portalLabel = u?.role === "admin" ? "Admin Panel" : "Creator Portal";

  return (
    <>
    {createPortal(
    <div
      // Use `inert` instead of aria-hidden so the close-button focus on dismiss
      // doesn't trigger the "Blocked aria-hidden on element with focus" warning.
      // @ts-ignore — `inert` is valid HTML, React supports it via prop drilling
      inert={open ? undefined : ""}
      className={cn(
        "mobile-nav-overlay fixed inset-0 z-[200] flex flex-col",
        "bg-[rgba(2,11,20,0.98)] backdrop-blur-md",
        // Fade-in + subtle scale animation on the container
        "transition-[opacity,transform] duration-300 ease-out origin-top",
        open
          ? "opacity-100 scale-100 pointer-events-auto"
          : "opacity-0 scale-[0.98] pointer-events-none"
      )}
    >
      {/* Top bar inside the menu — brand + close */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b border-[rgba(0,255,231,0.15)] shrink-0",
          "transition-all duration-400 ease-out",
          open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}
      >
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="AFFEXCH" onError={hideOnError} className="h-7 w-7 rounded-md object-cover fx-logo-glow" />
          <span className="font-bold text-base tracking-wider text-primary fx-glitch">AFFEXCH</span>
        </div>
        <button
          onClick={() => {
            (document.activeElement as HTMLElement | null)?.blur();
            onClose();
          }}
          aria-label="Close menu"
          className="h-11 w-11 flex items-center justify-center rounded-md border border-[rgba(0,255,231,0.25)] text-primary hover:bg-[rgba(0,255,231,0.08)] active:bg-[rgba(0,255,231,0.15)] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Portal label */}
      <div
        className={cn(
          "px-4 pt-4 pb-2 transition-all duration-400 ease-out",
          open ? "opacity-100 translate-x-0 delay-[80ms]" : "opacity-0 -translate-x-2"
        )}
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          // {portalLabel}
        </span>
      </div>

      {/* Menu items — staggered slide-in from below */}
      <nav className="flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
        <ul className="space-y-1">
          {items.map((item, i) => {
            const Icon = item.icon;
            const isActive = item.url
              ? location === item.url || (item.url !== "/" && location.startsWith(item.url))
              : false;
            const className = cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-12 w-full text-left",
              "border border-transparent",
              isActive
                ? "bg-primary/15 border-[rgba(0,255,231,0.3)] text-primary"
                : "text-foreground hover:bg-[rgba(0,255,231,0.05)] hover:border-[rgba(0,255,231,0.15)] active:bg-[rgba(0,255,231,0.1)]"
            );
            const inner = (
              <>
                <span className="text-[10px] font-mono text-muted-foreground w-6 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium tracking-wide">{item.title}</span>
              </>
            );
            return (
              <Fragment key={item.url ?? item.title}>
                {item.separatorBefore && (
                  <li
                    aria-hidden
                    className={cn(
                      "h-px my-2 bg-[rgba(0,255,231,0.18)] transition-opacity duration-400",
                      open ? "opacity-100" : "opacity-0"
                    )}
                    style={{ transitionDelay: open ? `${120 + i * 50}ms` : "0ms" }}
                  />
                )}
                <li
                  className={cn(
                    "transition-all duration-400 ease-out",
                    open ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"
                  )}
                  style={{
                    // Stagger each item ~50ms after the previous, kicking in after
                    // the container fade so the items appear to cascade in.
                    transitionDelay: open ? `${120 + i * 50}ms` : "0ms",
                  }}
                >
                  {item.onClick ? (
                    <button type="button" onClick={item.onClick} className={className}>
                      {inner}
                    </button>
                  ) : (
                    <Link href={item.url!}>
                      <a onClick={onClose} className={className}>
                        {inner}
                      </a>
                    </Link>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div
        className={cn(
          "px-4 py-4 border-t border-[rgba(0,255,231,0.15)] shrink-0",
          "transition-all duration-400 ease-out",
          open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        )}
        style={{ transitionDelay: open ? `${120 + items.length * 50 + 40}ms` : "0ms" }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-primary">AFFEXCH</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Professional affiliate marketing platform.<br />
          © {new Date().getFullYear()} AffiliateXchange. All rights reserved.
        </p>
      </div>
    </div>,
    document.body
    )}
    </>
  );
}
