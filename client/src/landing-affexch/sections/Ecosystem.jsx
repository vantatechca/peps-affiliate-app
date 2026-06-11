import { Suspense, useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import SceneCanvas from "../components/SceneCanvas";
import Planet from "../three/Planet";
import { NEON, HOT } from "../theme";
import "./Ecosystem.css";

const POINTS = [
  {
    n: "01",
    label: "LIVE TRACKING DASHBOARDS",
    marker: { left: "33%", top: "61%" },
    bullets: ["Every click, sale & cent — live", "Cross-device attribution built in", "EPC, CR & ROI updated in real time"],
  },
  {
    n: "02",
    label: "SMART LINK TRACKING",
    marker: { left: "43%", top: "54%" },
    bullets: ["One link works on every platform", "Server-side postbacks", "Deep links that survive app installs"],
  },
  {
    n: "03",
    label: "AI PRODUCT MATCH",
    marker: { left: "52%", top: "51%" },
    bullets: ["Neural ranking tuned to your audience", "Top-converting offers auto-surfaced", "Predictive lifetime-value scoring"],
  },
  {
    n: "04",
    label: "FRAUD SHIELD",
    marker: { left: "61%", top: "54%" },
    bullets: ["Bot & click-spam filtering", "Chargeback monitoring", "Clean traffic, protected commissions"],
  },
  {
    n: "05",
    label: "WEEKLY PAYOUTS",
    marker: { left: "69%", top: "61%" },
    bullets: ["Paid every week, in USD", "Low minimum threshold", "Across the US & Canada"],
  },
];

function Scene({ progressRef }) {
  const grp = useRef();
  useFrame((state) => {
    const p = progressRef.current;
    if (grp.current) {
      grp.current.position.y = -3.7 + p * 1.2;
      grp.current.rotation.y += 0.0015;
      grp.current.rotation.x = 0.05 + state.pointer.y * 0.03;
    }
  });
  return (
    <group ref={grp}>
      <ambientLight intensity={0.3} />
      <pointLight position={[4, 6, 5]} intensity={90} color={NEON} />
      <pointLight position={[-5, 1, 3]} intensity={38} color="#ffffff" />
      <pointLight position={[-4, -3, 2]} intensity={28} color={HOT} />
      <Planet radius={3.0} spin={0.045} rimIntensity={1.65} />
    </group>
  );
}

export default function Ecosystem() {
  const sectionRef = useRef(null);
  const progressRef = useRef(0);
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
      progressRef.current = p;
      setInView(rect.top < vh && rect.bottom > 0);
      setStage(Math.min(POINTS.length - 1, Math.floor(p * POINTS.length)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const cur = POINTS[stage];

  return (
    <section className={"eco section" + (inView ? " in" : "")} id="ecosystem" ref={sectionRef}>
      <div className="eco__sticky">
        <SceneCanvas className="eco__canvas" flat dpr={[1, 2]} camera={{ position: [0, 0, 7], fov: 45 }}>
          <Suspense fallback={null}>
            <Stars radius={60} depth={40} count={1500} factor={3} saturation={0} fade speed={0.5} />
            <Scene progressRef={progressRef} />
          </Suspense>
        </SceneCanvas>

        <div className="eco__rings" aria-hidden>
          <span /><span /><span /><span />
        </div>

        <div className="eco__header">
          <div className="eyebrow"><span className="sq" /> THE_ECOSYSTEM</div>
          <h2 className="display eco__title">ECOSYSTEM</h2>
          <p className="eco__lead">// the full affiliate stack — from click to cleared payout</p>
        </div>

        {/* stepper / table of contents */}
        <ul className="eco__steps">
          {POINTS.map((pt, i) => (
            <li key={pt.n} className={"eco__step" + (i === stage ? " on" : "") + (i < stage ? " done" : "")}>
              <span className="eco__step-n">{pt.n}</span>
              <span className="eco__step-label">{pt.label}</span>
            </li>
          ))}
        </ul>

        {/* active explainer (remounts per stage → re-animates) */}
        <div className="eco__panel" key={stage}>
          <div className="eco__panel-n">{cur.n} <i>/ 05</i></div>
          <h3 className="eco__panel-title display">{cur.label}</h3>
          <ul className="eco__bullets">
            {cur.bullets.map((b, i) => (
              <li key={b} style={{ "--i": i }}>
                <span className="eco__spoke" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* markers riding the planet surface */}
        <div className="eco__markers" aria-hidden>
          {POINTS.map((pt, i) => (
            <span key={pt.n} className={"eco__marker" + (i === stage ? " on" : "")} style={pt.marker} />
          ))}
        </div>

        {/* vertical progress */}
        <div className="eco__progress" aria-hidden>
          <span style={{ height: `${((stage + 1) / POINTS.length) * 100}%` }} />
        </div>
      </div>
    </section>
  );
}
