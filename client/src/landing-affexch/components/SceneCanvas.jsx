import { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";

/* A Canvas that only runs its render loop while on-screen — keeps three
   simultaneous WebGL scenes from all burning GPU at once. */
export default function SceneCanvas({ children, className, gl, ...props }) {
  const wrapRef = useRef(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { rootMargin: "140px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={className}>
      <Canvas
        frameloop={inView ? "always" : "never"}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, ...gl }}
        {...props}
      >
        {children}
      </Canvas>
    </div>
  );
}
