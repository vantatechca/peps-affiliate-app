import { useState } from "react";
import { useReveal } from "../lib/hooks";
import { scrollToId } from "../lib/scroll";
import { useOnboarding } from "../onboarding/OnboardingContext";
import { useAuth } from "../auth/AuthContext";
import "./CTA.css";
import logoUrl from "../../assets/logo.png";

const FOOT_LINKS = [
  { label: "PRODUCTS", to: "neural" },
  { label: "HOW IT WORKS", to: "ecosystem" },
  { label: "NETWORK", to: "network" },
  { label: "COMMUNITY", to: "community" },
  { label: "GET STARTED", onboard: true },
  { label: "LOGIN", login: true },
];

export default function CTA() {
  const [ref, vis] = useReveal(0.3);
  const [email, setEmail] = useState("");
  const { openOnboarding } = useOnboarding();
  const { openLogin } = useAuth();

  return (
    <section className={"cta section" + (vis ? " is-in" : "")} id="start" ref={ref}>
      <div className="cta__inner">
        <div className="eyebrow"><span className="sq" /> DEPLOY_NOW</div>
        <h2 className="display cta__title">START EARNING TODAY</h2>
        <p className="cta__sub">// 2,400+ affiliates already earning across the US &amp; Canada //</p>

        <form className="cta__form" onSubmit={(e) => { e.preventDefault(); openOnboarding(email); }}>
          <input
            className="cta__input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="// enter.email.address"
          />
          <button className="btn-solid cta__btn" type="submit">
            DEPLOY_MY_ACCOUNT
            <span className="shine" />
          </button>
        </form>

        <div className="cta__badges">
          {["✓ FREE FOREVER", "✓ WEEKLY USD PAYOUTS", "✓ LIVE DASHBOARDS"].map((b) => (
            <span key={b}>{b}</span>
          ))}
        </div>
        <button className="cta__login" onClick={openLogin}>Already a member? Log in →</button>
      </div>

      <footer className="foot">
        <div className="foot__brand">
          <img src={logoUrl} alt="AffiliateXchange" className="foot__logo" />
          <span>AFFEXCH</span>
        </div>
        <nav className="foot__nav">
          {FOOT_LINKS.map((l) =>
            l.onboard ? (
              <button key={l.label} onClick={() => openOnboarding("")}>{l.label}</button>
            ) : l.login ? (
              <button key={l.label} onClick={openLogin}>{l.label}</button>
            ) : (
              <button key={l.label} onClick={() => scrollToId(l.to)}>{l.label}</button>
            )
          )}
        </nav>
        <div className="foot__meta">
          affiliatexchange.ca — FREE FOREVER. NO CREDIT CARD REQUIRED.
        </div>
      </footer>
    </section>
  );
}
