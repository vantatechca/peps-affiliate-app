import { Suspense } from "react";
import SceneCanvas from "../components/SceneCanvas";
import CommissionCore from "../three/CommissionCore";
import Tag from "../components/Tag";
import { useTypewriter } from "../lib/hooks";
import { useCity } from "../city/CityContext";
import "./Hero.css";

/* Small inline cursor that blinks at the active typewriter line. */
function Caret({ show }) {
  return show ? <span className="hero__caret">_</span> : null;
}

export default function Hero() {
  const { openApplication } = useCity();

  // Three-line headline typewriter — staggered so they finish before the
  // command-line subtext starts at 2600ms.
  const [line1, line1Done] = useTypewriter("PROMOTE LOCAL", 55, 400);
  const [line2, line2Done] = useTypewriter("PEPTIDE", 55, 1000);
  const [line3, line3Done] = useTypewriter("BUSINESSES", 55, 1600);

  const [cmd] = useTypewriter(
    "// APPLY_NOW // GET_YOUR_CODE // START_EARNING",
    24,
    2600
  );

  return (
    <section className="hero" id="top">
      <div className="hero__glow" />

      <h1 className="hero__word display">
        <span className="hero__line">
          {line1}
          <Caret show={!line1Done} />
        </span>
        <span className="hero__line">
          {line2}
          <Caret show={line1Done && !line2Done} />
        </span>
        <span className="hero__line">
          {line3}
          <Caret show={line2Done && !line3Done} />
        </span>
      </h1>

      <SceneCanvas
        className="hero__canvas"
        flat
        dpr={[1, 2]}
        camera={{ position: [0, 0, 8.4], fov: 40 }}
        gl={{ alpha: true, antialias: true }}
      >
        <Suspense fallback={null}>
          <CommissionCore />
        </Suspense>
      </SceneCanvas>

      <div className="hero__eyebrow eyebrow">
        <span className="sq" /> ALL-IN-ONE AFFILIATE PLATFORM &nbsp;//&nbsp; v2.0
      </div>

      <div className="hero__tag hero__tag--tr">
        <Tag no={1} align="right">
          THE EASIEST ALL-IN-ONE AFFILIATE PLATFORM ON THE MARKET.
        </Tag>
      </div>
      <div className="hero__tag hero__tag--ml">
        <Tag no={2}>LIVE TRACKING DASHBOARDS — EVERY CLICK, SALE AND CENT, IN REAL TIME.</Tag>
      </div>
      <div className="hero__tag hero__tag--br">
        <Tag no={3} align="right">
          WEEKLY PAYOUTS IN USD ACROSS THE US &amp; CANADA — LOW MINIMUM.
        </Tag>
      </div>

      <div className="hero__bottom">
        <div className="hero__cmd">
          {cmd}
          <span className="caret">_</span>
        </div>
        <button type="button" className="btn-solid hero__cta" onClick={openApplication}>
          APPLY_NOW
          <span className="shine" />
        </button>
      </div>

      <a href="#numbers" className="hero__scroll" aria-label="Scroll down">
        SCROLL
        <span>↓</span>
      </a>
    </section>
  );
}
