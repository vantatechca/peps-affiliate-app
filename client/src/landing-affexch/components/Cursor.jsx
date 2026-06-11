import { useEffect } from "react";

/* Trailing neon cursor — a chain of dots that lag behind the pointer. */
export default function Cursor() {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const N = 13;
    const dots = [];
    for (let i = 0; i < N; i++) {
      const d = document.createElement("div");
      const size = 9 - i * 0.45;
      d.className = "cursor-dot";
      d.style.width = `${size}px`;
      d.style.height = `${size}px`;
      d.style.background =
        i === 0 ? "#eafffd" : `rgba(0,255,231,${0.5 - i * 0.03})`;
      document.body.appendChild(d);
      dots.push({ el: d, x: innerWidth / 2, y: innerHeight / 2 });
    }
    let mx = innerWidth / 2,
      my = innerHeight / 2,
      raf;
    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
    };
    window.addEventListener("mousemove", onMove);
    const loop = () => {
      let px = mx,
        py = my;
      dots.forEach((d) => {
        d.x += (px - d.x) * 0.38;
        d.y += (py - d.y) * 0.38;
        d.el.style.transform = `translate(${d.x}px,${d.y}px) translate(-50%,-50%)`;
        px = d.x;
        py = d.y;
      });
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
      dots.forEach((d) => d.el.remove());
    };
  }, []);
  return null;
}
