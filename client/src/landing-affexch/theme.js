// Single source of truth for the cyan "Matrix" palette.
// CSS variables live in styles.css; these JS constants are for Three.js / canvas.
export const NEON = "#00ffe7";
export const NEON_DEEP = "#004d42";
export const HOT = "#ff0066"; // secondary alert/accent
export const BG = "#020b14";
export const BG_2 = "#04121d";
export const PANEL = "#071520";
export const WHITE = "#eaf6f5";

// rgba helpers
export const neon = (a = 1) => `rgba(0,255,231,${a})`;
export const hot = (a = 1) => `rgba(255,0,102,${a})`;
export const white = (a = 1) => `rgba(234,246,245,${a})`;
