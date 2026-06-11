import { useRef, useState, useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCountUp } from "../lib/hooks";
import "./Numbers.css";

gsap.registerPlugin(ScrollTrigger);

/* ---------------- mini data-viz ---------------- */
const LINE_PTS = "0,92 18,80 36,84 54,64 72,68 90,48 108,52 126,34 144,30 162,16 180,10 200,4";

function SparkLine({ play }) {
  return (
    <svg className="chart" viewBox="0 0 200 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,255,231,0.35)" />
          <stop offset="100%" stopColor="rgba(0,255,231,0)" />
        </linearGradient>
      </defs>
      <polygon className={"spark-fill" + (play ? " on" : "")} points={`0,100 ${LINE_PTS} 200,100`} fill="url(#lineFill)" />
      <polyline className={"spark-line" + (play ? " on" : "")} points={LINE_PTS} pathLength="1" />
      {[[200, 4], [144, 30], [90, 48]].map(([x, y], i) => (
        <rect key={i} x={x - 3} y={y - 3} width="6" height="6" className="spark-dot" style={{ "--d": `${i * 0.15}s` }} />
      ))}
    </svg>
  );
}

const SEG = [
  { k: "SEO", v: 26, c: "var(--neon)" },
  { k: "SOCIAL", v: 22, c: "rgba(0,255,231,0.55)" },
  { k: "PPC", v: 18, c: "var(--hot)" },
  { k: "EMAIL", v: 14, c: "rgba(0,255,231,0.8)" },
  { k: "INFLUENCER", v: 12, c: "rgba(0,255,231,0.35)" },
  { k: "SMS", v: 8, c: "rgba(255,0,102,0.6)" },
];
function Donut({ play }) {
  const r = 38;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg className="chart chart--donut" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} className="donut-track" />
      {SEG.map((s, i) => {
        const len = (s.v / 100) * C;
        const seg = (
          <circle
            key={i}
            cx="60"
            cy="60"
            r={r}
            className={"donut-seg" + (play ? " on" : "")}
            stroke={s.c}
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={play ? -acc : -C}
            style={{ transitionDelay: `${i * 0.09}s` }}
          />
        );
        acc += len;
        return seg;
      })}
      <text x="60" y="56" className="donut-mid">6</text>
      <text x="60" y="72" className="donut-sub">CHANNELS</text>
    </svg>
  );
}

const BARS = [38, 52, 30, 64, 46, 78, 58, 90, 70, 100, 84, 96];
function Skyline({ play }) {
  return (
    <svg className="chart chart--bars" viewBox="0 0 200 100" preserveAspectRatio="none">
      {BARS.map((h, i) => (
        <rect
          key={i}
          x={i * 16.6 + 2}
          y={100 - h}
          width="11"
          height={h}
          className={"bar" + (play ? " on" : "")}
          style={{ transitionDelay: `${i * 0.05}s` }}
        />
      ))}
    </svg>
  );
}

function AgentGrid({ play }) {
  const cells = Array.from({ length: 60 });
  return (
    <div className="agents">
      <div className={"agents__grid" + (play ? " on" : "")}>
        {cells.map((_, i) => (
          <span key={i} style={{ "--d": `${(i % 12) * 0.04 + Math.floor(i / 12) * 0.05}s` }} />
        ))}
      </div>
      <div className="agents__chips">
        {["NO_664", "NO_665", "NO_666"].map((n) => (
          <span key={n} className="chip">{n}</span>
        ))}
      </div>
    </div>
  );
}

const HUBS = [
  [22, 38], [34, 30], [48, 52], [60, 34], [72, 60], [83, 42], [40, 70], [66, 74],
];
function WorldDots({ play }) {
  const dots = Array.from({ length: 90 }, (_, i) => [
    (i * 37) % 100,
    (i * 53) % 100,
  ]);
  return (
    <svg className="chart chart--world" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      {[20, 40, 60, 80].map((y) => (
        <line key={"h" + y} x1="0" y1={y} x2="100" y2={y} className="world-grid" />
      ))}
      {[20, 40, 60, 80].map((x) => (
        <line key={"v" + x} x1={x} y1="0" x2={x} y2="100" className="world-grid" />
      ))}
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.6" className="world-dot" />
      ))}
      {HUBS.map(([x, y], i) => (
        <g key={"hub" + i} className={"world-hub" + (play ? " on" : "")} style={{ "--d": `${i * 0.18}s` }}>
          <circle cx={x} cy={y} r="2.4" className="hub-ring" />
          <circle cx={x} cy={y} r="1.1" className="hub-core" />
        </g>
      ))}
    </svg>
  );
}

