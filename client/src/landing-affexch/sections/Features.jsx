import { FlaskConical, Ticket, Activity, Wallet, BadgeCheck, DollarSign } from "lucide-react";
import { useReveal, useScramble } from "../lib/hooks";
import "./Features.css";

const FEATURES = [
  {
    Icon: FlaskConical,
    title: "TOP PEPTIDE OFFERS",
    desc: "Promote a curated catalogue of the hottest-selling peptides, refreshed daily.",
  },
  {
    Icon: Ticket,
    title: "UNIQUE PROMO CODES",
    desc: "Your own promo code — every sale traces straight back to you.",
  },
  {
    Icon: Activity,
    title: "REAL-TIME TRACKING",
    desc: "Every sale and commission tracked live on your dashboard.",
  },
  {
    Icon: DollarSign,
    title: "CLEAR COMMISSIONS",
    desc: "See the exact commission and dollar payout you earn on every offer.",
  },
  {
    Icon: Wallet,
    title: "WEEKLY PAYOUTS",
    desc: "Your earnings paid out to your account every week.",
  },
  {
    Icon: BadgeCheck,
    title: "VERIFIED TIERS",
    desc: "Climb from Verified to Elite as you drive more sales.",
  },
];

function FeatureCard({ feat, i }) {
  const [ref, vis] = useReveal();
  const { Icon } = feat;
  return (
    <div
      ref={ref}
      className={"feat-wrap" + (vis ? " is-in" : "")}
      style={{ transitionDelay: `${(i % 3) * 0.1 + Math.floor(i / 3) * 0.18}s` }}
    >
      <article className="feat-item" style={{ animationDelay: `${i * 0.35}s` }}>
        <div className="feat-item__ico" style={{ animationDelay: `${i * 0.5}s` }}>
          <Icon size={20} strokeWidth={1.6} aria-hidden />
        </div>
        <div className="feat-item__body">
          <div className="feat-item__title">{feat.title}</div>
          <div className="feat-item__desc">{feat.desc}</div>
        </div>

        {/* data-line streak — runs along the bottom edge */}
        <span className="feat-item__data" />

        {/* 4 blinking corner brackets */}
        <span className="feat-corner tl" />
        <span className="feat-corner tr" />
        <span className="feat-corner bl" />
        <span className="feat-corner br" />
      </article>
    </div>
  );
}

export default function Features() {
  const [headRef, headVis] = useReveal();
  const [titleDisplay] = useScramble("PLATFORM FEATURES", headVis);

  return (
    <section className="section feats" id="features">
      <div ref={headRef} className={"feats__head" + (headVis ? " is-in" : "")}>
        <div className="eyebrow feats__eyebrow">
          <span className="sq" /> BUILT FOR AFFILIATES &nbsp;//&nbsp; NO_006
        </div>
        <h2 className="feats__title display">{titleDisplay}</h2>
        <div className="feats__sub">// Everything you need to promote peptides and get paid</div>
      </div>

      <div className="feats__grid">
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} feat={f} i={i} />
        ))}
      </div>
    </section>
  );
}
