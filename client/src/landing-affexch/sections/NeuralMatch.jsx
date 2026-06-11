import { useMemo, useRef, useEffect } from "react";
import { useReveal, useCountUp } from "../lib/hooks";
import { NEURAL_MATCHES } from "../lib/peptides";
import Tag from "../components/Tag";
import "./NeuralMatch.css";

const INPUTS = ["NICHE", "AUDIENCE", "GEO", "PAST CVR", "SEASON"];
const PRODUCTS = NEURAL_MATCHES;

const VB_W = 1000;
const VB_H = 600;

function spread(n, top, bottom) {
  const arr = [];
  const step = (bottom - top) / (n - 1);
  for (let i = 0; i < n; i++) arr.push(top + step * i);
  return arr;
}

function ProductRow({ p, x, y, play, top }) {
  const val = useCountUp(p.match, play, { duration: 1500, format: (v) => Math.round(v) + "%" });
  const barW = 150;
  return (
    <g className={"nn-prod" + (top ? " nn-prod--top" : "")}>
      <circle cx={x} cy={y} r={top ? 8 : 6} className="nn-node nn-node--out" />
      <text x={x + 20} y={y - 9} className="nn-prod-name">{p.name}</text>
      <rect x={x + 20} y={y - 1} width={barW} height="7" rx="2" className="nn-bar-bg" />
      <rect
        x={x + 20}
        y={y - 1}
        width={play ? (barW * p.match) / 100 : 0}
        height="7"
        rx="2"
        className="nn-bar-fill"
      />
      <text x={x + 20 + barW + 12} y={y + 6} className="nn-prod-pct">{val}</text>
    </g>
  );
}

export default function NeuralMatch() {
  const [ref, vis] = useReveal(0.25);
  const pulseRefs = useRef([]);
  const pulseData = useRef([]);

  const { layers, edges } = useMemo(() => {
    const L = [
      spread(5, 130, 470).map((y) => ({ x: 150, y })),
      spread(6, 90, 510).map((y) => ({ x: 370, y })),
      spread(6, 90, 510).map((y) => ({ x: 560, y })),
      [170, 280, 390, 480].map((y) => ({ x: 760, y })),
    ];
    const e = [];
    for (let l = 0; l < L.length - 1; l++) {
      L[l].forEach((a) => {
        L[l + 1].forEach((b) => {
          e.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, layer: l });
        });
      });
    }
    return { layers: L, edges: e };
  }, []);

  // signal pulses travelling along edges
  useEffect(() => {
    const N = 18;
    pulseData.current = Array.from({ length: N }, (_, i) => ({
      edge: Math.floor(Math.random() * edges.length),
      t: Math.random(),
      speed: 0.004 + Math.random() * 0.01,
      hot: i % 6 === 0,
    }));
    let raf;
    const loop = () => {
      for (let i = 0; i < pulseData.current.length; i++) {
        const p = pulseData.current[i];
        p.t += p.speed;
        if (p.t >= 1) {
          p.t = 0;
          p.edge = Math.floor(Math.random() * edges.length);
        }
        const e = edges[p.edge];
        const el = pulseRefs.current[i];
        if (e && el) {
          el.setAttribute("cx", e.x1 + (e.x2 - e.x1) * p.t);
          el.setAttribute("cy", e.y1 + (e.y2 - e.y1) * p.t);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [edges]);

  return (
    <section className={"nn section" + (vis ? " is-in" : "")} id="neural" ref={ref}>
      <div className="nn__head">
        <div className="eyebrow"><span className="sq" /> NEURAL_MATCH</div>
        <h2 className="display nn__title">AI THAT FINDS YOUR<br /><span>HIGHEST-CONVERTING</span> OFFERS</h2>
      </div>

      <div className="nn__tag">
        <Tag no={1} align="right">
          THE MODEL SCORES EVERY PRODUCT AGAINST YOUR AUDIENCE IN REAL TIME — AND ROUTES YOU THE WINNERS.
        </Tag>
      </div>

      <div className="nn__graph">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet">
          {/* column labels */}
          <text x="150" y="44" className="nn-col">INPUT SIGNALS</text>
          <text x="465" y="44" className="nn-col">NEURAL LAYERS</text>
          <text x="850" y="44" className="nn-col">PRODUCT MATCHES</text>

          {/* edges */}
          {edges.map((e, i) => (
            <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} className={"nn-edge l" + e.layer} />
          ))}

          {/* input labels + nodes */}
          {layers[0].map((n, i) => (
            <g key={"in" + i}>
              <text x={n.x - 22} y={n.y + 4} className="nn-in-label">{INPUTS[i]}</text>
              <circle cx={n.x} cy={n.y} r="6" className="nn-node nn-node--in" style={{ "--d": `${i * 0.2}s` }} />
            </g>
          ))}

          {/* hidden nodes */}
          {layers.slice(1, 3).map((layer, li) =>
            layer.map((n, i) => (
              <circle key={"h" + li + i} cx={n.x} cy={n.y} r="7" className="nn-node nn-node--hid" style={{ "--d": `${(i + li * 3) * 0.16}s` }} />
            ))
          )}

          {/* travelling pulses */}
          {Array.from({ length: 18 }).map((_, i) => (
            <circle key={"p" + i} ref={(el) => (pulseRefs.current[i] = el)} r={i % 6 === 0 ? 3.4 : 2.4} className={"nn-pulse" + (i % 6 === 0 ? " hot" : "")} />
          ))}

          {/* product matches */}
          {PRODUCTS.map((p, i) => (
            <ProductRow key={p.name} p={p} x={760} y={layers[3][i].y} play={vis} top={i === 0} />
          ))}
        </svg>
      </div>
    </section>
  );
}