/* US states + Canadian provinces coverage grid */
function RegionsChart({ play }) {
  return (
    <div className={"regions" + (play ? " on" : "")}>
      <div className="regions__row">
        <div className="regions__lab">
          <span>UNITED STATES</span>
          <b>49<i>/50</i></b>
        </div>
        <div className="regions__grid us">
          {Array.from({ length: 50 }).map((_, i) => (
            <span key={i} className={i >= 49 ? "off" : ""} style={{ "--d": `${i * 0.012}s` }} />
          ))}
        </div>
      </div>
      <div className="regions__row">
        <div className="regions__lab">
          <span>CANADA · PROV. &amp; TERR.</span>
          <b>11<i>/13</i></b>
        </div>
        <div className="regions__grid ca">
          {Array.from({ length: 13 }).map((_, i) => (
            <span key={i} className={i >= 11 ? "off" : ""} style={{ "--d": `${i * 0.035 + 0.3}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- big counting number ---------------- */
function BigNum({ target, play, format, suffix, pos }) {
  const val = useCountUp(target, play, { format, duration: 1100 });
  return (
    <div className={"num-panel__big num-panel__big--" + pos}>
      {val}
      <span className="plus">{suffix}</span>
    </div>
  );
}

const PANELS = [
  {
    id: "websites",
    label: "PEPTIDE WEBSITES",
    sub: "// active merchant catalog",
    Chart: Skyline,
    target: 500,
    format: (v) => String(Math.round(v)),
    suffix: "+",
    pos: "br",
  },
  {
    id: "offers",
    label: "LOCAL OFFERS",
    sub: "// live in your city right now",
    Chart: AgentGrid,
    target: 600,
    format: (v) => String(Math.round(v)),
    suffix: "+",
    pos: "bl",
  },
  {
    id: "commissions",
    label: "COMMISSIONS PAID",
    sub: "// lifetime, paid in USD",
    Chart: SparkLine,
    target: 2e6,
    format: (v) => "$" + (v / 1e6).toFixed(0) + "M",
    suffix: "+",
    pos: "br",
  },
];

export default function Numbers() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const progRef = useRef(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(min-width: 800px)", () => {
      const track = trackRef.current;
      const distance = () => track.scrollWidth - window.innerWidth;
      const panels = gsap.utils.toArray(".num-panel");

      // coverflow: aggressively scale + fade + tilt each panel by distance from centre,
      // and make the centred panel active (drives count-ups so the last one fires too).
      const applyDepth = () => {
        const cx = window.innerWidth / 2;
        let best = 0;
        let bestD = Infinity;
        panels.forEach((p, i) => {
          const r = p.getBoundingClientRect();
          const center = r.left + r.width / 2;
          const signed = (center - cx) / (window.innerWidth * 0.5);
          const d = Math.min(Math.abs(signed), 1);
          const scale = 1.08 - d * 0.58;
          const op = Math.max(0.1, 1.16 - d * 1.7);
          const rotY = -Math.max(-1, Math.min(1, signed)) * 38;
          p.style.transform = `perspective(1100px) rotateY(${rotY.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
          p.style.opacity = op.toFixed(3);
          p.style.zIndex = String(Math.round(100 - d * 100));
          const ad = Math.abs(center - cx);
          if (ad < bestD) {
            bestD = ad;
            best = i;
          }
        });
        if (best !== activeRef.current) {
          activeRef.current = best;
          setActive(best);
        }
      };

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => "+=" + distance(),
          scrub: 0.5,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: applyDepth,
          onUpdate: (self) => {
            if (progRef.current) progRef.current.style.transform = `scaleX(${self.progress})`;
            applyDepth();
          },
        },
      });

      applyDepth();
    });

    mm.add("(max-width: 799px)", () => {
      activeRef.current = PANELS.length - 1;
      setActive(PANELS.length - 1);
    });

    return () => mm.revert();
  }, []);

  return (
    <section className="numbers section" id="numbers" ref={sectionRef}>
      <div className="numbers__bg" />
      <div className="numbers__head">
        <span className="numbers__tick" />
        <div className="eyebrow">
          <span className="sq" /> NUMBERS_THAT_DEFINE_US
        </div>
      </div>

      <div className="numbers__track" ref={trackRef}>
        <div className="numbers__intro">
          <div className="numbers__intro-no">02</div>
          <h2 className="display numbers__intro-title">
            THE
            <br />
            RECEIPTS.
          </h2>
          <p>
            Every figure below is live platform data. Scroll —&gt; the deck
            advances horizontally.
          </p>
          <span className="numbers__intro-arrow">&mdash;&gt;</span>
        </div>

        {PANELS.map((p, i) => {
          const Chart = p.Chart;
          const play = active >= i;
          return (
            <article className={"num-panel" + (play ? " played" : "") + (i === active ? " is-center" : "")} key={p.id}>
              <span className="num-panel__corner tl" />
              <span className="num-panel__corner tr" />
              <span className="num-panel__corner bl" />
              <span className="num-panel__corner br" />
              <header className="num-panel__head">
                <span className="num-panel__idx">[{String(i + 1).padStart(2, "0")}]</span>
                <span className="num-panel__label">{p.label}</span>
              </header>
              <div className="num-panel__chart">
                <Chart play={play} />
              </div>
              <div className="num-panel__sub">{p.sub}</div>
              <BigNum target={p.target} play={play} format={p.format} suffix={p.suffix} pos={p.pos} />
            </article>
          );
        })}
        <div className="numbers__tail" aria-hidden />
      </div>

      <div className="numbers__progress">
        <span ref={progRef} />
      </div>
    </section>
  );
}
