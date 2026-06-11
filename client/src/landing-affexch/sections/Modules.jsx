import { useRef, useEffect, useState } from "react";
import { useScramble } from "../lib/hooks";
import "./Modules.css";

function ScrambleLabel({ text }) {
  const [display] = useScramble(text, true);
  return <>{display}</>;
}

const MODULES = [
  { key: "analytics", label: "ANALYTICS", items: ["LIVE TRACKING DASHBOARDS", "COHORT REPORTS", "CSV + API EXPORT"] },
  { key: "tracking", label: "TRACKING", items: ["DEEP LINKS", "CROSS-DEVICE", "SERVER POSTBACKS"] },
  { key: "payouts", label: "PAYOUTS", items: ["WEEKLY · IN USD", "DIRECT DEPOSIT", "LOW MINIMUM"] },
  { key: "ai", label: "AI MATCH", items: ["NEURAL RANKING", "AUTO-CREATIVE", "PREDICTIVE LTV"] },
  { key: "fraud", label: "FRAUD SHIELD", items: ["BOT FILTER", "CLICK-SPAM GUARD", "CHARGEBACK WATCH"] },
  { key: "network", label: "NETWORK", items: ["US & CANADA", "49 STATES + 11 CA", "1.2K PRODUCTS"] },
];
const N = MODULES.length;

export default function Modules() {
  const sectionRef = useRef(null);
  const [stage, setStage] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const p = total > 0 ? scrolled / total : 0;
      setInView(rect.top < vh && rect.bottom > 0);
      setStage(Math.min(N - 1, Math.floor(p * N)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const jumpTo = (i) => {
    const el = sectionRef.current;
    const total = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + total * ((i + 0.45) / N), behavior: "smooth" });
  };

  const cur = MODULES[stage];

  return (
    <section className={"mod section" + (inView ? " is-in" : "")} id="modules" ref={sectionRef}>
      <div className="mod__sticky">
        <div className="mod__head">
          <div className="eyebrow"><span className="sq" /> PLATFORM_MODULES</div>
          <p className="mod__hint">// scroll to cycle the stack</p>
        </div>

        {/* orbital rings */}
        <div className="mod__rings" aria-hidden>
          <span className="mod__ring r1" />
          <span className="mod__ring r2" />
          <span className="mod__ring r3" />
          <span className="mod__ring r4" />
          <span className="mod__ring-dash" />
          <span className="mod__sat s1" />
          <span className="mod__sat s2" />
        </div>

        {/* revolving category pills */}
        <div className="mod__orbit" aria-hidden={false}>
          {MODULES.map((m, i) => {
            const angle = (i / N) * 360;
            return (
              <div
                className="mod__slot"
                key={m.key}
                style={{ transform: `rotate(${angle}deg) translateY(-36vmin) rotate(${-angle}deg)` }}
              >
                <button
                  className={"mod__pill" + (i === stage ? " on" : "")}
                  onClick={() => jumpTo(i)}
                >
                  <span className="mod__pill-dot" />
                  {m.label}
                </button>
              </div>
            );
          })}
        </div>

        {/* central core */}
        <div className="mod__orb" aria-hidden>
          <span className="mod__orb-core" />
          <span className="mod__orb-flare" key={"f" + stage} />
          <span className="mod__orb-ripple" key={"r" + stage} />
          <span className="mod__orb-ripple two" key={"r2" + stage} />
          <span className="mod__orb-node" />
        </div>

        <div className="mod__wire" aria-hidden />
        <span className="mod__wire-pulse" key={"w" + stage} aria-hidden />

        {/* docked selection */}
        <div className="mod__dock">
          <span className="mod__dock-bar" key={stage}>
            <ScrambleLabel text={cur.label} />
          </span>
          <span className="mod__dock-n">{String(stage + 1).padStart(2, "0")} / 0{N}</span>
        </div>

        {/* expanded sub-items */}
        <div className="mod__detail" key={stage}>
          {cur.items.map((it, i) => (
            <div className="mod__detail-row" style={{ "--i": i }} key={it}>
              <span className="mod__detail-spoke" />
              {it}
            </div>
          ))}
        </div>

        <div className="mod__progress">
          <span style={{ width: `${((stage + 1) / N) * 100}%` }} />
        </div>

        <h2 className="display mod__title">MODULES</h2>
      </div>
    </section>
  );
}
