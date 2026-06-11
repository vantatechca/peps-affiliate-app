// Smooth-scroll to a section by id (JS smooth — CSS scroll-behavior is off to
// avoid fighting GSAP ScrollTrigger).
export function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 8;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
}
