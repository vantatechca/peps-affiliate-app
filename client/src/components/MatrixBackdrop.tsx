import { useEffect, useRef, useState } from "react";

/**
 * Global atmospheric layer for the matrix aesthetic:
 *   - Canvas-driven matrix rain
 *   - CRT scanlines
 *   - Radial vignette
 *   - Slow pulsing page glow
 *
 * Fixed-position, pointer-events:none, low z-index — never blocks UI.
 * Auto-disables on (prefers-reduced-motion: reduce).
 */
export function MatrixBackdrop({ density = 0.55, opacity = 0.16 }: { density?: number; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mql.matches);
    update();
    mql.addEventListener?.("change", update);
    return () => mql.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    // Disable matrix rain on small phones — the 50ms canvas redraw was burning
    // ~50ms per frame and flooding console with [Violation] setInterval warnings
    // on iPhone-class devices. Static gradients remain for atmosphere.
    if (window.innerWidth < 600) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const isSmall = window.innerWidth < 600;
    const cellW = isSmall ? 18 : 14;
    let cols = Math.floor(canvas.offsetWidth / cellW);
    let drops = Array(cols).fill(0).map(() => Math.random() * -100);
    const chars = "アイウエオカキクケコサ0123456789ABCDEF<>{}[]/\\=+*";

    const draw = () => {
      ctx.fillStyle = "rgba(2,11,20,0.09)";
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      ctx.font = `${cellW - 1}px ${"monospace"}`;
      cols = Math.floor(canvas.offsetWidth / cellW);
      for (let i = 0; i < cols; i++) {
        if (drops[i] === undefined) drops[i] = Math.random() * -100;
        // Skip some columns based on density
        if (Math.random() > density) continue;
        const c = chars[Math.floor(Math.random() * chars.length)];
        const y = drops[i] * cellW;
        ctx.fillStyle = "rgba(180,255,245,0.85)";
        ctx.fillText(c, i * cellW, y);
        ctx.fillStyle = "rgba(0,255,231,0.3)";
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * cellW, y - cellW);
        if (y > canvas.offsetHeight && Math.random() > 0.97) drops[i] = 0;
        drops[i] += 0.7;
      }
    };

    const interval = isSmall ? 70 : 50;
    const id = setInterval(draw, interval);
    return () => {
      clearInterval(id);
      window.removeEventListener("resize", resize);
    };
  }, [density, reducedMotion]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          opacity,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.13) 2px,rgba(0,0,0,0.13) 4px)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center,transparent 50%,rgba(2,11,20,0.55) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "30%",
          left: "50%",
          width: 600,
          height: 600,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(0,255,231,0.06),transparent 70%)",
          zIndex: 0,
          pointerEvents: "none",
          animation: "mx-pageGlow 5s ease-in-out infinite",
        }}
      />
    </>
  );
}

export default MatrixBackdrop;
