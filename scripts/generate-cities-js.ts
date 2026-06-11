// Generate client/src/landing-affexch/lib/cities.js from the live
// vendor_profiles cities, sorted by merchant density. Writes the file
// in-place. Keeps the same shape (id, name, country, tag, neighborhoods)
// + the same offersForCity/searchCities helpers so nothing downstream
// has to change.

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import path from "path";
import { writeFileSync } from "fs";

neonConfig.webSocketConstructor = ws;

// Default neighborhoods for cities that don't have curated ones — used
// by the landing-page offer generator (`offersForCity`) so the demo cards
// still vary nicely. Real merchant rows store their own neighborhood,
// these are only for the synthetic demo.
const DEFAULT_HOODS = ["Downtown", "Riverside", "Heights", "Old Town"];

// Curated neighborhoods for the big cities that already had them — keep
// the landing demo flavorful where we can.
const CURATED: Record<string, string[]> = {
  Toronto: ["Yorkville", "Queen West", "Liberty Village", "The Annex"],
  Vancouver: ["Yaletown", "Kitsilano", "Gastown", "Mount Pleasant"],
  Calgary: ["Kensington", "Inglewood", "Mission", "Beltline"],
  Edmonton: ["Whyte Avenue", "Garneau", "124 Street", "Downtown"],
  Ottawa: ["Glebe", "ByWard Market", "Westboro", "Hintonburg"],
  Montreal: ["Plateau", "Mile End", "Old Port", "Westmount"],
  Mississauga: ["Port Credit", "Streetsville", "Square One", "Erin Mills"],
  Winnipeg: ["Exchange District", "Osborne Village", "Wolseley", "Corydon"],
  "Quebec City": ["Saint-Roch", "Old Quebec", "Sillery", "Montcalm"],
  Halifax: ["South End", "North End", "Spring Garden", "Waterfront"],
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 8) || "city";
}

function tag(name: string): string {
  const clean = name.toUpperCase().replace(/[^A-Z]/g, "");
  return (clean.slice(0, 3) || "CIT");
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows } = await pool.query<{ city: string; country: string; count: number }>(`
    SELECT city, country, COUNT(*)::int AS count
    FROM vendor_profiles
    WHERE city IS NOT NULL AND city <> ''
    GROUP BY city, country
    ORDER BY count DESC, city ASC
  `);

  // Ensure ids are unique — if two cities slugify to the same id, append
  // a suffix.
  const seen = new Set<string>();
  const cities = rows.map((r) => {
    let id = slugify(r.city);
    if (seen.has(id)) id = id + "x";
    while (seen.has(id)) id = id + "x";
    seen.add(id);
    return {
      id,
      name: r.city,
      country: r.country || "CA",
      tag: tag(r.city),
      neighborhoods: CURATED[r.city] || DEFAULT_HOODS,
      _count: r.count,
    };
  });

  await pool.end();

  const arrayLines = cities
    .map((c) => {
      const hoods = c.neighborhoods.map((h) => JSON.stringify(h)).join(", ");
      return `  { id: ${JSON.stringify(c.id)}, name: ${JSON.stringify(c.name)}, country: ${JSON.stringify(c.country)}, tag: ${JSON.stringify(c.tag)}, neighborhoods: [${hoods}] }, // ${c._count}`;
    })
    .join("\n");

  const out = `/* City catalog and per-city offer generator.
   - TOP_CITIES: the 10 quick-select tiles in the modal
   - ALL_CITIES: every city with at least one AFFEXCH merchant (live DB)
   - offersForCity(city): returns 4 deterministic local business offers
     for any city in the catalog. Output shape matches PeptideOffers cards.

   Regenerated from the live vendor_profiles table by
   scripts/generate-cities-js.ts. Ordered by merchant density. */

const PEPTIDES = [
  { name: "BPC-157",    price: "$120", earn: "+$24", badge: "20%" },
  { name: "TB-500",     price: "$140", earn: "+$28", badge: "20%" },
  { name: "CJC-1295",   price: "$95",  earn: "+$19", badge: "20%" },
  { name: "Ipamorelin", price: "$90",  earn: "+$18", badge: "20%" },
  { name: "Sermorelin", price: "$110", earn: "+$22", badge: "20%" },
  { name: "Epithalon",  price: "$130", earn: "+$26", badge: "20%" },
];

/* AFFEXCH merchant cities. \`tag\` is a short 3-letter business prefix. */
export const ALL_CITIES = [
${arrayLines}
];

/* First 10 entries — surfaced as quick-select tiles in the modal. */
export const TOP_CITIES = ALL_CITIES.slice(0, 10);

/* Business-name templates — index 0..3 maps to the 4 cards. */
const BIZ_TEMPLATES = [
  (c, h) => \`\${h} Peptide Lab\`,
  (c, h) => \`\${c.tag} \${h} BioRx\`,
  (c, h) => \`\${h} Compound Pharmacy\`,
  (c, h) => \`\${h} Wellness Group\`,
];

/* Deterministic offer generator — same city always produces the same 4
   offers, so reloading the page keeps the catalog stable. */
export function offersForCity(city) {
  if (!city) return [];
  const seed = city.id.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
  return Array.from({ length: 4 }, (_, i) => {
    const hood = city.neighborhoods[i % city.neighborhoods.length];
    const pep = PEPTIDES[(seed + i * 3) % PEPTIDES.length];
    return {
      id: \`\${city.id}-\${i}\`,
      business: BIZ_TEMPLATES[i](city, hood),
      peptide: pep.name,
      neighborhood: hood,
      city: city.name,
      country: city.country,
      price: pep.price,
      earn: pep.earn,
      badge: pep.badge,
    };
  });
}

/* Filter helper for the search input. */
export function searchCities(query) {
  if (!query) return [];
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.tag.toLowerCase().includes(q) ||
      c.country.toLowerCase() === q
  ).slice(0, 8);
}
`;

  const dest = path.resolve(process.cwd(), "client/src/landing-affexch/lib/cities.js");
  writeFileSync(dest, out, "utf8");
  console.log(`[generate-cities-js] wrote ${dest} (${cities.length} cities)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
