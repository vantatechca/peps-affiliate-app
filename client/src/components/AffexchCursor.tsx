import { useEffect } from "react";

// Trailing neon cursor — a chain of dots that lag behind the pointer.
// Lifted from client/src/landing-affexch/components/Cursor.jsx so the same
// look applies app-wide (the landing keeps its own copy too).
// Disabled on touch/coarse-pointer devices automatically.

export function AffexchCursor() {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const N = 13;
    type Dot = { el: HTMLDivElement; x: number; y: number };
    const dots: Dot[] = [];
    for (let i = 0; i < N; i++) {
      const d = document.createElement("div");
      const size = 9 - i * 0.45;
      d.className = "cursor-dot";
      d.style.width = `${size}px`;
      d.style.height = `${size}px`;
      d.style.background =
        i === 0 ? "#eafffd" : `rgba(0,255,231,${0.5 - i * 0.03})`;
      document.body.appendChild(d);
      dots.push({ el: d, x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    window.addEventListener("mousemove", onMove);
    const loop = () => {
      let px = mx;
      let py = my;
      for (const d of dots) {
        d.x += (px - d.x) * 0.38;
        d.y += (py - d.y) * 0.38;
        d.el.style.transform = `translate(${d.x}px,${d.y}px) translate(-50%,-50%)`;
        px = d.x;
        py = d.y;
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      for (const d of dots) d.el.remove();
    };
  }, []);
  return null;
}
