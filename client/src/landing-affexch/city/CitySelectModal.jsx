import { useEffect, useRef, useState } from "react";
import { Search, X, MapPin } from "lucide-react";
import { TOP_CITIES, searchCities } from "../lib/cities";
import { useCity } from "./CityContext";
import "./CitySelectModal.css";

/* Full-screen modal: searchable input + top-10 quick-select tiles.
   Lives outside the page flow (portal-like at root) but doesn't need
   ReactDOM.createPortal since the Landing renders us at <main> root. */
export default function CitySelectModal() {
  const { open, closeModal, selectCity } = useCity();
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // Two-phase open/close so the entrance animation can play
  // (mounted controls DOM presence, `open` controls the animation class).
  useEffect(() => {
    if (open) setMounted(true);
    else {
      const t = setTimeout(() => setMounted(false), 320);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeModal]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Auto-focus the search on desktop only (skip on touch to avoid keyboard pop)
  useEffect(() => {
    if (!open) return;
    const isTouch = window.matchMedia("(pointer: coarse), (hover: none)").matches;
    if (isTouch) return;
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [open]);

  // Reset query when modal reopens
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  if (!mounted) return null;

  const matches = query ? searchCities(query) : [];
  const showSearchResults = query.length > 0;

  return (
    <div className={"city-modal" + (open ? " is-open" : " is-closing")} role="dialog" aria-modal="true" aria-label="Select your city">
      <button
        type="button"
        className="city-modal__backdrop"
        aria-label="Close"
        onClick={closeModal}
      />

      <div ref={panelRef} className="city-modal__panel">
        <button type="button" className="city-modal__close" onClick={closeModal} aria-label="Close">
          <X size={18} strokeWidth={1.6} />
        </button>

        <span className="city-modal__corner tl" />
        <span className="city-modal__corner tr" />
        <span className="city-modal__corner bl" />
        <span className="city-modal__corner br" />

        <header className="city-modal__head">
          <div className="city-modal__eyebrow">
            <span className="sq" /> AFFILIATE APPLICATION &nbsp;//&nbsp; STEP_01
          </div>
          <h2 className="city-modal__title display">SELECT_YOUR_CITY</h2>
          <p className="city-modal__sub">// find the 4 closest peptide offers near you</p>
        </header>

        <div className="city-modal__searchwrap">
          <Search size={16} strokeWidth={1.6} className="city-modal__search-ico" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            autoComplete="off"
            spellCheck="false"
            className="city-modal__input"
            placeholder="search your city or region..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="city-modal__clear" onClick={() => setQuery("")} aria-label="Clear">
              <X size={14} strokeWidth={1.6} />
            </button>
          )}
        </div>

        {showSearchResults && (
          <div className="city-modal__results">
            {matches.length === 0 ? (
              <div className="city-modal__empty">
                // no matches for "{query}"
                <span>try a nearby major city</span>
              </div>
            ) : (
              matches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="city-modal__result"
                  onClick={() => selectCity(c.id)}
                >
                  <MapPin size={14} strokeWidth={1.6} className="city-modal__result-ico" />
                  <span className="city-modal__result-name">{c.name}</span>
                  <span className="city-modal__result-meta">{c.tag} · {c.country}</span>
                </button>
              ))
            )}
          </div>
        )}

        {!showSearchResults && (
          <>
            <div className="city-modal__divider">
              <span className="sq" />
              <span>TOP CITIES</span>
              <span className="sq" />
            </div>

            <div className="city-modal__grid">
              {TOP_CITIES.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  className="city-tile"
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onClick={() => selectCity(c.id)}
                >
                  <span className="city-tile__no">{String(i + 1).padStart(2, "0")}</span>
                  <span className="city-tile__name">{c.name}</span>
                  <span className="city-tile__meta">{c.tag} · {c.country}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <footer className="city-modal__foot">
          <span>// don't see your city? type to search 30+ regions</span>
        </footer>
      </div>
    </div>
  );
}
