// Clean up vendor_profiles.city values left over from the New Stores address
// parser. Some rows captured "City Province Postal", "Unit X City Province
// Postal", or French variants; this script merges all of those onto a single
// canonical English city name.

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

// City names with diacritics or French versions → preferred English form.
const ALIASES: Record<string, string> = {
  "Montréal": "Montreal",
  "Québec": "Quebec City",
  "Trois-Rivières": "Trois-Rivieres",
  "St. John's": "St. Johns",
  "St. Catharines": "St. Catharines",
};

// Province / territory names + 2-letter codes used to trim suffixes.
const PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
  "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
  "Northwest Territories", "Nunavut", "Yukon",
  "AB", "BC", "MB", "NB", "NL", "NS", "ON", "PE", "QC", "SK", "NT", "NU", "YT",
];

// Cities the parser KNOWS — used to detect a real city embedded in a noisy
// string like "Unit 6 Mississauga Ontario L5M 0Z9".
const KNOWN_CITIES = [
  "Toronto", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Montreal",
  "Mississauga", "Winnipeg", "Burnaby", "Surrey", "Victoria", "Halifax",
  "Etobicoke", "Richmond", "Kitchener", "Laval", "Regina", "Saskatoon",
  "Barrie", "New Westminster", "North York", "Fredericton", "Guelph",
  "Hamilton", "Prince George", "Kelowna", "London", "Moncton",
  "North Vancouver", "Oakville", "Peterborough", "Saint John",
  "Waterloo", "Yellowknife", "Brampton", "Brandon", "Brossard", "Burlington",
  "Charlottetown", "Coquitlam", "Gatineau", "Kingston", "Markham", "Nanaimo",
  "North Bay", "Richmond Hill", "Sherbrooke", "Thornhill", "Thunder Bay",
  "Vaughan", "Westmount", "Ajax", "Amherst", "Bowmanville", "Concord",
  "Dartmouth", "Delta", "Drummondville", "Fort McMurray", "Grande Prairie",
  "Greater Sudbury", "Kamloops", "Mount Pearl", "Nepean", "Newmarket",
  "Niagara Falls", "Oshawa", "Port Moody", "Saint Laurent", "Scarborough",
  "Southampton", "Stony Plain", "Sudbury", "Summerside", "West Vancouver",
  "White Rock", "Whitehorse", "Windsor", "Woodbridge", "York", "Airdrie",
  "Quebec City", "St. Catharines", "St. Johns", "Trois-Rivieres",
  // common multi-word strings sometimes parsed differently
  "Mont Laurier", "St Thomas",
];

function normalize(input: string | null): string | null {
  if (!input) return null;
  let s = input.trim();
  if (!s) return null;

  // Strip a leading "Unit 6", "Suite 200", etc.
  s = s.replace(/^(?:unit|suite|ste\.?|#)\s*[\w-]+\s+/i, "");

  // Strip postal code at the end (Canadian: A1A 1A1 or A1A1A1).
  s = s.replace(/\s+[A-Z]\d[A-Z]\s?\d[A-Z]\d\s*$/i, "");

  // Strip trailing province name or 2-letter province code.
  for (const p of PROVINCES) {
    const re = new RegExp(`[, ]+${p}\\s*$`, "i");
    s = s.replace(re, "");
  }
  s = s.trim();

  // Apply explicit aliases.
  if (ALIASES[s]) return ALIASES[s];

  // If the cleaned string still looks like an address (has digits at start),
  // try to find a known city name embedded in it.
  if (/^\d/.test(s) || s.split(" ").length > 4) {
    for (const known of KNOWN_CITIES) {
      const re = new RegExp(`\\b${known.replace(/\./g, "\\.")}\\b`, "i");
      if (re.test(s)) return known;
    }
    return null; // give up — couldn't extract a city
  }

  return s;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows } = await pool.query<{ id: string; city: string | null }>(
    "SELECT id, city FROM vendor_profiles",
  );

  let changed = 0;
  let nulled = 0;
  for (const r of rows) {
    const next = normalize(r.city);
    if (next === r.city) continue;
    if (next === null) nulled++;
    await pool.query("UPDATE vendor_profiles SET city = $1 WHERE id = $2", [next, r.id]);
    changed++;
  }

  console.log(`[normalize-cities] updated rows: ${changed}, set to NULL: ${nulled}`);

  const { rows: after } = await pool.query<{ city: string; count: number }>(`
    SELECT city, COUNT(*)::int AS count
    FROM vendor_profiles
    WHERE city IS NOT NULL AND city <> ''
    GROUP BY city
    ORDER BY count DESC
  `);
  console.log(`[normalize-cities] distinct cities after: ${after.length}`);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
