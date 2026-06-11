import { useEffect, useState } from "react";
import logoUrl from "../assets/logo.png";

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = "none";
};

// AFFEXCH loading screen — same look as the landing-page boot sequence.
// Use this wherever the app needs a heavy initial load (auth check, first
// dashboard fetch, etc.) so the brand experience stays consistent.
//
// Props:
//   lines    — log lines to print one by one (defaults to the standard AFFEXCH boot)
//   intervalMs — ms between lines
//   onDone   — called after the last line + a short pause (optional)
//   compact  — render inline (not full-screen) for in-page loading slots

const DEFAULT_LINES = [
  "AffiliateXchange_OS // v2.0.4 — initializing",
  "> live tracking dashboards ........... OK",
  "> US + CANADA payout grid ............ OK",
  "> neural match model ................. OK",
  "> weekly payout rails [USD] .......... OK",
  "> fraud shield armed ................. OK",
];

export function AffexchBootLoader({
  lines = DEFAULT_LINES,
  intervalMs = 230,
  onDone,
  compact = false,
}: {
  lines?: string[];
  intervalMs?: number;
  onDone?: () => void;
  compact?: boolean;
}) {
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setShown(i);
      if (i >= lines.length) {
        clearInterval(iv);
        setTimeout(() => setDone(true), 320);
        if (onDone) setTimeout(onDone, 900);
      }
    }, intervalMs);
    return () => clearInterval(iv);
  }, [lines, intervalMs, onDone]);

  const pct = Math.round((shown / lines.length) * 100);

  return (
    <div
      className={`affx-boot ${done ? "affx-boot--out" : ""}`}
      style={compact ? { position: "static", height: "100%" } : undefined}
    >
      <div className="affx-boot__inner">
        <div className="affx-boot__brand">
          <img src={logoUrl} alt="AffiliateXchange" onError={hideOnError} className="affx-boot__logo" />
          AFFEXCH
        </div>
        <div className="affx-boot__log">
          {lines.slice(0, shown).map((l, i) => (
            <div key={i} className="affx-boot__line">
              {l}
            </div>
          ))}
          <span className="affx-boot__caret">_</span>
        </div>
        <div className="affx-boot__bar">
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="affx-boot__pct">{pct}%</div>
      </div>
    </div>
  );
}
