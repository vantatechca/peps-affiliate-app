// AFFEXCH starfield — the same dot pattern as the landing page,
// drifting slowly behind every authenticated route. Pure CSS, no
// canvas, no JS. `pointer-events: none`, fixed full-viewport,
// z-index: 0 so it sits below all page content.
export function AffexchStarfield() {
  return <div className="fx-starfield" aria-hidden />;
}
