import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, RefreshCw } from "lucide-react";
import { useReveal, useScramble } from "../lib/hooks";
import { useCity } from "../city/CityContext";
import { offersForCity } from "../lib/cities";
import "./PeptideOffers.css";

/* Default (no-city) catalog — the original 6 generic peptide offers.
   `size` (e.g. "5mg", "10mg") and `price` are filled in manually — leave
   `size` as "" until you have the vial size, and edit `price` per product. */
const GENERIC_PRODUCTS = [
  { name: "BPC-157",    size: "", price: "$120", earn: "+$24", badge: "20%" },
  { name: "TB-500",     size: "", price: "$140", earn: "+$28", badge: "20%" },
  { name: "CJC-1295",   size: "", price: "$95",  earn: "+$19", badge: "20%" },
  { name: "Ipamorelin", size: "", price: "$90",  earn: "+$18", badge: "20%" },
  { name: "Sermorelin", size: "", price: "$110", earn: "+$22", badge: "20%" },
  { name: "Epithalon",  size: "", price: "$130", earn: "+$26", badge: "20%" },
];

/* Deterministic PRNG (mulberry32) — same seed always yields the same sequence. */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Shuffle the full catalog into a fresh arrangement that's stable for the
   whole day, then changes the next day — so the page feels updated daily
   without ever dropping a product. Seed = number of days since the epoch. */
function dailyShuffle(list) {
  const daySeed = Math.floor(Date.now() / 86400000);
  const rand = mulberry32(daySeed);
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* Touch detection so 3D tilt is skipped on mobile. */
function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse), (hover: none)");
    const update = () => setTouch(mql.matches);
    update();
    mql.addEventListener?.("change", update);
    return () => mql.removeEventListener?.("change", update);
  }, []);
  return touch;
}

/* One card — handles both shapes (generic peptide vs city-tagged local business). */
function ProductCard({ p, i, isTouch, isLocal }) {
  const [revealRef, vis] = useReveal();
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (e) => {
    if (isTouch || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: py * -8, y: px * 8 });
  };
  const onLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      ref={revealRef}
      className={"pep-card-wrap" + (vis ? " is-in" : "")}
      style={{ transitionDelay: `${i * 0.07}s`, perspective: "900px" }}
    >
      <div
        ref={cardRef}
        className={"pep-card" + (isLocal ? " is-local" : "")}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <div className="pep-card__head">
          <span className="pep-card__no">NO_{String(i + 1).padStart(3, "0")}</span>
          <span className="pep-card__badge">{p.badge}</span>
        </div>

        <div className="pep-card__body">
          <div className="pep-card__name">
            {isLocal ? p.business : p.name}
            {!isLocal && p.size ? <span className="pep-card__size">{p.size}</span> : null}
          </div>
          {isLocal ? (
            <div className="pep-card__local">
              <span className="pep-card__peptide">{p.peptide}</span>
              <span className="pep-card__hood">// {p.neighborhood}, {p.city}</span>
            </div>
          ) : (
            <div className="pep-card__sub">// commission per sale</div>
          )}
        </div>

        {p.price ? (
          <div className="pep-card__foot">
            <span className="pep-card__price">{p.price}</span>
            <span className="pep-card__earn">{p.earn}</span>
          </div>
        ) : null}

        <span className="pep-card__scan" />

        <span className="pep-corner tl" />
        <span className="pep-corner tr" />
        <span className="pep-corner bl" />
        <span className="pep-corner br" />
      </div>
    </div>
  );
}

