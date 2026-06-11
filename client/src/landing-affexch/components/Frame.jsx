import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { scrollToId } from "../lib/scroll";
import { useOnboarding } from "../onboarding/OnboardingContext";
import { useAuth } from "../auth/AuthContext";
import logoUrl from "../../assets/logo.png";

const NAV = [
  { label: "HOME", to: "top" },
  { label: "THE RECEIPTS", to: "numbers" },
  { label: "ECOSYSTEM", to: "ecosystem" },
  { label: "MODULES", to: "modules" },
  { label: "THE NETWORK", to: "network" },
  { label: "NEURAL MATCH", to: "neural" },
];

export default function Frame() {
  const [open, setOpen] = useState(false);
  const { openOnboarding } = useOnboarding();
  const { user, openLogin } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (id) => { setOpen(false); setTimeout(() => scrollToId(id), 70); };
  const dash = () => navigate(user.role === "admin" ? "/admin" : "/dashboard");

  return (
    <>
      <div className="frame" aria-hidden>
        <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
        <span className="tick" />
      </div>

      <div className="topbar">
        <button className="brand" onClick={() => go("top")}>
          <img src={logoUrl} alt="AFFEXCH" className="brand__logo" />
          <span>AFFEXCH</span>
        </button>
        <div className="topbar__actions">
          {user ? (
            <button className="topbar__login" onClick={dash}>DASHBOARD →</button>
          ) : (
            <button className="topbar__login" onClick={openLogin}>LOGIN</button>
          )}
          <button className={"menu-btn" + (open ? " open" : "")} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? "CLOSE" : "MENU"}
            <span className="bars"><i /><i /><i /></span>
          </button>
        </div>
      </div>

      <div className={"navmenu" + (open ? " open" : "")}>
        <nav className="navmenu__list">
          {NAV.map((n, i) => (
            <button key={n.to} className="navmenu__item" style={{ "--i": i }} onClick={() => go(n.to)}>
              <span className="navmenu__no">{String(i + 1).padStart(2, "0")}</span>{n.label}
            </button>
          ))}
        </nav>
        <div className="navmenu__foot">
          {user ? (
            <button className="navmenu__cta" onClick={() => { setOpen(false); dash(); }}>GO TO DASHBOARD →</button>
          ) : (
            <>
              <button className="navmenu__cta" onClick={() => { setOpen(false); openOnboarding(""); }}>GET STARTED →</button>
              <button className="navmenu__login" onClick={() => { setOpen(false); openLogin(); }}>LOGIN</button>
            </>
          )}
          <span>affiliatexchange.ca · weekly USD payouts</span>
        </div>
      </div>
    </>
  );
}
