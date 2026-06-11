import { useState, useEffect, useRef } from "react";
import NorthAmericaMap, { HUBS } from "../components/NorthAmericaMap";
import { PEPTIDES } from "../lib/peptides";
import Tag from "../components/Tag";
import "./Network.css";

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const amount = () => 150 + Math.floor(Math.random() * 2050); // $150 – $2,200 per payout

function makeEvent(id) {
  const h = HUBS[Math.floor(Math.random() * HUBS.length)];
  const amt = amount();
  return { id, hub: HUBS.indexOf(h), loc: h.name, ca: !!h.ca, amt, product: pick(PEPTIDES) };
}

// Month-to-date payouts, derived from the real calendar so every visitor sees the
// same logical figure: $0 on the 1st → ~$170,000 by month-end, then resets.
const MONTHLY_TARGET = 170000;
function monthlyPaid(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  const frac = Math.min(1, Math.max(0, (d.getTime() - start) / (end - start)));
  // gentle deterministic wobble so it doesn't look like a perfect clock
  const wobble = 1 + 0.012 * Math.sin(d.getTime() / 7.2e6);
  return Math.round(MONTHLY_TARGET * frac * wobble);
}

export default function Network() {
  const idRef = useRef(100);
  const [feed, setFeed] = useState(() => Array.from({ length: 6 }, () => makeEvent(idRef.current++)));
  const [paid, setPaid] = useState(() => monthlyPaid());
  const [fire, setFire] = useState({ index: 0, key: 0 });

  // live payout feed (visual sample — not summed into the total)
  useEffect(() => {
    const iv = setInterval(() => {
      const e = makeEvent(idRef.current++);
      setFeed((f) => [e, ...f].slice(0, 7));
      setFire({ index: e.hub, key: idRef.current });
    }, 1600);
    return () => clearInterval(iv);
  }, []);

  // month-to-date total: brief count-up on load, then track the live clock value
  useEffect(() => {
    let raf;
    let startT;
    const target = monthlyPaid();
    const from = Math.round(target * 0.991);
    const dur = 1500;
    const step = (t) => {
      if (startT === undefined) startT = t;
      const p = Math.min((t - startT) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setPaid(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const iv = setInterval(() => setPaid(monthlyPaid()), 2000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(iv);
    };
  }, []);

  return (
    <section className="net section" id="network">
      <div className="net__map">
        <NorthAmericaMap fireIndex={fire.index} fireKey={fire.key} />
      </div>

      <div className="net__head">
        <div className="eyebrow"><span className="sq" /> THE_NETWORK</div>
      </div>

      <div className="net__tag">
        <Tag no={1}>EVERY PAYOUT CLEARS WEEKLY IN USD — TO AFFILIATES ACROSS THE US &amp; CANADA.</Tag>
      </div>

      {/* live payout feed (USD) */}
      <div className="net__feed">
        <div className="net__feed-head">
          <span className="net__live"><i />LIVE PAYOUTS</span>
          <span className="net__flag">US · CA</span>
        </div>
        <div className="net__paid">
          <span className="net__paid-val">${paid.toLocaleString()}</span>
          <span className="net__paid-sub">// paid this month · resets monthly</span>
        </div>
        <ul className="net__feed-list">
          {feed.map((e) => (
            <li className="net__feed-row" key={e.id}>
              <span className="net__amt">${e.amt.toLocaleString()}</span>
              <span className="net__city">
                {e.loc}
                <em className={e.ca ? "ca" : "us"}>{e.ca ? "CA" : "US"}</em>
              </span>
              <span className="net__prod">{e.product}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="net__title-wrap">
        <h2 className="display net__title">THE NETWORK</h2>
        <div className="net__big">
          US <span className="plus">+</span> CANADA <em>· weekly USD payouts</em>
        </div>
      </div>
    </section>
  );
}
