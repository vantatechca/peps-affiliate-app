import { useState, useEffect, useRef, useCallback } from "react";

/* IntersectionObserver reveal — returns [ref, visible] */
export function useReveal(threshold = 0.18, once = true) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          if (once) obs.disconnect();
        } else if (!once) setVis(false);
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once]);
  return [ref, vis];
}

/* Typewriter — returns [text, done] */
export function useTypewriter(text, speed = 50, startDelay = 0) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let i = 0;
    let iv;
    const t = setTimeout(() => {
      iv = setInterval(() => {
        i++;
        setOut(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(iv);
          setDone(true);
        }
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
    };
  }, [text, speed, startDelay]);
  return [out, done];
}

/* Count-up — returns formatted string */
export function useCountUp(target, trigger, { duration = 1600, format } = {}) {
  const [val, setVal] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!trigger) return;
    let start = null;
    const tick = (ts) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [trigger, target, duration]);
  const fmt =
    format ||
    ((v) =>
      v >= 1e6
        ? "$" + (v / 1e6).toFixed(1) + "M"
        : v >= 1e3
        ? (v / 1e3).toFixed(1) + "K"
        : Math.floor(v).toString());
  return fmt(val);
}

/* Pointer position normalized to [-1,1], smoothed — for parallax */
export function usePointer() {
  const pos = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => {
      pos.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pos.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return pos;
}

/* Scramble text — reveals from glyph noise. Returns [display, trigger fn] */
const GLYPHS = "アイウエオ!<>-_\\/[]{}=+*^?#0123456789ABCDEF";
export function useScramble(text, auto = false) {
  const [display, setDisplay] = useState(auto ? text : text);
  const run = useCallback(() => {
    let frame = 0;
    const total = 16;
    const iv = setInterval(() => {
      frame++;
      const revealed = Math.floor((frame / total) * text.length);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        if (i < revealed || text[i] === " ") s += text[i];
        else s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setDisplay(s);
      if (frame >= total) {
        clearInterval(iv);
        setDisplay(text);
      }
    }, 28);
  }, [text]);
  useEffect(() => {
    if (auto) run();
  }, [auto, run]);
  return [display, run];
}
