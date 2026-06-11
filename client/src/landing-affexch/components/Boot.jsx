import { useEffect, useState } from "react";
import "./Boot.css";
import logoUrl from "../../assets/logo.png";

const LINES = [
  "AffiliateXchange_OS // v2.0.4 — initializing",
  "> live tracking dashboards ........... OK",
  "> US + CANADA payout grid ............ OK",
  "> neural match model ................. OK",
  "> weekly payout rails [USD] .......... OK",
  "> fraud shield armed ................. OK",
];

export default function Boot() {
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setShown(i);
      if (i >= LINES.length) {
        clearInterval(iv);
        setTimeout(() => setDone(true), 360);
        setTimeout(() => setHide(true), 1180);
      }
    }, 230);
    return () => clearInterval(iv);
  }, []);

  if (hide) return null;
  return (
    <div className={"boot" + (done ? " boot--out" : "")}>
      <div className="boot__inner">
        <div className="boot__brand">
          <img src={logoUrl} alt="AffiliateXchange" className="boot__logo" /> AFFEXCH
        </div>
        <div className="boot__log">
          {LINES.slice(0, shown).map((l, i) => (
            <div key={i} className="boot__line">
              {l}
            </div>
          ))}
          <span className="boot__caret">_</span>
        </div>
        <div className="boot__bar">
          <span style={{ width: `${(shown / LINES.length) * 100}%` }} />
        </div>
        <div className="boot__pct">{Math.round((shown / LINES.length) * 100)}%</div>
      </div>
    </div>
  );
}