export default function PeptideOffers() {
  const { city, openModal, clearCity } = useCity();
  const isTouch = useIsTouch();

  // Section heading scrambles each time the city changes
  const headingText = city
    ? `OFFERS NEAR ${city.name.toUpperCase()}`
    : "TOP PEPTIDE OFFERS TO PROMOTE";

  const [headRef, headVis] = useReveal();
  const [titleDisplay] = useScramble(headingText, headVis);

  // Phase 5: fetch real DB-backed peptide vendors for the selected city.
  // Falls back to the algorithmic `offersForCity()` if the API request fails
  // or returns empty (e.g. boss hasn't seeded that city yet) — keeps the
  // landing page never-empty.
  const { data: apiOffers, isError } = useQuery({
    queryKey: ["/api/affiliate/offers", { city: city?.name, limit: 4 }],
    queryFn: async () => {
      if (!city) return null;
      const r = await fetch(`/api/affiliate/offers?city=${encodeURIComponent(city.name)}&limit=4`);
      if (!r.ok) throw new Error("offers fetch failed");
      return await r.json();
    },
    enabled: !!city,
    staleTime: 60_000,
  });

  // No-city default: the real "Hot Selling Peptides" catalogue — the same
  // admin-curated, daily-shuffled offers shown on the affiliate dashboard.
  // Falls back to the static GENERIC_PRODUCTS list if the request fails so the
  // landing page is never empty.
  const { data: topOffers } = useQuery({
    queryKey: ["/api/affiliate/top-offers", { limit: 6 }],
    queryFn: async () => {
      const r = await fetch("/api/affiliate/top-offers?limit=6");
      if (!r.ok) throw new Error("top offers fetch failed");
      return await r.json();
    },
    enabled: !city,
    staleTime: 60_000,
  });

  // Rotate the cards' reveal animation whenever the city changes so the
  // new offers slide in fresh rather than swapping in place.
  // Re-shuffle the generic catalog once per day so the order feels refreshed.
  // `dayKey` flips at midnight, busting the memo so the new arrangement applies
  // without a reload for anyone who leaves the tab open.
  const dayKey = Math.floor(Date.now() / 86400000);
  const offers = useMemo(() => {
    if (!city) {
      // Live catalogue when available; static list as a never-empty fallback.
      if (topOffers && topOffers.length > 0) return topOffers;
      return dailyShuffle(GENERIC_PRODUCTS);
    }
    if (apiOffers && apiOffers.length > 0) return apiOffers;
    if (isError) return offersForCity(city); // network-error fallback
    if (apiOffers && apiOffers.length === 0) return offersForCity(city); // unseeded-city fallback
    return offersForCity(city); // initial render before fetch completes
  }, [city, apiOffers, topOffers, isError, dayKey]);
  const isLocal = !!city;
  const renderKey = city ? city.id : "generic";

  return (
    <section className="section pep" id="offers">
      <div ref={headRef} className={"pep__head" + (headVis ? " is-in" : "")}>
        <div className="eyebrow pep__eyebrow">
          <span className="sq" /> AFFILIATE CATALOG &nbsp;//&nbsp; NO_004
        </div>
        <h2 className="pep__title display">{titleDisplay}</h2>
        <div className="pep__sub">
          {city
            ? `// 4 closest peptide businesses in ${city.name}`
            : "// Highest converting peptide products"}
        </div>

        {city && (
          <div className="pep__city-row">
            <span className="pep__city-chip">
              <MapPin size={13} strokeWidth={1.7} aria-hidden />
              <span>{city.name}</span>
              <span className="pep__city-meta">{city.tag} · {city.country}</span>
            </span>
            <button type="button" className="pep__city-change" onClick={openModal}>
              <RefreshCw size={12} strokeWidth={1.7} aria-hidden />
              CHANGE_CITY
            </button>
            <button type="button" className="pep__city-clear" onClick={clearCity} aria-label="Reset to catalog">
              ✕
            </button>
          </div>
        )}
      </div>

      <div key={renderKey} className="pep__grid">
        {offers.map((p, i) => (
          <ProductCard
            key={(p.id || p.name) + "-" + renderKey}
            p={p}
            i={i}
            isTouch={isTouch}
            isLocal={isLocal}
          />
        ))}
      </div>

      {!city && (
        <div className="pep__cta-row">
          <button type="button" className="pep__cta" onClick={openModal}>
            <MapPin size={14} strokeWidth={1.7} aria-hidden />
            SELECT_YOUR_CITY
          </button>
          <span className="pep__cta-hint">// see the 4 closest offers near you</span>
        </div>
      )}
    </section>
  );
}
